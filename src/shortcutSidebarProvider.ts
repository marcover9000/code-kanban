import * as vscode from 'vscode';

export class ShortcutSidebarProvider implements vscode.TreeDataProvider<ShortcutItem> {
  getTreeItem(element: ShortcutItem): vscode.TreeItem {
    return element;
  }

  getChildren(): ShortcutItem[] {
    const item = new ShortcutItem('Open todo kanban');
    item.command = {
      command: 'code-kanban.toggle',
      title: 'Toggle todo kanban',
    };
    item.iconPath = new vscode.ThemeIcon('rocket');
    return [item];
  }
}

class ShortcutItem extends vscode.TreeItem {
  constructor(label: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
  }
}
