import { Buffer } from 'node:buffer';
import * as vscode from 'vscode';
import { buildInitialKanban } from './buildInitialKanban';
import { ensureGitignoreEntry } from './ensureGitignoreEntry';

const DEFAULT_FILENAME = '.todo.kanban';
const CUSTOM_EDITOR_VIEW_TYPE = 'code-kanban.edit';

export async function toggleKanban(): Promise<void> {
  const root = vscode.workspace.workspaceFolders?.[0];
  if (!root) {
    await vscode.window.showWarningMessage('Open a folder or workspace to use Code Kanban.');
    return;
  }

  const target = vscode.Uri.joinPath(root.uri, DEFAULT_FILENAME);

  const exists = await fileExists(target);
  if (!exists) {
    await runAutoCreationFlow(target, root.uri.fsPath);
    return;
  }

  const openTab = findOpenTab(target);
  await (openTab
    ? vscode.window.tabGroups.close(openTab)
    : vscode.commands.executeCommand('vscode.openWith', target, CUSTOM_EDITOR_VIEW_TYPE));
}

async function fileExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

function findOpenTab(uri: vscode.Uri): vscode.Tab | undefined {
  for (const group of vscode.window.tabGroups.all) {
    for (const tab of group.tabs) {
      const { input } = tab;
      if (
        input instanceof vscode.TabInputCustom &&
        input.viewType === CUSTOM_EDITOR_VIEW_TYPE &&
        input.uri.toString() === uri.toString()
      ) {
        return tab;
      }
    }
  }

  return undefined;
}

async function runAutoCreationFlow(target: vscode.Uri, workspaceRoot: string): Promise<void> {
  const choice = await vscode.window.showInformationMessage(
    'No kanban found in this workspace. Create .todo.kanban at the root?',
    { modal: true },
    'Create and add to .gitignore',
    'Create only'
  );

  if (choice === undefined) {
    return; // User cancelled
  }

  const defaultLists = vscode.workspace.getConfiguration().get<string[]>('code-kanban.default-lists') ?? [];
  const initialKanban = buildInitialKanban(defaultLists);
  const payload = Buffer.from(JSON.stringify(initialKanban, null, 2), 'utf8');

  await vscode.workspace.fs.writeFile(target, payload);

  if (choice === 'Create and add to .gitignore') {
    await ensureGitignoreEntry(workspaceRoot, '*.kanban');
  }

  await vscode.commands.executeCommand('vscode.openWith', target, CUSTOM_EDITOR_VIEW_TYPE);
}
