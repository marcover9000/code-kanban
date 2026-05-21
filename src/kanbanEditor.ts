
import * as vscode from 'vscode';
import { type Kanban, toJson } from './kanban/models/kanban';
import { buildWebviewHtml, readSidebarSettings } from './webviewHtml';

const viewType = 'code-kanban.edit';

export class KanbanEditorProvider implements vscode.CustomTextEditorProvider {
  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new KanbanEditorProvider(context);
    const providerRegistration = vscode.window.registerCustomEditorProvider(viewType, provider, {
      webviewOptions: { retainContextWhenHidden: true },
    });
    return providerRegistration;
  }

  constructor(private readonly context: vscode.ExtensionContext) {}

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
    };
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    const updateWebview = async () => {
      await webviewPanel.webview.postMessage({
        type: 'update',
        title: document.uri.path.split('/')?.slice(-1)[0]?.replace('.kanban', ''),
        text: document.getText(),
      });
    };

    webviewPanel.webview.onDidReceiveMessage(
      async (e: {
        type: 'load' | 'edit' | 'info-message' | 'open' | 'reload';
        message?: string;
        url?: string;
        kanban?: Kanban;
      }) => {
        switch (e.type) {
          case 'load': {
            await updateWebview();
            break;
          }

          case 'edit': {
            const success = await this.updateTextDocument(document, e.kanban!);

            if (!success) {
              await vscode.window.showErrorMessage('Failed to update Kanban');
            }

            break;
          }

          case 'info-message': {
            await vscode.window.showInformationMessage(e.message!, {
              modal: false,
            });
            break;
          }

          case 'open': {
            await vscode.env.openExternal(vscode.Uri.parse(e.url!));
            break;
          }

          case 'reload': {
            await updateWebview();
            break;
          }
        }
      }
    );
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const sidebarSettings = readSidebarSettings();
    return buildWebviewHtml(webview, this.context.extensionUri, {
      mode: 'editor',
      ...sidebarSettings,
      collapsedLists: {},
    });
  }

  private async updateTextDocument(document: vscode.TextDocument, kanban: Kanban): Promise<boolean> {
    const text = toJson(kanban);

    if (document.getText() === text) {
      return true;
    }

    const edit = new vscode.WorkspaceEdit();
    edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), text);

    return vscode.workspace.applyEdit(edit);
  }
}
