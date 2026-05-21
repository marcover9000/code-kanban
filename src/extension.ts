import { Buffer } from 'node:buffer';
import * as vscode from 'vscode';
import { KanbanEditorProvider } from './kanbanEditor';
import { buildInitialKanban } from './buildInitialKanban';
import { toggleKanban } from './toggleKanban';
import { PanelBoardViewProvider } from './panelBoardView';
import { ShortcutBounceViewProvider } from './shortcutBounceView';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    KanbanEditorProvider.register(context),
    vscode.commands.registerCommand('code-kanban.new', async () => {
      const fileInfos = await vscode.window.showSaveDialog({
        saveLabel: 'Create kanban',
        filters: {
          Kanban: ['kanban'],
        },
      });
      if (!fileInfos?.path.endsWith('.kanban')) {
        return;
      }

      try {
        const defaultLists = vscode.workspace.getConfiguration().get<string[]>('code-kanban.default-lists') ?? [];
        const initialKanban = buildInitialKanban(defaultLists);
        const kanbanJson = Buffer.from(JSON.stringify(initialKanban, null, 2), 'utf8');
        await vscode.workspace.fs.writeFile(fileInfos, kanbanJson);
        await vscode.commands.executeCommand('vscode.openWith', fileInfos, 'code-kanban.edit');
      } catch (error) {
        await vscode.window.showErrorMessage(`Cannot create file "${fileInfos.toString()}`);
        console.error('Cannot create file', error);
      }
    }),
    vscode.commands.registerCommand('code-kanban.toggle', toggleKanban)
  );

  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = '$(checklist) Code Kanban';
  statusBarItem.tooltip = 'Toggle .todo.kanban (Ctrl+Alt+K)';
  statusBarItem.command = 'code-kanban.toggle';
  const syncStatusBar = () => {
    const useActivityBar = vscode.workspace
      .getConfiguration()
      .get<boolean>('code-kanban.experimental.activity-bar-shortcut') ?? false;
    if (useActivityBar) {
      statusBarItem.hide();
    } else {
      statusBarItem.show();
    }
  };
  syncStatusBar();
  context.subscriptions.push(
    statusBarItem,
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('code-kanban.experimental.activity-bar-shortcut')) {
        syncStatusBar();
      }
    })
  );

  const shortcutBounceProvider = new ShortcutBounceViewProvider();
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('code-kanban.shortcut-view', shortcutBounceProvider)
  );

  const kanbanWatcher = vscode.workspace.createFileSystemWatcher('**/*.kanban');
  const panelBoardProvider = new PanelBoardViewProvider(context, kanbanWatcher);
  context.subscriptions.push(
    kanbanWatcher,
    vscode.window.registerWebviewViewProvider('code-kanban.panel-view', panelBoardProvider)
  );
}
