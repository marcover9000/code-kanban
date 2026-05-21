import * as vscode from 'vscode';

export class ShortcutBounceViewProvider implements vscode.WebviewViewProvider {
  private bouncing = false;

  resolveWebviewView(view: vscode.WebviewView): void {
    view.webview.options = { enableScripts: false };
    view.webview.html = '<!DOCTYPE html><html><body></body></html>';

    void this.bounce();

    view.onDidChangeVisibility(() => {
      if (view.visible) {
        void this.bounce();
      }
    });
  }

  private async bounce(): Promise<void> {
    if (this.bouncing) {
      return;
    }

    this.bouncing = true;
    try {
      await vscode.commands.executeCommand('code-kanban.toggle');
      await vscode.commands.executeCommand('workbench.action.closeSidebar');
    } finally {
      this.bouncing = false;
    }
  }
}
