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
  <span class="badge ${mounted ? 'on' : 'off'}"><span class="dot"></span>${mounted ? 'Linked' : 'Disconnected'}</span>
  <div class="info">
    <div class="name">${esc(s.name)}<span class="tag">${s.auth === 'credentials' ? 'Username + password' : 'Windows login'}</span></div>
    <dl>
      <dt>Mount point</dt><dd><code>${esc(s.mountPoint)}</code></dd>
      <dt>Share</dt><dd><code>${esc(s.share)}</code></dd>
    </dl>
  </div>
  <div class="actions">
    ${mounted ? button('unmount', 'Unmount', { mp: s.mountPoint, kind: 'btn outline' }) : button('mount', 'Mount', { mp: s.mountPoint, kind: 'btn primary' })}
    ${
      mounted
        ? '<span class="hint">Unmount to edit or remove</span>'
        : `<span class="links">${button('edit', 'Edit', { mp: s.mountPoint, kind: 'link' })}${button('remove', 'Remove', { mp: s.mountPoint, kind: 'link danger' })}</span>`
    }
  </div>
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
  :root {
    --ok: var(--vscode-testing-iconPassed, #3fb950);
    --bad: var(--vscode-testing-iconFailed, #f85149);
    --muted: var(--vscode-descriptionForeground, #8b949e);
    --border: var(--vscode-panel-border, #3c3c3c);
    --accent: var(--vscode-button-background, #0e639c);
    --accent-fg: var(--vscode-button-foreground, #ffffff);
  }
  body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 20px; max-width: 960px; line-height: 1.4; }
  header { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
  h1 { font-size: 1.4em; margin: 0 auto 0 0; }
  .summary { color: var(--muted); padding: 2px 10px; border: 1px solid var(--border); border-radius: 999px; }
  .row { display: grid; grid-template-columns: 170px minmax(0, 1fr) auto; align-items: center; gap: 16px;
         padding: 14px 16px; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 10px; }
  .badge { display: inline-flex; align-items: center; gap: 8px; justify-self: start; font-weight: 600; white-space: nowrap;
           padding: 4px 12px; border-radius: 999px; }
  .badge .dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
  .badge.on { color: var(--ok); background: color-mix(in srgb, var(--ok) 15%, transparent); }
  .badge.off { color: var(--bad); background: color-mix(in srgb, var(--bad) 15%, transparent); }
  .name { font-weight: 600; font-size: 1.05em; margin-bottom: 6px; overflow-wrap: anywhere; }
  .tag { font-weight: normal; font-size: .8em; color: var(--muted); border: 1px solid var(--border); border-radius: 4px;
         padding: 1px 6px; margin-left: 8px; white-space: nowrap; vertical-align: 1px; }
  dl { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 4px 12px; margin: 0; font-size: .9em; }
  dt { color: var(--muted); }
  dd { margin: 0; min-width: 0; }
  code { font-family: var(--vscode-editor-font-family, monospace); overflow-wrap: anywhere; }
  .actions { display: flex; flex-direction: column; align-items: stretch; gap: 6px; min-width: 130px; text-align: center; }
  .links { display: flex; justify-content: center; gap: 4px; }
  .hint { font-size: .8em; color: var(--muted); }
  button { font: inherit; cursor: pointer; }
  button:disabled { opacity: .55; cursor: default; }
  button:focus-visible { outline: 2px solid var(--vscode-focusBorder, #007fd4); outline-offset: 2px; }
  .btn { padding: 6px 18px; border-radius: 4px; font-weight: 600; border: 1px solid var(--accent); }
  .btn.primary { background: var(--accent); color: var(--accent-fg); }
  .btn.primary:hover:not(:disabled) { background: var(--vscode-button-hoverBackground, #1177bb); }
  .btn.outline { background: transparent; color: var(--vscode-foreground); border-color: var(--muted); }
  .btn.outline:hover:not(:disabled) { border-color: var(--bad); color: var(--bad); }
  .link { background: none; border: none; padding: 2px 6px; color: var(--vscode-textLink-foreground, #3794ff); }
  .link:hover:not(:disabled) { text-decoration: underline; }
  .link.danger { color: var(--bad); }
  .empty { color: var(--muted); }
  @media (max-width: 560px) {
    .row { grid-template-columns: minmax(0, 1fr); }
    .actions { flex-direction: row; align-items: center; }
  }
</style>
</head>
<body>
<header>
  <h1>WSL Share Mount</h1>
  <span class="summary">${linked}/${rows.length} linked</span>
  ${rows.length - linked > 1 ? button('mountAll', 'Mount all', { kind: 'btn primary' }) : ''}
  ${button('add', '+ Add share', { kind: rows.length ? 'btn outline' : 'btn primary' })}
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
