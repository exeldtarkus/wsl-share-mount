import { randomBytes } from 'crypto';
import { Share } from './mount';

export interface Row {
  share: Share;
  mounted: boolean;
}

export interface Action {
  cmd: 'mount' | 'unmount' | 'edit' | 'remove' | 'add' | 'mountAll' | 'refresh';
  mountPoint?: string;
}

/** Nama/path berasal dari setting user; wajib di-escape sebelum masuk HTML. */
export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function button(cmd: Action['cmd'], label: string, opts: { mp?: string; kind?: string; disabled?: string } = {}): string {
  const attrs = [
    `data-cmd="${cmd}"`,
    opts.mp ? `data-mp="${esc(opts.mp)}"` : '',
    opts.kind ? `class="${opts.kind}"` : '',
    opts.disabled ? `disabled title="${esc(opts.disabled)}"` : '',
  ];
  return `<button ${attrs.filter(Boolean).join(' ')}>${label}</button>`;
}

export function render(rows: Row[], cspSource: string): string {
  const nonce = randomBytes(16).toString('base64');
  const linked = rows.filter((r) => r.mounted).length;
  const body = rows.length
    ? rows
        .map(({ share: s, mounted }) => {
          const locked = mounted ? 'Unmount first' : '';
          return `<div class="row">
  <span class="badge ${mounted ? 'on' : 'off'}">${mounted ? '● Linked' : '● Disconnected'}</span>
  ${mounted ? button('unmount', 'Unmount', { mp: s.mountPoint, kind: 'secondary' }) : button('mount', 'Mount', { mp: s.mountPoint })}
  <div class="info">
    <div class="name">${esc(s.name)} <span class="auth">${s.auth === 'credentials' ? 'username + password' : 'Windows login'}</span></div>
    <div class="path"><code>${esc(s.mountPoint)}</code> ← <code>${esc(s.share)}</code></div>
  </div>
  ${button('edit', 'Edit', { mp: s.mountPoint, kind: 'link', disabled: locked })}
  ${button('remove', 'Remove', { mp: s.mountPoint, kind: 'link', disabled: locked })}
</div>`;
        })
        .join('\n')
    : '<p class="empty">No shares yet. Add one to get started.</p>';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 16px; max-width: 900px; }
  header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
  h1 { font-size: 1.3em; margin: 0 auto 0 0; }
  .summary { color: var(--vscode-descriptionForeground); }
  .row { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 1px solid var(--vscode-panel-border);
         border-radius: 6px; margin-bottom: 8px; flex-wrap: wrap; }
  .badge { min-width: 110px; font-weight: 600; }
  .badge.on { color: var(--vscode-testing-iconPassed, #3fb950); }
  .badge.off { color: var(--vscode-testing-iconFailed, #f85149); }
  .info { flex: 1; min-width: 200px; }
  .name { font-weight: 600; }
  .auth { font-weight: normal; font-size: .85em; color: var(--vscode-descriptionForeground); margin-left: 6px; }
  .path { font-size: .9em; color: var(--vscode-descriptionForeground); word-break: break-all; }
  button { font: inherit; padding: 4px 14px; border: none; border-radius: 3px; cursor: pointer;
           background: var(--vscode-button-background); color: var(--vscode-button-foreground); min-width: 90px; }
  button:hover:not(:disabled) { background: var(--vscode-button-hoverBackground); }
  button.secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
  button.secondary:hover:not(:disabled) { background: var(--vscode-button-secondaryHoverBackground); }
  button.link { background: none; color: var(--vscode-textLink-foreground); min-width: 0; padding: 4px 6px; }
  button:disabled { opacity: .5; cursor: default; }
  button:focus-visible { outline: 1px solid var(--vscode-focusBorder); outline-offset: 2px; }
  .empty { color: var(--vscode-descriptionForeground); }
</style>
</head>
<body>
<header>
  <h1>WSL Share Mount</h1>
  <span class="summary">${linked}/${rows.length} linked</span>
  ${rows.length - linked > 1 ? button('mountAll', 'Mount all') : ''}
  ${button('add', '+ Add share', { kind: rows.length ? 'secondary' : '' })}
  ${button('refresh', 'Refresh', { kind: 'link' })}
</header>
${body}
<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-cmd]');
    if (!b || b.disabled) return;
    // cegah klik ganda selama proses berjalan; panel di-render ulang setelah selesai.
    if (b.dataset.cmd !== 'refresh') document.querySelectorAll('button').forEach((x) => (x.disabled = true));
    if (b.dataset.cmd === 'mount' || b.dataset.cmd === 'unmount') b.textContent = b.dataset.cmd === 'mount' ? 'Mounting…' : 'Unmounting…';
    vscode.postMessage({ cmd: b.dataset.cmd, mountPoint: b.dataset.mp });
  });
</script>
</body>
</html>`;
}
