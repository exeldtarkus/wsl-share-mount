import * as vscode from 'vscode';
import { Action, Row, render } from './panelHtml';

export { Action, Row } from './panelHtml';

let panel: vscode.WebviewPanel | undefined;

export function openPanel(rows: Row[], onAction: (a: Action) => void): void {
  if (panel) {
    panel.reveal();
  } else {
    panel = vscode.window.createWebviewPanel('wslShareMount', 'WSL Share Mount', vscode.ViewColumn.Active, {
      enableScripts: true,
    });
    panel.iconPath = new vscode.ThemeIcon('server');
    panel.webview.onDidReceiveMessage(onAction);
    panel.onDidDispose(() => (panel = undefined));
  }
  updatePanel(rows);
}

export function updatePanel(rows: Row[]): void {
  if (panel) {
    panel.webview.html = render(rows, panel.webview.cspSource);
  }
}
