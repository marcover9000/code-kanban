import * as vscode from 'vscode';

export class PanelSidebarProvider implements vscode.TreeDataProvider<KanbanFileItem> {
  readonly onDidChangeTreeData: vscode.Event<void>;

  constructor(watcher: vscode.FileSystemWatcher) {
    const changeEmitter = new vscode.EventEmitter<void>();
    this.onDidChangeTreeData = changeEmitter.event;
    watcher.onDidCreate(() => {
      changeEmitter.fire();
    });
    watcher.onDidDelete(() => {
      changeEmitter.fire();
    });
  }

  getTreeItem(element: KanbanFileItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<KanbanFileItem[]> {
    // Single-arg findFiles uses VSCode's default excludes (files.exclude),
    // which already covers node_modules, .git, etc.
    const files = await vscode.workspace.findFiles('**/*.kanban');
    files.sort((a, b) => a.fsPath.localeCompare(b.fsPath));
    return files.map((uri) => new KanbanFileItem(uri));
  }
}

class KanbanFileItem extends vscode.TreeItem {
  constructor(uri: vscode.Uri) {
    const label = vscode.workspace.asRelativePath(uri);
    super(label, vscode.TreeItemCollapsibleState.None);
    this.resourceUri = uri;
    this.iconPath = new vscode.ThemeIcon('checklist');
    this.command = {
      command: 'vscode.openWith',
      title: 'Open kanban',
      arguments: [uri, 'code-kanban.edit'],
    };
  }
}
