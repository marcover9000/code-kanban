import * as vscode from 'vscode';

export type WebviewMode = 'editor' | 'sidebar';

export type WebviewSettings = {
  mode: WebviewMode;
  showDescription: boolean;
  showTaskList: boolean;
  sidebarShowLabels: boolean;
  sidebarShowDueDate: boolean;
  sidebarShowCheckboxCount: boolean;
  collapsedLists: Record<string, boolean>;
};

export function buildWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri, settings: WebviewSettings): string {
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'kanban.js'));
  const theme =
    vscode.workspace.getConfiguration().get<'dark' | 'light' | 'system' | undefined>('code-kanban.theme') ?? 'system';
  const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'assets', 'css', 'main.css'));
  const themeFilename = theme === 'dark' ? 'dark.css' : theme === 'light' ? 'light.css' : 'system.css';
  const themeUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'assets', 'css', themeFilename));
  const nonce = crypto.randomUUID();

  const settingsJson = JSON.stringify({
    showDescription: settings.showDescription,
    showTaskList: settings.showTaskList,
    sidebarShowLabels: settings.sidebarShowLabels,
    sidebarShowDueDate: settings.sidebarShowDueDate,
    sidebarShowCheckboxCount: settings.sidebarShowCheckboxCount,
    collapsedLists: settings.collapsedLists,
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: ${webview.cspSource}; style-src 'unsafe-inline' https://fonts.googleapis.com ${webview.cspSource}; font-src https://fonts.gstatic.com; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;800&display=swap" rel="stylesheet">
  <title>Code Kanban</title>
  <link rel="stylesheet" nonce="${nonce}" href="${cssUri.toString()}">
  <link rel="stylesheet" nonce="${nonce}" href="${themeUri.toString()}">
</head>
<body>
  <script nonce="${nonce}">
    window.codeKanbanMode = ${JSON.stringify(settings.mode)};
    window.settings = ${settingsJson};
  </script>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri.toString()}"></script>
</body>
</html>`;
}

export function readSidebarSettings(): {
  showDescription: boolean;
  showTaskList: boolean;
  sidebarShowLabels: boolean;
  sidebarShowDueDate: boolean;
  sidebarShowCheckboxCount: boolean;
} {
  const config = vscode.workspace.getConfiguration();
  return {
    showDescription: config.get<boolean>('code-kanban.show-description') ?? true,
    showTaskList: config.get<boolean>('code-kanban.show-task-list') ?? true,
    sidebarShowLabels: config.get<boolean>('code-kanban.sidebar.show-labels') ?? true,
    sidebarShowDueDate: config.get<boolean>('code-kanban.sidebar.show-due-date') ?? true,
    sidebarShowCheckboxCount: config.get<boolean>('code-kanban.sidebar.show-checkbox-count') ?? true,
  };
}
