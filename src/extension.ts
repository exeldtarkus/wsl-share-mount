import * as vscode from 'vscode';
import { readFileSync } from 'fs';
import {
  Cancelled,
  Share,
  credentialsContent,
  isMounted,
  isNonEmptyDir,
  isValidShare,
  mountArgs,
  mountSource,
  sudo,
  withCredentialsFile,
} from './mount';

let statusBar: vscode.StatusBarItem;
let log: vscode.LogOutputChannel;

export function activate(context: vscode.ExtensionContext): void {
  log = vscode.window.createOutputChannel('WSL Share Mount', { log: true });
  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 90);
  statusBar.command = 'wslShareMount.menu';
  context.subscriptions.push(log, statusBar);

  if (!isWsl()) {
    // Extension host di Windows/Linux biasa tidak bisa mount drvfs; buka folder lewat "WSL: Connect to WSL".
    log.info('Not running inside WSL; extension idle.');
    return;
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('wslShareMount.menu', () => guarded(menu)),
    vscode.commands.registerCommand('wslShareMount.mount', () => guarded(pickAndMount)),
    vscode.commands.registerCommand('wslShareMount.unmount', () => guarded(pickAndUnmount)),
    vscode.commands.registerCommand('wslShareMount.status', () => guarded(showStatus)),
    vscode.commands.registerCommand('wslShareMount.openSettings', openSettings),
    vscode.workspace.onDidChangeConfiguration((e) => e.affectsConfiguration('wslShareMount') && refresh()),
    // share bisa di-mount/unmount dari terminal; cek ulang saat window kembali fokus.
    vscode.window.onDidChangeWindowState((s) => s.focused && refresh()),
  );
  refresh();
}

export function deactivate(): void {}

function isWsl(): boolean {
  try {
    return /microsoft/i.test(readFileSync('/proc/version', 'utf8'));
  } catch (e) {
    log.error('isWsl - cannot read /proc/version', e);
    return false;
  }
}

function shares(): Share[] {
  const all = vscode.workspace.getConfiguration('wslShareMount').get<Partial<Share>[]>('shares', []);
  const seen = new Set<string>();
  // mountPoint yang sama dua kali akan saling menimpa; hanya entry pertama yang dipakai.
  const valid = all.filter(isValidShare).filter((s) => !seen.has(s.mountPoint) && !!seen.add(s.mountPoint));
  if (valid.length !== all.length) {
    log.warn(
      `Ignored ${all.length - valid.length} share(s): need name, \\\\server\\path share, absolute and unique mountPoint.`,
    );
  }
  return valid;
}

async function withState(): Promise<{ share: Share; mounted: boolean }[]> {
  return Promise.all(shares().map(async (share) => ({ share, mounted: await isMounted(share.mountPoint) })));
}

async function refresh(): Promise<void> {
  try {
    const list = await withState();
    const up = list.filter((s) => s.mounted).length;
    statusBar.text = `$(${up ? 'server-environment' : 'server'}) ${up}/${list.length}`;
    statusBar.tooltip = list.length
      ? list.map((s) => `${s.mounted ? '●' : '○'} ${s.share.name}: ${s.share.share} → ${s.share.mountPoint}`).join('\n')
      : 'No shares configured. Click to add one in settings.';
    statusBar.show();
  } catch (e) {
    log.error('refresh - failed to read mount state', e);
  }
}

async function guarded(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    if (e instanceof Cancelled) {
      return;
    }
    log.error('command failed', e);
    vscode.window.showErrorMessage(`WSL Share Mount: ${(e as Error).message}`);
  } finally {
    refresh();
  }
}

async function menu(): Promise<void> {
  const list = await withState();
  if (!list.length) {
    return openSettings();
  }
  const picked = await vscode.window.showQuickPick(
    list.map((s) => ({
      label: `${s.mounted ? '$(debug-disconnect) Unmount' : '$(plug) Mount'} ${s.share.name}`,
      description: s.share.mountPoint,
      detail: s.share.share,
      ...s,
    })),
    { placeHolder: 'Select share(s) to mount / unmount', canPickMany: true },
  );
  await runAll(picked ?? [], (s, ask) => (s.mounted ? unmount(s.share, ask) : mount(s.share, ask)));
}

async function showStatus(): Promise<void> {
  const list = await withState();
  if (!list.length) {
    return openSettings();
  }
  const items = await Promise.all(
    list.map(async (s) => ({
      label: `${s.mounted ? '$(pass-filled) MOUNTED' : '$(circle-large-outline) NOT MOUNTED'}  ${s.share.mountPoint}`,
      description: s.share.name,
      // sumber aktual dari findmnt, bisa beda dari setting bila path di-mount manual dari terminal.
      detail: s.mounted ? `from ${await mountSource(s.share.mountPoint)}` : s.share.share,
    })),
  );
  await vscode.window.showQuickPick(items, { placeHolder: 'Share mount status' });
}

async function pick(mounted: boolean): Promise<Share[]> {
  const list = (await withState()).filter((s) => s.mounted === mounted).map((s) => s.share);
  if (!list.length) {
    vscode.window.showInformationMessage(mounted ? 'No share is mounted.' : 'No share left to mount (or none configured).');
    return [];
  }
  if (list.length === 1) {
    return list;
  }
  const picked = await vscode.window.showQuickPick(
    list.map((share) => ({ label: share.name, description: share.mountPoint, detail: share.share, share })),
    { placeHolder: mounted ? 'Select share(s) to unmount' : 'Select share(s) to mount', canPickMany: true },
  );
  return (picked ?? []).map((p) => p.share);
}

async function pickAndMount(): Promise<void> {
  await runAll(await pick(false), mount);
}

async function pickAndUnmount(): Promise<void> {
  await runAll(await pick(true), unmount);
}

/** Input yang di-cache per batch (key), jadi tiap password cukup ditanya sekali. */
type Ask = (key: string, prompt: string, password?: boolean) => Thenable<string | undefined>;

/** Jalankan per share; satu share gagal tidak menghentikan yang lain. */
async function runAll<T>(items: T[], fn: (item: T, ask: Ask) => Promise<void>): Promise<void> {
  const cache = new Map<string, Thenable<string | undefined>>();
  const ask: Ask = (key, prompt, password = true) => {
    if (!cache.has(key)) {
      cache.set(key, vscode.window.showInputBox({ prompt, password, ignoreFocusOut: true }));
    }
    return cache.get(key)!;
  };
  for (const item of items) {
    try {
      await fn(item, ask);
    } catch (e) {
      if (e instanceof Cancelled) {
        return;
      }
      log.error('runAll - share operation failed', e);
      vscode.window.showErrorMessage(`WSL Share Mount: ${(e as Error).message}`);
    }
  }
}

const askSudo = (ask: Ask) => () => ask('sudo', 'sudo password for WSL (not stored)');

async function required(value: Thenable<string | undefined>): Promise<string> {
  const v = await value;
  if (!v) {
    throw new Cancelled('input not provided');
  }
  return v;
}

async function mount(s: Share, ask: Ask): Promise<void> {
  if (await isMounted(s.mountPoint)) {
    vscode.window.showInformationMessage(`Already mounted: ${s.mountPoint}`);
    return;
  }
  // isi lokal tidak terhapus, hanya tertutup selama share ter-mount.
  if (await isNonEmptyDir(s.mountPoint)) {
    const ok = await vscode.window.showWarningMessage(
      `${s.mountPoint} is not empty. Its local contents will be hidden while the share is mounted.`,
      { modal: true },
      'Mount anyway',
    );
    if (!ok) {
      return;
    }
  }
  const uid = process.getuid?.() ?? 1000;
  const gid = process.getgid?.() ?? 1000;
  const doMount = (credentialsFile?: string) =>
    vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: `Mounting ${s.name}…` }, () =>
      sudo([['mkdir', '-p', s.mountPoint], mountArgs(s, uid, gid, credentialsFile)], askSudo(ask)),
    );
  if (s.auth === 'credentials') {
    const username =
      s.username || (await required(ask(`username:${s.mountPoint}`, `Username for ${s.share} (e.g. DOMAIN\\user)`, false)));
    const password = await required(ask(`password:${username}`, `Password for ${username} on ${s.share} (not stored)`));
    await withCredentialsFile(credentialsContent(username, password), doMount);
  } else {
    await doMount();
  }
  log.info(`Mounted ${s.share} -> ${s.mountPoint} (auth=${s.auth ?? 'windows'})`);
  vscode.window.showInformationMessage(`Mounted ${s.name} → ${s.mountPoint}`);
}

async function unmount(s: Share, ask: Ask): Promise<void> {
  if (!(await isMounted(s.mountPoint))) {
    vscode.window.showInformationMessage(`Not mounted: ${s.mountPoint}`);
    return;
  }
  const source = await mountSource(s.mountPoint);
  await sudo([['umount', s.mountPoint]], askSudo(ask));
  log.info(`Unmounted ${source} from ${s.mountPoint}`);
  vscode.window.showInformationMessage(`Unmounted ${s.mountPoint}`);
}

async function openSettings(): Promise<void> {
  await vscode.commands.executeCommand('workbench.action.openSettingsJson', { revealSetting: { key: 'wslShareMount.shares' } });
}
