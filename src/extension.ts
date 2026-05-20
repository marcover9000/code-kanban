import { Buffer } from 'node:buffer';
import * as vscode from 'vscode';
import { KanbanEditorProvider } from './kanbanEditor';
import { buildInitialKanban } from './buildInitialKanban';

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
        const defaultLists =
          vscode.workspace.getConfiguration().get<string[]>('code-kanban.default-lists') ?? [];
        const initialKanban = buildInitialKanban(defaultLists);
        const kanbanJson = Buffer.from(JSON.stringify(initialKanban, null, 2), 'utf8');
        await vscode.workspace.fs.writeFile(fileInfos, kanbanJson);
        await vscode.commands.executeCommand('vscode.openWith', fileInfos, 'code-kanban.edit');
      } catch (error) {
        await vscode.window.showErrorMessage(`Cannot create file "${fileInfos.toString()}`);
        console.error('Cannot create file', error);
      }
    })
  );
}
