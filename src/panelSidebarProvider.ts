import * as vscode from 'vscode';

export class PanelSidebarProvider implements vscode.TreeDataProvider<KanbanFileItem>, vscode.Disposable {
  readonly onDidChangeTreeData: vscode.Event<void>;
  private readonly changeEmitter = new vscode.EventEmitter<void>();
  private readonly subscriptions: vscode.Disposable[] = [];

  constructor(watcher: vscode.FileSystemWatcher) {
    this.onDidChangeTreeData = this.changeEmitter.event;
    this.subscriptions.push(
      this.changeEmitter,
      watcher.onDidCreate(() => {
        this.changeEmitter.fire();
      }),
      watcher.onDidDelete(() => {
        this.changeEmitter.fire();
      })
    );
  }

  dispose(): void {
    for (const s of this.subscriptions) s.dispose();
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
