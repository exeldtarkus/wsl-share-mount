// Regenerate images/icon.png and the README screenshots by rendering the panel HTML in headless Chromium.
// run: npm run compile && node scripts/screenshots.js   (playwright-core: env PW, global npm, or newest npx cache)
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'images', 'screenshots');
const { render } = require(path.join(root, 'out', 'panelHtml'));

function findPlaywright() {
  if (process.env.PW) return process.env.PW;
  const npmRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
  for (const d of [path.join(npmRoot, 'playwright-core'), path.join(npmRoot, 'playwright', 'node_modules', 'playwright-core')]) {
    if (fs.existsSync(d)) return d;
  }
  const npx = path.join(process.env.HOME, '.npm', '_npx');
  const found = fs.existsSync(npx) ? fs.readdirSync(npx).map((d) => path.join(npx, d, 'node_modules', 'playwright-core'))
    .filter((d) => fs.existsSync(d)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs) : [];
  if (!found.length) throw new Error('playwright-core not found: set PW=<path> or run `npx playwright install chromium`');
  return found[0];
}

// VS Code Dark+ theme variables
const THEME = `:root{--vscode-font-family:'Segoe UI','DejaVu Sans',sans-serif;--vscode-foreground:#cccccc;
--vscode-editor-font-family:'Consolas','DejaVu Sans Mono',monospace;--vscode-descriptionForeground:#9d9d9d;
--vscode-panel-border:#3c3c3c;--vscode-button-background:#0e639c;--vscode-button-foreground:#fff;
--vscode-button-hoverBackground:#1177bb;--vscode-textLink-foreground:#3794ff;--vscode-testing-iconPassed:#73c991;
--vscode-testing-iconFailed:#f14c4c;font-size:13px}body{background:#1e1e1e;margin:0}`;

const prepare = (html) => html
  .replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, '')
  .replace('const vscode = acquireVsCodeApi();', 'const vscode = { postMessage() {} };')
  .replace('<style>', '<style>' + THEME);

// Fictional shares only: never real hosts.
const share = (name, unc, mountPoint, auth = 'windows') => ({ name, share: unc, mountPoint, auth });
const rows = [
  { share: share('UAT', '\\\\fileserver\\share\\UAT', '/mnt/uat'), mounted: true },
  { share: share('Reports', '\\\\fileserver\\reports', '/mnt/reports', 'credentials'), mounted: false },
  { share: share('Builds', '\\\\nas01\\builds\\nightly', '/mnt/builds'), mounted: false },
];

(async () => {
  const { chromium } = require(findPlaywright());
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  try {
    const shot = async (html, name, { w = 960, h } = {}) => {
      const page = await browser.newPage({ viewport: { width: w, height: h ?? 400 } });
      await page.setContent(prepare(html));
      const height = h ?? (await page.evaluate(() => document.body.scrollHeight + 20));
      await page.screenshot({ path: path.join(outDir, name), clip: { x: 0, y: 0, width: w, height } });
      console.log('wrote images/screenshots/' + name);
      await page.close();
    };

    // icon: 128x128 PNG from the SVG
    const icon = await browser.newPage({ viewport: { width: 128, height: 128 } });
    await icon.setContent(`<body style="margin:0;background:transparent">${fs.readFileSync(path.join(root, 'images', 'icon.svg'), 'utf8')}</body>`);
    await icon.screenshot({ path: path.join(root, 'images', 'icon.png'), omitBackground: true });
    console.log('wrote images/icon.png');
    await icon.close();

    await shot(render(rows, 'csp'), 'panel.png');
    await shot(render([], 'csp'), 'panel-empty.png', { w: 960, h: 160 });
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error('screenshots - failed:', e.stack || e);
  process.exitCode = 1;
});
