import * as vscode from 'vscode';

export class ShortcutBounceViewProvider implements vscode.WebviewViewProvider {
  private bouncing = false;

  resolveWebviewView(view: vscode.WebviewView): void {
    view.webview.options = { enableScripts: false };
    // Minimal body that paints nothing — reduces what the user sees during the bounce frame.
    view.webview.html =
      '<!DOCTYPE html><html><head><style>html,body{background:transparent;margin:0;padding:0;height:0;overflow:hidden;}</style></head><body></body></html>';

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
      // Queue closeSidebar first (fire-and-forget) so VSCode starts collapsing
      // the sidebar in parallel with the toggle, instead of waiting for the
      // toggle to finish opening the editor.
      void vscode.commands.executeCommand('workbench.action.closeSidebar');
      await vscode.commands.executeCommand('code-kanban.toggle');
    } finally {
      this.bouncing = false;
    }
  }
}
