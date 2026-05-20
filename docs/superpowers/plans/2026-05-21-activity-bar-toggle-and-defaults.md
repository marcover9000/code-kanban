# Activity bar toggle + configurable defaults — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an activity-bar icon + `code-kanban.toggle` command with two interaction modes (shortcut / panel) configurable via settings, plus auto-creation of `.todo.kanban` with optional `.gitignore` entry, configurable default list titles, and a default keyboard shortcut `Ctrl+Alt+K`.

**Architecture:** Two TreeDataProviders (one minimal for shortcut mode, one with file list for panel mode), gated by `when` clauses on `config.code-kanban.activity-bar-mode`. Pure helpers (`buildInitialKanban`, `ensureGitignoreEntry`) extracted to their own files for unit testing. Toggle logic centralized in `src/toggleKanban.ts`.

**Tech Stack:** TypeScript, VSCode Extension API, vitest, webpack (existing build).

**Spec reference:** `docs/superpowers/specs/2026-05-21-activity-bar-toggle-and-defaults-design.md`

---

## File map

**New files:**
- `media/code-kanban-activity-bar.svg` — Monochrome SVG for the activity bar icon (uses `currentColor`)
- `src/buildInitialKanban.ts` — Pure helper: titles array → `Kanban` structure
- `src/ensureGitignoreEntry.ts` — Pure helper: add pattern to `.gitignore` idempotently
- `src/toggleKanban.ts` — `code-kanban.toggle` command handler + auto-creation flow
- `src/shortcutSidebarProvider.ts` — `TreeDataProvider` with a single "Open" item
- `src/panelSidebarProvider.ts` — `TreeDataProvider` with `*.kanban` file list + FS watcher
- `src/tests/buildInitialKanban.test.ts` — Unit tests for helper
- `src/tests/ensureGitignoreEntry.test.ts` — Unit tests for helper

**Modified files:**
- `package.json` — Add `viewsContainers`, `views`, `commands`, `keybindings`, and 2 new entries to `configuration.properties`
- `src/extension.ts` — Register new command, both tree providers, and refactor `code-kanban.new` to use `buildInitialKanban`

---

## Task 1: Create monochrome activity-bar icon

**Files:**
- Create: `media/code-kanban-activity-bar.svg`

- [ ] **Step 1: Write the SVG**

```bash
mkdir -p media
```

Create `media/code-kanban-activity-bar.svg`:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <rect x="2"  y="5"  width="6" height="4" rx="1"/>
  <rect x="2"  y="11" width="6" height="4" rx="1"/>
  <rect x="9"  y="5"  width="6" height="4" rx="1"/>
  <rect x="9"  y="11" width="6" height="4" rx="1"/>
  <rect x="9"  y="17" width="6" height="4" rx="1"/>
  <rect x="16" y="5"  width="6" height="4" rx="1"/>
</svg>
```

- [ ] **Step 2: Verify file exists and parses**

Run: `xmllint --noout media/code-kanban-activity-bar.svg && echo OK`
Expected: `OK`. (If `xmllint` unavailable, open in browser or `cat` to inspect — must be valid XML.)

- [ ] **Step 3: Commit**

```bash
git add media/code-kanban-activity-bar.svg
git commit -m "feat(activity-bar): add monochrome icon SVG"
```

---

## Task 2: `buildInitialKanban` helper (TDD)

**Files:**
- Create: `src/buildInitialKanban.ts`
- Test: `src/tests/buildInitialKanban.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/buildInitialKanban.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildInitialKanban } from '../buildInitialKanban';

describe('buildInitialKanban', () => {
  it('creates one empty list per title with a uuid', () => {
    const k = buildInitialKanban(['A', 'B', 'C']);
    expect(k.lists).toHaveLength(3);
    expect(k.lists.map((l) => l.title)).toEqual(['A', 'B', 'C']);
    expect(k.lists[0].cards).toEqual([]);
    expect(typeof k.lists[0].id).toBe('string');
    expect(k.lists[0].id.length).toBeGreaterThan(0);
    expect(new Set(k.lists.map((l) => l.id)).size).toBe(3); // unique ids
  });

  it('initializes archive and settings to defaults', () => {
    const k = buildInitialKanban(['X']);
    expect(k.archive).toEqual({ lists: [], cards: [] });
    expect(k.settings).toEqual({ labels: [] });
  });

  it('falls back to the canonical defaults when titles is empty', () => {
    const k = buildInitialKanban([]);
    expect(k.lists.map((l) => l.title)).toEqual(['Backlog', 'To Do', 'Doing', 'Done']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/buildInitialKanban.test.ts`
Expected: FAIL with module-not-found error (`buildInitialKanban` does not exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/buildInitialKanban.ts`:

```typescript
import { type Kanban } from './kanban/models/kanban';
import { uuid } from './kanban/utils';

const DEFAULT_TITLES = ['Backlog', 'To Do', 'Doing', 'Done'];

export function buildInitialKanban(titles: string[]): Kanban {
  const effectiveTitles = titles.length > 0 ? titles : DEFAULT_TITLES;
  return {
    lists: effectiveTitles.map((title) => ({
      id: uuid(),
      title,
      cards: [],
    })),
    archive: { lists: [], cards: [] },
    settings: { labels: [] },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tests/buildInitialKanban.test.ts`
Expected: PASS — 3 tests passing.

- [ ] **Step 5: Refactor `src/extension.ts` to use the new helper**

In `src/extension.ts`, replace the `initialKanban` object literal (currently lines 22-49) with a call to `buildInitialKanban` reading from the future `code-kanban.default-lists` setting (default `[]` → falls back).

Replace the entire `try` block body (lines 21-56) so it reads:

```typescript
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
```

Then update the imports at the top of `src/extension.ts`:

- Remove `import { type Kanban } from './kanban/models/kanban';` (no longer referenced here).
- Remove `import { uuid } from './kanban/utils';` (no longer referenced here).
- Add `import { buildInitialKanban } from './buildInitialKanban';`.

After the edit, the import block should look exactly like this:

```typescript
import { Buffer } from 'node:buffer';
import * as vscode from 'vscode';
import { KanbanEditorProvider } from './kanbanEditor';
import { buildInitialKanban } from './buildInitialKanban';
```

- [ ] **Step 6: Verify build and tests still pass**

Run: `npm run build 2>&1 | tail -5`
Expected: `webpack 5.106.2 compiled with 3 warnings in ...` (no errors).

Run: `npx vitest run`
Expected: All tests pass (5 total: 4 existing + 3 new in buildInitialKanban).

- [ ] **Step 7: Commit**

```bash
git add src/buildInitialKanban.ts src/tests/buildInitialKanban.test.ts src/extension.ts
git commit -m "feat: extract buildInitialKanban helper, use default-lists setting"
```

---

## Task 3: `ensureGitignoreEntry` helper (TDD)

**Files:**
- Create: `src/ensureGitignoreEntry.ts`
- Test: `src/tests/ensureGitignoreEntry.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/ensureGitignoreEntry.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ensureGitignoreEntry } from '../ensureGitignoreEntry';

describe('ensureGitignoreEntry', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'cgk-test-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates .gitignore with the pattern if no file exists', async () => {
    await ensureGitignoreEntry(dir, '*.kanban');
    const content = readFileSync(join(dir, '.gitignore'), 'utf8');
    expect(content).toContain('*.kanban');
    expect(content).toContain('# Code Kanban');
  });

  it('appends the pattern to an existing .gitignore', async () => {
    writeFileSync(join(dir, '.gitignore'), 'node_modules\n');
    await ensureGitignoreEntry(dir, '*.kanban');
    const content = readFileSync(join(dir, '.gitignore'), 'utf8');
    expect(content).toContain('node_modules');
    expect(content).toContain('*.kanban');
  });

  it('does not duplicate the pattern if already present', async () => {
    writeFileSync(join(dir, '.gitignore'), 'node_modules\n*.kanban\n');
    await ensureGitignoreEntry(dir, '*.kanban');
    const content = readFileSync(join(dir, '.gitignore'), 'utf8');
    const occurrences = content.match(/\*\.kanban/g) ?? [];
    expect(occurrences.length).toBe(1);
  });

  it('ensures a trailing newline before appending', async () => {
    writeFileSync(join(dir, '.gitignore'), 'node_modules'); // no trailing newline
    await ensureGitignoreEntry(dir, '*.kanban');
    const content = readFileSync(join(dir, '.gitignore'), 'utf8');
    expect(content).toMatch(/node_modules\n.*\*\.kanban/s);
  });

  it('treats lines with surrounding whitespace as a match', async () => {
    writeFileSync(join(dir, '.gitignore'), '  *.kanban  \n');
    await ensureGitignoreEntry(dir, '*.kanban');
    const content = readFileSync(join(dir, '.gitignore'), 'utf8');
    const occurrences = content.match(/\*\.kanban/g) ?? [];
    expect(occurrences.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/ensureGitignoreEntry.test.ts`
Expected: FAIL with module-not-found error.

- [ ] **Step 3: Write the implementation**

Create `src/ensureGitignoreEntry.ts`:

```typescript
import { Buffer } from 'node:buffer';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export async function ensureGitignoreEntry(workspaceRoot: string, pattern: string): Promise<void> {
  const gitignorePath = join(workspaceRoot, '.gitignore');

  if (!existsSync(gitignorePath)) {
    const content = `# Code Kanban\n${pattern}\n`;
    writeFileSync(gitignorePath, content, 'utf8');
    return;
  }

  const current = readFileSync(gitignorePath, 'utf8');
  const alreadyPresent = current
    .split(/\r?\n/)
    .map((line) => line.trim())
    .some((line) => line === pattern);

  if (alreadyPresent) {
    return;
  }

  const needsLeadingNewline = current.length > 0 && !current.endsWith('\n');
  const appendix = `${needsLeadingNewline ? '\n' : ''}${pattern}\n`;
  writeFileSync(gitignorePath, current + appendix, 'utf8');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tests/ensureGitignoreEntry.test.ts`
Expected: PASS — 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/ensureGitignoreEntry.ts src/tests/ensureGitignoreEntry.test.ts
git commit -m "feat: add ensureGitignoreEntry helper"
```

---

## Task 4: `package.json` — view container, views, settings, command, keybinding

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add the new manifest entries**

In `package.json`, replace the entire `contributes` block with the following (keep the rest of the file untouched). The diff vs. the current state adds: `viewsContainers`, `views`, `keybindings`, a second `command` entry, and 2 new `configuration.properties`.

```jsonc
"contributes": {
  "customEditors": [
    {
      "viewType": "code-kanban.edit",
      "displayName": "Code Kanban",
      "selector": [
        {
          "filenamePattern": "*.kanban"
        }
      ]
    }
  ],
  "viewsContainers": {
    "activitybar": [
      {
        "id": "code-kanban",
        "title": "Code Kanban",
        "icon": "media/code-kanban-activity-bar.svg"
      }
    ]
  },
  "views": {
    "code-kanban": [
      {
        "id": "code-kanban.shortcut-view",
        "name": "Code Kanban",
        "when": "config.code-kanban.activity-bar-mode == 'shortcut'"
      },
      {
        "id": "code-kanban.panel-view",
        "name": "Boards",
        "when": "config.code-kanban.activity-bar-mode == 'panel'"
      }
    ]
  },
  "commands": [
    {
      "command": "code-kanban.new",
      "title": "Code Kanban: Create new Kanban"
    },
    {
      "command": "code-kanban.toggle",
      "title": "Code Kanban: Toggle todo board"
    }
  ],
  "menus": {
    "view/title": [
      {
        "command": "code-kanban.new",
        "when": "view == code-kanban.panel-view",
        "group": "navigation"
      }
    ]
  },
  "keybindings": [
    {
      "command": "code-kanban.toggle",
      "key": "ctrl+alt+k",
      "mac": "cmd+alt+k"
    }
  ],
  "configuration": {
    "type": "object",
    "title": "Code Kanban",
    "properties": {
      "code-kanban.theme": {
        "title": "Code Kanban Theme",
        "type": "string",
        "default": "system",
        "enum": ["dark", "light", "system"],
        "description": "Switch the theme to dark or light."
      },
      "code-kanban.show-description": {
        "title": "Code Kanban Show Description",
        "type": "boolean",
        "default": "true",
        "description": "Card description is shown."
      },
      "code-kanban.show-task-list": {
        "title": "Code Kanban Show Task List",
        "type": "boolean",
        "default": "true",
        "description": "Card task list is shown."
      },
      "code-kanban.activity-bar-mode": {
        "title": "Activity Bar Mode",
        "type": "string",
        "default": "shortcut",
        "enum": ["shortcut", "panel"],
        "enumDescriptions": [
          "Activity-bar icon toggles the workspace's .todo.kanban open/closed in the editor area.",
          "Activity-bar icon opens a sidebar listing all *.kanban files in the workspace."
        ],
        "description": "Controls how the activity-bar icon behaves."
      },
      "code-kanban.default-lists": {
        "title": "Default Lists",
        "type": "array",
        "items": { "type": "string" },
        "default": ["Backlog", "To Do", "Doing", "Done"],
        "description": "List/column titles used when creating a new kanban file."
      }
    }
  }
}
```

- [ ] **Step 2: Verify the manifest parses cleanly**

Run: `node -e "JSON.parse(require('node:fs').readFileSync('package.json','utf8')); console.log('OK')"`
Expected: `OK`.

Run: `npm run build 2>&1 | tail -3`
Expected: `webpack 5.106.2 compiled with 3 warnings ...` (no errors). The two new TreeView ids are referenced but not registered yet — webpack doesn't care. Activate-time errors only appear in dev host.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "feat(package): contribute activity-bar container, views, toggle command, keybinding, settings"
```

---

## Task 5: `code-kanban.toggle` command + auto-creation flow

**Files:**
- Create: `src/toggleKanban.ts`
- Modify: `src/extension.ts`

- [ ] **Step 1: Write `src/toggleKanban.ts`**

```typescript
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
  if (openTab) {
    await vscode.window.tabGroups.close(openTab);
  } else {
    await vscode.commands.executeCommand('vscode.openWith', target, CUSTOM_EDITOR_VIEW_TYPE);
  }
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
      const input = tab.input;
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
    return; // user cancelled
  }

  const defaultLists =
    vscode.workspace.getConfiguration().get<string[]>('code-kanban.default-lists') ?? [];
  const initialKanban = buildInitialKanban(defaultLists);
  const payload = Buffer.from(JSON.stringify(initialKanban, null, 2), 'utf8');

  await vscode.workspace.fs.writeFile(target, payload);

  if (choice === 'Create and add to .gitignore') {
    await ensureGitignoreEntry(workspaceRoot, '*.kanban');
  }

  await vscode.commands.executeCommand('vscode.openWith', target, CUSTOM_EDITOR_VIEW_TYPE);
}
```

- [ ] **Step 2: Register the command in `src/extension.ts`**

Add a third entry to the `context.subscriptions.push(...)` call inside `activate()` — keep the existing `KanbanEditorProvider.register(context)` and `code-kanban.new` registrations as they are, and append `vscode.commands.registerCommand('code-kanban.toggle', toggleKanban)` after them. The resulting structure (the existing `code-kanban.new` body is unchanged — represented by `/* unchanged */` below):

```typescript
context.subscriptions.push(
  KanbanEditorProvider.register(context),
  vscode.commands.registerCommand('code-kanban.new', async () => {
    /* unchanged: full body of the existing handler stays exactly as written today */
  }),
  vscode.commands.registerCommand('code-kanban.toggle', toggleKanban)
);
```

Then add the import at the top of `src/extension.ts`, alongside the other local imports:

```typescript
import { toggleKanban } from './toggleKanban';
```

- [ ] **Step 3: Build and confirm no errors**

Run: `npm run build 2>&1 | tail -3`
Expected: `webpack 5.106.2 compiled with 3 warnings ...` (no errors).

Run: `npx vitest run`
Expected: All tests still pass (existing 4 + new 3 + new 5 = 12 if counts align — at minimum no regression).

- [ ] **Step 4: Manual verification in dev host**

Open VSCode at the project root and press F5. In the dev host window:

1. Open a folder that does NOT have a `.todo.kanban` (e.g., create a tmp dir).
2. Press `Ctrl+Alt+K`.
3. Expect: modal dialog appears with "No kanban found ... Create .todo.kanban?".
4. Click "Create and add to .gitignore".
5. Expect: file `.todo.kanban` created at the workspace root, `.gitignore` contains `*.kanban`, board opens with the columns from the `default-lists` setting.
6. Press `Ctrl+Alt+K` again.
7. Expect: tab closes.
8. Press `Ctrl+Alt+K` again.
9. Expect: tab reopens.

- [ ] **Step 5: Commit**

```bash
git add src/toggleKanban.ts src/extension.ts
git commit -m "feat: add code-kanban.toggle command with auto-creation flow"
```

---

## Task 6: Sidebar TreeView for `shortcut` mode

**Files:**
- Create: `src/shortcutSidebarProvider.ts`
- Modify: `src/extension.ts`

- [ ] **Step 1: Write `src/shortcutSidebarProvider.ts`**

```typescript
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
```

- [ ] **Step 2: Register in `src/extension.ts`**

Inside `activate()`, after the command registrations, add:

```typescript
const shortcutProvider = new ShortcutSidebarProvider();
context.subscriptions.push(
  vscode.window.registerTreeDataProvider('code-kanban.shortcut-view', shortcutProvider)
);
```

Import at the top:

```typescript
import { ShortcutSidebarProvider } from './shortcutSidebarProvider';
```

- [ ] **Step 3: Build and verify**

Run: `npm run build 2>&1 | tail -3`
Expected: no errors.

- [ ] **Step 4: Manual verification in dev host**

1. F5 to launch dev host. Confirm `code-kanban.activity-bar-mode` is `"shortcut"` (default).
2. Click the Code Kanban icon in the activity bar.
3. Expect: sidebar opens showing "Code Kanban" view with a single tree item "Open todo kanban" preceded by a rocket icon.
4. Click that item.
5. Expect: the same behaviour as pressing `Ctrl+Alt+K` (modal or toggle).

- [ ] **Step 5: Commit**

```bash
git add src/shortcutSidebarProvider.ts src/extension.ts
git commit -m "feat: shortcut sidebar view with single Open item"
```

---

## Task 7: Sidebar TreeView for `panel` mode

**Files:**
- Create: `src/panelSidebarProvider.ts`
- Modify: `src/extension.ts`

- [ ] **Step 1: Write `src/panelSidebarProvider.ts`**

```typescript
import * as vscode from 'vscode';

export class PanelSidebarProvider implements vscode.TreeDataProvider<KanbanFileItem> {
  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  constructor(private readonly watcher: vscode.FileSystemWatcher) {
    watcher.onDidCreate(() => this._onDidChange.fire());
    watcher.onDidDelete(() => this._onDidChange.fire());
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
```

- [ ] **Step 2: Register in `src/extension.ts`**

Inside `activate()`, after the shortcut provider registration, add:

```typescript
const kanbanWatcher = vscode.workspace.createFileSystemWatcher('**/*.kanban');
const panelProvider = new PanelSidebarProvider(kanbanWatcher);
context.subscriptions.push(
  kanbanWatcher,
  vscode.window.registerTreeDataProvider('code-kanban.panel-view', panelProvider)
);
```

Import at the top:

```typescript
import { PanelSidebarProvider } from './panelSidebarProvider';
```

- [ ] **Step 3: Build and verify**

Run: `npm run build 2>&1 | tail -3`
Expected: no errors.

- [ ] **Step 4: Manual verification in dev host**

1. F5 to launch dev host.
2. Open Settings (`Ctrl+,`), set `Code Kanban: Activity Bar Mode` to `panel`.
3. Click the Code Kanban icon in the activity bar.
4. Expect: sidebar opens with view "Boards" containing all `*.kanban` files in the workspace (e.g., `.todo.kanban` if it was created earlier).
5. Click one item.
6. Expect: it opens in the main editor area with the custom kanban editor.
7. Click the "+" in the view header (from the `view/title` menu).
8. Expect: the `code-kanban.new` save dialog appears (existing behaviour).
9. Create a new `.kanban` file.
10. Expect: it appears in the sidebar list within ~1s (FS watcher refresh).
11. Switch the setting back to `shortcut`.
12. Expect: sidebar view re-renders to the "Open todo kanban" single item.

- [ ] **Step 5: Commit**

```bash
git add src/panelSidebarProvider.ts src/extension.ts
git commit -m "feat: panel sidebar view listing *.kanban files with FS watcher"
```

---

## Task 8: End-to-end verification + memory note

**Files:** none (verification only)

- [ ] **Step 1: Full test suite green**

Run: `npx vitest run`
Expected: all tests pass. Tally: 4 (existing kanban.test.ts) + 3 (buildInitialKanban) + 5 (ensureGitignoreEntry) = 12 minimum.

- [ ] **Step 2: Clean build**

Run: `npm run build 2>&1 | tail -3`
Expected: `webpack 5.106.2 compiled with 3 warnings in ...` (no errors).

- [ ] **Step 3: Manual end-to-end smoke (dev host)**

In F5 dev host:

1. **Cold workspace** (no `.kanban`): `Ctrl+Alt+K` → modal → `Create and add to .gitignore` → `.todo.kanban` created with the columns from the `default-lists` setting, `.gitignore` contains `*.kanban`, board open.
2. **Toggle close**: `Ctrl+Alt+K` again → tab closes.
3. **Toggle open**: `Ctrl+Alt+K` once more → tab opens.
4. **Sidebar shortcut mode**: click activity bar icon → single "Open todo kanban" item → click runs toggle.
5. **Sidebar panel mode**: switch setting → re-click → list of `*.kanban` files → click one to open.
6. **default-lists change**: settings → set `default-lists` to `["Inbox", "Doing", "Done"]` → delete `.todo.kanban` → `Ctrl+Alt+K` → modal → Create → new board has 3 columns with those names.
7. **`.gitignore` idempotency**: trigger auto-create again on a different workspace where `.gitignore` already has `*.kanban` → no duplicate line added.

- [ ] **Step 4: Confirm no stray references**

Run: `grep -rn "portable-kanban" --include="*.ts" --include="*.json" --include="*.md" . 2>/dev/null | grep -v node_modules | grep -v package-lock | grep -v dist/ | grep -v "harehare/portable-kanban"`
Expected: only the `marcover9000/portable-kanban` repo URL in README/package.json (the GitHub remote name).

- [ ] **Step 5: Final commit (only if anything left over)**

```bash
git status
```

If anything is staged or unstaged from manual verification, commit it (e.g., minor tweaks discovered during smoke test). Otherwise skip.

---

## Out of scope (per spec)

- Multi-root workspace support (only `workspaceFolders[0]` is used).
- Configurable filename (currently hardcoded to `.todo.kanban`).
- Filter / archive view / recents in the sidebar.
- Reactive theme/setting refresh inside the open webview (heritage issue).
- Custom theme/color UI — future change.

## Notes for the implementing engineer

- The `code-kanban.edit` viewType is registered by `KanbanEditorProvider`. Don't change it — both `code-kanban.new` and `code-kanban.toggle` open files through it.
- VSCode's modal `showInformationMessage` does NOT support inline checkboxes. We use two buttons (`Create and add to .gitignore` / `Create only`) which is the closest idiomatic VSCode pattern; the spec calls this out explicitly.
- The `when` clause `config.code-kanban.activity-bar-mode == 'shortcut'` is evaluated by VSCode reactively, so switching the setting at runtime swaps the visible view automatically.
- `vscode.window.tabGroups.close()` is async and resolves to a boolean; we don't need to await its result beyond completion.
