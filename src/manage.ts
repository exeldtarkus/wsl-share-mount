import * as vscode from 'vscode';
import { Share, isMounted, isValidUnc, normalizeUnc } from './mount';

const config = () => vscode.workspace.getConfiguration('wslShareMount');

/** Isi setting apa adanya (termasuk entry tidak valid) supaya tulis ulang tidak menghapus entry user. */
const rawShares = () => config().get<Partial<Share>[]>('shares', []);

const saveShares = (list: Partial<Share>[]) => config().update('shares', list, vscode.ConfigurationTarget.Global);

const slug = (name: string) => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'share';

async function input(options: vscode.InputBoxOptions): Promise<string | undefined> {
  return vscode.window.showInputBox({ ignoreFocusOut: true, ...options });
}

/** Form langkah demi langkah; undefined bila dibatalkan (Esc). */
async function shareForm(title: string, existing?: Share): Promise<Share | undefined> {
  const taken = new Set(rawShares().map((s) => s.mountPoint).filter((m) => m !== existing?.mountPoint));
  const step = (n: number) => `${title} (${n}/4)`;

  const name = await input({
    title: step(1),
    prompt: 'Display name',
    placeHolder: 'UAT',
    value: existing?.name,
    validateInput: (v) => (v.trim() ? undefined : 'Name is required'),
  });
  if (name === undefined) {
    return;
  }
  const share = await input({
    title: step(2),
    prompt: 'Windows share path (UNC). Forward slashes are fine too.',
    placeHolder: '\\\\server\\share\\folder',
    value: existing?.share,
    validateInput: (v) => (isValidUnc(normalizeUnc(v)) ? undefined : 'Use \\\\server\\share or \\\\server\\share\\folder'),
  });
  if (share === undefined) {
    return;
  }
  const mountPoint = await input({
    title: step(3),
    prompt: 'Mount point in WSL',
    value: existing?.mountPoint ?? `/mnt/${slug(name)}`,
    validateInput: (v) =>
      !v.trim().startsWith('/') ? 'Must be an absolute path' : taken.has(v.trim()) ? 'Already used by another share' : undefined,
  });
  if (mountPoint === undefined) {
    return;
  }
  const auth = await vscode.window.showQuickPick(
    [
      { label: '$(account) Current Windows login', detail: 'No password needed (drvfs).', value: 'windows' as const },
      {
        label: '$(key) Username + password',
        detail: 'Password is asked on every mount, never stored (cifs, needs cifs-utils).',
        value: 'credentials' as const,
      },
    ].map((i) => ({ ...i, description: i.value === (existing?.auth ?? 'windows') && existing ? 'current' : undefined })),
    { title: step(4), placeHolder: 'How to log in to the share', ignoreFocusOut: true },
  );
  if (!auth) {
    return;
  }
  const result: Share = { name: name.trim(), share: normalizeUnc(share), mountPoint: mountPoint.trim(), auth: auth.value };
  if (auth.value === 'credentials') {
    const username = await input({
      title: `${title} – username`,
      prompt: 'Username, e.g. DOMAIN\\user. Leave empty to be asked on every mount.',
      value: existing?.username,
    });
    if (username === undefined) {
      return;
    }
    if (username.trim()) {
      result.username = username.trim();
    }
  }
  return result;
}

async function pickShare(list: Share[], placeHolder: string): Promise<Share | undefined> {
  if (!list.length) {
    vscode.window.showInformationMessage('No shares configured yet.');
    return;
  }
  const picked = await vscode.window.showQuickPick(
    list.map((share) => ({ label: share.name, description: share.mountPoint, detail: share.share, share })),
    { placeHolder },
  );
  return picked?.share;
}

/** Ubah/hapus share yang sedang ter-mount bikin mount lama tidak terlacak, jadi minta unmount dulu. */
async function ensureNotMounted(s: Share): Promise<boolean> {
  if (await isMounted(s.mountPoint)) {
    vscode.window.showWarningMessage(`${s.name} is mounted at ${s.mountPoint}. Unmount it first.`);
    return false;
  }
  return true;
}

export async function addShare(): Promise<void> {
  const share = await shareForm('Add share');
  if (share) {
    await saveShares([...rawShares(), share]);
    vscode.window.showInformationMessage(`Added ${share.name} → ${share.mountPoint}`);
  }
}

export async function editShare(list: Share[]): Promise<void> {
  const old = await pickShare(list, 'Select a share to edit');
  if (!old || !(await ensureNotMounted(old))) {
    return;
  }
  const updated = await shareForm(`Edit ${old.name}`, old);
  if (updated) {
    await saveShares(rawShares().map((s) => (s.mountPoint === old.mountPoint ? updated : s)));
    vscode.window.showInformationMessage(`Updated ${updated.name}`);
  }
}

export async function removeShare(list: Share[]): Promise<void> {
  const old = await pickShare(list, 'Select a share to remove');
  if (!old || !(await ensureNotMounted(old))) {
    return;
  }
  const ok = await vscode.window.showWarningMessage(
    `Remove ${old.name} (${old.share} → ${old.mountPoint}) from settings?`,
    { modal: true },
    'Remove',
  );
  if (ok) {
    await saveShares(rawShares().filter((s) => s.mountPoint !== old.mountPoint));
  }
}
