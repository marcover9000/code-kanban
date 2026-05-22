# Activity-bar modes 1-click redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Both activity-bar modes become 1-click: shortcut toggles `.todo.kanban` directly in the main editor (no sidebar shown), panel opens a sidebar rendering a vertical compact board with draggable cards.

**Architecture:** Replace both existing `TreeDataProvider`s with `WebviewViewProvider`s, gated by `when` clauses on `code-kanban.activity-bar-mode`. The shortcut view is a "bounce" view (fires toggle + `closeSidebar`). The panel view reuses the existing React kanban app via a new route `/sidebar` that renders `SidebarBoard` (vertical layout with `SidebarList` + `SidebarCard` components). Source of truth stays the `TextDocument` API.

**Tech Stack:** TypeScript, VSCode Extension API (`WebviewViewProvider`, `workbench.action.closeSidebar`, `workspaceState`), React 18, Jotai (existing store), react-beautiful-dnd (existing), styled-components.

**Spec reference:** `docs/superpowers/specs/2026-05-21-panel-mode-vertical-board-design.md`

---

## File map

**New files:**
- `src/shortcutBounceView.ts` — Webview-view provider that fires `code-kanban.toggle` + `closeSidebar` on visibility.
- `src/panelBoardView.ts` — Webview-view provider that hosts the React app in `/sidebar` mode.
- `src/webviewHtml.ts` — Pure helper that builds the kanban-app HTML for both the custom editor and the panel view (extracted from `src/kanbanEditor.ts`).
- `src/kanban/pages/SidebarBoard.tsx` — Vertical board page.
- `src/kanban/components/SidebarList.tsx` — Collapsible list rectangle.
- `src/kanban/components/SidebarCard.tsx` — Compact card.

**Modified files:**
- `package.json` — view types to `webview`, new `enumDescriptions`, 3 new settings, drop the `view/title` menu entry.
- `src/extension.ts` — drop old provider registrations, add new ones, pass `workspaceState` where needed.
- `src/kanbanEditor.ts` — use the new `webviewHtml` helper (no behavior change for the custom editor).
- `src/kanban/App.tsx` — route to `/sidebar` when `window.codeKanbanMode === 'sidebar'`; add the `/sidebar` route.

**Deleted files:**
- `src/shortcutSidebarProvider.ts` (replaced)
- `src/panelSidebarProvider.ts` (replaced)

---

## Task 1: Delete old TreeView providers + their registrations

**Files:**
- Delete: `src/shortcutSidebarProvider.ts`
- Delete: `src/panelSidebarProvider.ts`
- Modify: `src/extension.ts`

- [ ] **Step 1: Delete the two old provider files**

```bash
git rm src/shortcutSidebarProvider.ts src/panelSidebarProvider.ts
```

- [ ] **Step 2: Update `src/extension.ts` — remove imports and registrations**

Remove these imports near the top:
```typescript
import { ShortcutSidebarProvider } from './shortcutSidebarProvider';
import { PanelSidebarProvider } from './panelSidebarProvider';
```

Remove these blocks from inside `activate()` (they're below the `context.subscriptions.push(...)` for commands):
```typescript
const shortcutProvider = new ShortcutSidebarProvider();
context.subscriptions.push(vscode.window.registerTreeDataProvider('code-kanban.shortcut-view', shortcutProvider));

const kanbanWatcher = vscode.workspace.createFileSystemWatcher('**/*.kanban');
const panelProvider = new PanelSidebarProvider(kanbanWatcher);
context.subscriptions.push(
  kanbanWatcher,
  panelProvider,
  vscode.window.registerTreeDataProvider('code-kanban.panel-view', panelProvider)
);
```

- [ ] **Step 3: Verify build + tests still pass**

Run: `npm run build 2>&1 | tail -3`
Expected: webpack compiles with warnings only (no errors). The two views declared in `package.json` will be unregistered at runtime now — that's fine for this intermediate state.

Run: `npx vitest run`
Expected: 12/12 tests pass (nothing should have broken).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove old TreeView providers (will be replaced by webview views)"
```

---

## Task 2: `package.json` — view types webview + new settings + drop view/title menu

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update the `contributes` block**

Open `package.json` and apply these edits to the `contributes` object:

1. **Both views become `type: webview`** and the panel view name changes from `"Boards"` to `"Code Kanban"`. Replace the `views` block:

```jsonc
"views": {
  "code-kanban": [
    {
      "id": "code-kanban.shortcut-view",
      "name": "Code Kanban",
      "when": "config.code-kanban.activity-bar-mode == 'shortcut'",
      "type": "webview"
    },
    {
      "id": "code-kanban.panel-view",
      "name": "Code Kanban",
      "when": "config.code-kanban.activity-bar-mode == 'panel'",
      "type": "webview"
    }
  ]
}
```

2. **Delete the `menus` block** (the "+ New" header button no longer exists; "+" lives inside the webview):

```jsonc
// DELETE THIS WHOLE KEY:
"menus": {
  "view/title": [
    {
      "command": "code-kanban.new",
      "when": "view == code-kanban.panel-view",
      "group": "navigation"
    }
  ]
},
```

3. **Update `enumDescriptions` for `code-kanban.activity-bar-mode`**:

```jsonc
"code-kanban.activity-bar-mode": {
  "title": "Activity Bar Mode",
  "type": "string",
  "default": "shortcut",
  "enum": ["shortcut", "panel"],
  "enumDescriptions": [
    "Activity-bar icon toggles .todo.kanban open/closed in the main editor (no sidebar shown).",
    "Activity-bar icon opens a sidebar rendering the vertical compact board."
  ],
  "description": "Controls how the activity-bar icon behaves."
},
```

4. **Add three new settings inside `configuration.properties`** (just after `code-kanban.default-lists`):

```jsonc
"code-kanban.sidebar.show-labels": {
  "title": "Sidebar Show Labels",
  "type": "boolean",
  "default": true,
  "description": "Show card labels as pills in the panel-mode sidebar."
},
"code-kanban.sidebar.show-due-date": {
  "title": "Sidebar Show Due Date",
  "type": "boolean",
  "default": true,
  "description": "Show card due date in the panel-mode sidebar."
},
"code-kanban.sidebar.show-checkbox-count": {
  "title": "Sidebar Show Checkbox Count",
  "type": "boolean",
  "default": true,
  "description": "Show card checkbox count (e.g. 3/5) in the panel-mode sidebar."
}
```

- [ ] **Step 2: Verify the manifest parses**

Run: `node -e "JSON.parse(require('node:fs').readFileSync('package.json','utf8')); console.log('OK')"`
Expected: `OK`.

Run: `npm run build 2>&1 | tail -3`
Expected: compiles with only the pre-existing 3 bundle-size warnings.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "feat(package): switch sidebar views to webview, add sidebar.* display settings"
```

---

## Task 3: Extract `webviewHtml` helper

**Files:**
- Create: `src/webviewHtml.ts`
- Modify: `src/kanbanEditor.ts`

- [ ] **Step 1: Create `src/webviewHtml.ts`**

```typescript
import * as vscode from 'vscode';

export type WebviewMode = 'editor' | 'sidebar';

export type WebviewSettings = {
  mode: WebviewMode;
  showDescription: boolean;
  showTaskList: boolean;
  sidebarShowLabels: boolean;
  sidebarShowDueDate: boolean;
  sidebarShowCheckboxCount: boolean;
  collapsedLists: Record<string, boolean>;
};

export function buildWebviewHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  settings: WebviewSettings
): string {
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'kanban.js'));
  const theme =
    vscode.workspace.getConfiguration().get<'dark' | 'light' | 'system' | undefined>('code-kanban.theme') ??
    'system';
  const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'assets', 'css', 'main.css'));
  const themeFilename = theme === 'dark' ? 'dark.css' : theme === 'light' ? 'light.css' : 'system.css';
  const themeUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'assets', 'css', themeFilename));
  const nonce = crypto.randomUUID();

  const settingsJson = JSON.stringify({
    showDescription: settings.showDescription,
    showTaskList: settings.showTaskList,
    sidebarShowLabels: settings.sidebarShowLabels,
    sidebarShowDueDate: settings.sidebarShowDueDate,
    sidebarShowCheckboxCount: settings.sidebarShowCheckboxCount,
    collapsedLists: settings.collapsedLists,
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: ${webview.cspSource}; style-src 'unsafe-inline' https://fonts.googleapis.com ${webview.cspSource}; font-src https://fonts.gstatic.com; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;800&display=swap" rel="stylesheet">
  <title>Code Kanban</title>
  <link rel="stylesheet" nonce="${nonce}" href="${cssUri.toString()}">
  <link rel="stylesheet" nonce="${nonce}" href="${themeUri.toString()}">
</head>
<body>
  <script nonce="${nonce}">
    window.codeKanbanMode = ${JSON.stringify(settings.mode)};
    window.settings = ${settingsJson};
  </script>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri.toString()}"></script>
</body>
</html>`;
}

export function readSidebarSettings(): {
  showDescription: boolean;
  showTaskList: boolean;
  sidebarShowLabels: boolean;
  sidebarShowDueDate: boolean;
  sidebarShowCheckboxCount: boolean;
} {
  const config = vscode.workspace.getConfiguration();
  return {
    showDescription: config.get<boolean>('code-kanban.show-description') ?? true,
    showTaskList: config.get<boolean>('code-kanban.show-task-list') ?? true,
    sidebarShowLabels: config.get<boolean>('code-kanban.sidebar.show-labels') ?? true,
    sidebarShowDueDate: config.get<boolean>('code-kanban.sidebar.show-due-date') ?? true,
    sidebarShowCheckboxCount: config.get<boolean>('code-kanban.sidebar.show-checkbox-count') ?? true,
  };
}
```

- [ ] **Step 2: Refactor `src/kanbanEditor.ts` to use the helper**

In `src/kanbanEditor.ts`, replace the entire `getHtmlForWebview` method body so it delegates to `buildWebviewHtml`. Also remove the unused theme/css local variables from this file.

Replace lines 80-124 (the whole `getHtmlForWebview` method, from `private getHtmlForWebview` to its closing `}`) with:

```typescript
  private getHtmlForWebview(webview: vscode.Webview): string {
    const sidebarSettings = readSidebarSettings();
    return buildWebviewHtml(webview, this.context.extensionUri, {
      mode: 'editor',
      ...sidebarSettings,
      collapsedLists: {},
    });
  }
```

Add the import at the top of `src/kanbanEditor.ts`:

```typescript
import { buildWebviewHtml, readSidebarSettings } from './webviewHtml';
```

- [ ] **Step 3: Verify build and tests**

Run: `npm run build 2>&1 | tail -3`
Expected: compiles with only pre-existing warnings.

Run: `npx vitest run`
Expected: 12/12 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/webviewHtml.ts src/kanbanEditor.ts
git commit -m "refactor: extract buildWebviewHtml helper for reuse by sidebar view"
```

---

## Task 4: `ShortcutBounceView` (mode shortcut, 1-click toggle)

**Files:**
- Create: `src/shortcutBounceView.ts`
- Modify: `src/extension.ts`

- [ ] **Step 1: Create `src/shortcutBounceView.ts`**

```typescript
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
```

- [ ] **Step 2: Register in `src/extension.ts`**

Add this import at the top:
```typescript
import { ShortcutBounceViewProvider } from './shortcutBounceView';
```

Inside `activate()`, after the commands push, add:
```typescript
const shortcutBounceProvider = new ShortcutBounceViewProvider();
context.subscriptions.push(
  vscode.window.registerWebviewViewProvider('code-kanban.shortcut-view', shortcutBounceProvider)
);
```

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | tail -3`
Expected: compiles, no errors.

- [ ] **Step 4: Manual smoke (dev host)**

(Skip — Task 10 covers full manual verification.)

- [ ] **Step 5: Commit**

```bash
git add src/shortcutBounceView.ts src/extension.ts
git commit -m "feat: shortcut bounce view — 1-click toggle that auto-closes the sidebar"
```

---

## Task 5: React app — route + mode awareness

**Files:**
- Modify: `src/kanban/App.tsx`
- Modify: `src/kanban/index.tsx` (only if needed for the navigation; can stay as-is)

- [ ] **Step 1: Edit `src/kanban/App.tsx`**

Replace the `useEffect` that runs `navigate('/')` so it routes based on `window.codeKanbanMode`. Also add the new `/sidebar` route.

Find this block (the initial useEffect at lines ~22-50):
```typescript
  React.useEffect(() => {
    const onMessage = async (error: MessageEvent<{ type: 'update'; text: string; title: string }>) => {
      const message = error.data;
      switch (message.type) {
        case 'update': {
          const k = await fromJson(message.text);
          setTitle(message.title);
          setIsLoadingFromFile(true);
          setKanban(k);
          setIsLoadingFromFile(false);
        }
      }
    };

    window.addEventListener('message', onMessage);
    navigate('/');
    vscode.postMessage({
      type: 'load',
    });
    return () => {
      window.removeEventListener('message', onMessage);
    };
  }, []);
```

Replace `navigate('/')` with:
```typescript
    const mode = (window as unknown as { codeKanbanMode?: string }).codeKanbanMode ?? 'editor';
    navigate(mode === 'sidebar' ? '/sidebar' : '/');
```

Find the `<Routes>` block (near the end of the component) and add the `/sidebar` route:
```typescript
      <Routes location={state?.backgroundLocation ?? location}>
        <Route path="/" element={<Board />} />
        <Route path="/sidebar" element={<SidebarBoard />} />
      </Routes>
```

Add the import at the top of the file:
```typescript
import { SidebarBoard } from './pages/SidebarBoard';
```

- [ ] **Step 2: Create stub `src/kanban/pages/SidebarBoard.tsx` (full impl in Task 6-8)**

```typescript
import * as React from 'react';

export const SidebarBoard = () => {
  return <div style={{ padding: '16px', color: 'var(--main-color)' }}>SidebarBoard placeholder</div>;
};
```

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | tail -3`
Expected: compiles, no errors.

- [ ] **Step 4: Commit**

```bash
git add src/kanban/App.tsx src/kanban/pages/SidebarBoard.tsx
git commit -m "feat(react): route to /sidebar when mode is 'sidebar' (with placeholder page)"
```

---

## Task 6: `SidebarCard` component

**Files:**
- Create: `src/kanban/components/SidebarCard.tsx`

- [ ] **Step 1: Create the component**

```typescript
import * as React from 'react';
import { styled } from 'styled-components';
import { type Card } from '../models/kanban';

const Container = styled.div<{ $selected: boolean }>`
  background-color: var(--card-background-color);
  border: 1px solid ${(p) => (p.$selected ? 'var(--main-color)' : 'transparent')};
  border-radius: 4px;
  padding: 8px;
  margin-bottom: 6px;
  cursor: grab;
  font-size: 0.85rem;
`;

const Title = styled.div`
  color: var(--main-color);
  font-weight: 600;
  margin-bottom: 4px;
  word-break: break-word;
`;

const Description = styled.div`
  color: var(--secondary-text-color);
  font-size: 0.75rem;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Labels = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
`;

const LabelPill = styled.span<{ $color: string }>`
  background-color: ${(p) => p.$color};
  color: white;
  border-radius: 8px;
  font-size: 0.7rem;
  padding: 1px 6px;
`;

const Footer = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 4px;
  font-size: 0.7rem;
  color: var(--secondary-text-color);
`;

type Settings = {
  showDescription: boolean;
  showLabels: boolean;
  showDueDate: boolean;
  showCheckboxCount: boolean;
};

type Props = {
  card: Card;
  selected: boolean;
  settings: Settings;
  onClick: () => void;
};

export const SidebarCard = ({ card, selected, settings, onClick }: Props) => {
  const firstLine = card.description?.split('\n')[0] ?? '';
  const totalChecks = card.checkboxes.length;
  const checkedChecks = card.checkboxes.filter((c) => c.checked).length;
  const dueDateLabel = card.dueDate ? new Date(card.dueDate).toLocaleDateString() : undefined;

  return (
    <Container $selected={selected} onClick={onClick}>
      <Title>{card.title}</Title>
      {settings.showDescription && firstLine && <Description>{firstLine}</Description>}
      {settings.showLabels && card.labels.length > 0 && (
        <Labels>
          {card.labels.map((l) => (
            <LabelPill key={l.id} $color={l.color}>
              {l.title}
            </LabelPill>
          ))}
        </Labels>
      )}
      {(settings.showDueDate && dueDateLabel) || (settings.showCheckboxCount && totalChecks > 0) ? (
        <Footer>
          {settings.showDueDate && dueDateLabel && <span>📅 {dueDateLabel}</span>}
          {settings.showCheckboxCount && totalChecks > 0 && (
            <span>
              ☑ {checkedChecks}/{totalChecks}
            </span>
          )}
        </Footer>
      ) : null}
    </Container>
  );
};
```

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | tail -3`
Expected: compiles, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/kanban/components/SidebarCard.tsx
git commit -m "feat(react): SidebarCard component with configurable density"
```

---

## Task 7: `SidebarList` component

**Files:**
- Create: `src/kanban/components/SidebarList.tsx`

- [ ] **Step 1: Create the component**

```typescript
import * as React from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import { styled } from 'styled-components';
import { type List, type Card } from '../models/kanban';
import { SidebarCard } from './SidebarCard';
import { Input } from './shared/Input';

const Container = styled.div`
  background-color: var(--list-background-color);
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 10px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  margin-bottom: 6px;
`;

const Title = styled.div`
  font-weight: 700;
  color: var(--main-color);
  font-size: 0.95rem;
`;

const Count = styled.span`
  color: var(--secondary-text-color);
  margin-left: 6px;
  font-weight: 400;
`;

const Toggle = styled.span`
  color: var(--secondary-text-color);
  user-select: none;
`;

const Cards = styled.div`
  min-height: 8px;
`;

const AddRow = styled.div`
  margin-top: 4px;
`;

const AddButton = styled.button`
  width: 100%;
  background: transparent;
  border: 1px dashed var(--secondary-text-color);
  border-radius: 4px;
  padding: 4px;
  cursor: pointer;
  color: var(--secondary-text-color);
  font-size: 0.8rem;
  &:hover {
    background-color: var(--card-background-color);
  }
`;

type CardSettings = {
  showDescription: boolean;
  showLabels: boolean;
  showDueDate: boolean;
  showCheckboxCount: boolean;
};

type Props = {
  list: List;
  collapsed: boolean;
  onToggleCollapse: () => void;
  cardSettings: CardSettings;
  selectedCardId: string | undefined;
  onSelectCard: (id: string) => void;
  onAddCard: (title: string) => void;
};

export const SidebarList = ({
  list,
  collapsed,
  onToggleCollapse,
  cardSettings,
  selectedCardId,
  onSelectCard,
  onAddCard,
}: Props) => {
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState('');

  const submit = () => {
    if (draft.trim().length > 0) {
      onAddCard(draft.trim());
    }

    setDraft('');
    setAdding(false);
  };

  return (
    <Container>
      <Header onClick={onToggleCollapse}>
        <Title>
          {list.title}
          <Count>({list.cards.length})</Count>
        </Title>
        <Toggle>{collapsed ? '▸' : '▾'}</Toggle>
      </Header>
      {!collapsed && (
        <>
          <Droppable droppableId={list.id} type="cards">
            {(provided) => (
              <Cards {...provided.droppableProps} ref={provided.innerRef}>
                {list.cards.map((c: Card, index: number) => (
                  <Draggable key={c.id} draggableId={c.id} index={index}>
                    {(p) => (
                      <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}>
                        <SidebarCard
                          card={c}
                          selected={c.id === selectedCardId}
                          settings={cardSettings}
                          onClick={() => {
                            onSelectCard(c.id);
                          }}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </Cards>
            )}
          </Droppable>
          <AddRow>
            {adding ? (
              <Input
                autoFocus
                value={draft}
                placeholder="Card title…"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setDraft(e.target.value);
                }}
                onBlur={submit}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') submit();
                  if (e.key === 'Escape') {
                    setDraft('');
                    setAdding(false);
                  }
                }}
              />
            ) : (
              <AddButton
                onClick={() => {
                  setAdding(true);
                }}
              >
                + Add card
              </AddButton>
            )}
          </AddRow>
        </>
      )}
    </Container>
  );
};
```

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | tail -3`
Expected: compiles, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/kanban/components/SidebarList.tsx
git commit -m "feat(react): SidebarList component (collapsible, droppable, +Add card)"
```

---

## Task 8: `SidebarBoard` page (replace placeholder)

**Files:**
- Modify: `src/kanban/pages/SidebarBoard.tsx`

- [ ] **Step 1: Replace the placeholder with the real layout**

```typescript
import * as React from 'react';
import { DragDropContext, type DropResult } from 'react-beautiful-dnd';
import { styled } from 'styled-components';
import { SidebarList } from '../components/SidebarList';
import { type Card } from '../models/kanban';
import { selectors, kanbanActions, actions } from '../store';
import { vscode } from '../../vscode';
import { uuid } from '../utils';

const Container = styled.div`
  padding: 8px;
  background-color: var(--main-background-color);
  height: 100vh;
  overflow-y: auto;
  box-sizing: border-box;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: var(--secondary-text-color);
`;

const CreateButton = styled.button`
  background-color: var(--main-color);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 14px;
  cursor: pointer;
  font-weight: 600;
  &:hover {
    opacity: 0.85;
  }
`;

type Settings = {
  showDescription: boolean;
  sidebarShowLabels: boolean;
  sidebarShowDueDate: boolean;
  sidebarShowCheckboxCount: boolean;
  collapsedLists: Record<string, boolean>;
};

const getSettings = (): Settings => {
  const w = window as unknown as { settings?: Settings };
  return {
    showDescription: w.settings?.showDescription ?? true,
    sidebarShowLabels: w.settings?.sidebarShowLabels ?? true,
    sidebarShowDueDate: w.settings?.sidebarShowDueDate ?? true,
    sidebarShowCheckboxCount: w.settings?.sidebarShowCheckboxCount ?? true,
    collapsedLists: w.settings?.collapsedLists ?? {},
  };
};

export const SidebarBoard = () => {
  const kanban = selectors.useKanban();
  const lists = selectors.useLists();
  const moveCard = kanbanActions.useMoveCard();
  const moveCardAcrossList = kanbanActions.useMoveCardAcrossList();
  const addCards = kanbanActions.useAddCards();
  const initialSettings = React.useMemo(getSettings, []);
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>(initialSettings.collapsedLists);
  const [selectedCardId, setSelectedCardId] = React.useState<string | undefined>(undefined);

  const cardSettings = React.useMemo(
    () => ({
      showDescription: initialSettings.showDescription,
      showLabels: initialSettings.sidebarShowLabels,
      showDueDate: initialSettings.sidebarShowDueDate,
      showCheckboxCount: initialSettings.sidebarShowCheckboxCount,
    }),
    [initialSettings]
  );

  const onDragEnd = (result: DropResult) => {
    if (!result.destination || !kanban) return;
    if (result.type !== 'cards') return;
    if (result.source.droppableId === result.destination.droppableId) {
      moveCard(result.source.droppableId, result.source.index, result.destination.index);
    } else {
      moveCardAcrossList(
        result.source.droppableId,
        result.source.index,
        result.destination.droppableId,
        result.destination.index
      );
    }
  };

  const toggleCollapse = (listId: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [listId]: !prev[listId] };
      vscode.postMessage({ type: 'set-collapse-state', collapsedLists: next });
      return next;
    });
  };

  if (!kanban) {
    return (
      <Container>
        <EmptyState>
          <div>No kanban yet.</div>
          <CreateButton
            onClick={() => {
              vscode.postMessage({ type: 'create-todo-kanban' });
            }}
          >
            Create todo kanban
          </CreateButton>
        </EmptyState>
      </Container>
    );
  }

  return (
    <Container>
      <DragDropContext onDragEnd={onDragEnd}>
        {lists.map((l) => (
          <SidebarList
            key={l.id}
            list={l}
            collapsed={Boolean(collapsed[l.id])}
            onToggleCollapse={() => {
              toggleCollapse(l.id);
            }}
            cardSettings={cardSettings}
            selectedCardId={selectedCardId}
            onSelectCard={setSelectedCardId}
            onAddCard={(title: string) => {
              const newCard: Card = {
                id: uuid(),
                listId: l.id,
                title,
                description: '',
                dueDate: undefined,
                labels: [],
                checkboxes: [],
                comments: [],
              };
              addCards(l.id, [newCard]);
            }}
          />
        ))}
      </DragDropContext>
    </Container>
  );
};
```

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | tail -3`
Expected: compiles, no errors. (If `kanbanActions.useAddCards` doesn't exist with that signature, adapt — see `src/kanban/store.ts` for the actual name.)

If it fails, check `src/kanban/store.ts` for the correct add-card action name and fix the call accordingly.

- [ ] **Step 3: Commit**

```bash
git add src/kanban/pages/SidebarBoard.tsx
git commit -m "feat(react): SidebarBoard vertical layout with drag, add, collapse, empty state"
```

---

## Task 9: `PanelBoardView` (panel-mode WebviewViewProvider)

**Files:**
- Create: `src/panelBoardView.ts`
- Modify: `src/extension.ts`

- [ ] **Step 1: Create `src/panelBoardView.ts`**

```typescript
import { Buffer } from 'node:buffer';
import * as vscode from 'vscode';
import { buildInitialKanban } from './buildInitialKanban';
import { ensureGitignoreEntry } from './ensureGitignoreEntry';
import { buildWebviewHtml, readSidebarSettings } from './webviewHtml';

const TARGET_FILENAME = '.todo.kanban';
const COLLAPSE_KEY = 'code-kanban.sidebar.collapsed-lists';

export class PanelBoardViewProvider implements vscode.WebviewViewProvider {
  private currentView: vscode.WebviewView | undefined;

  constructor(
    private readonly context: vscode.ExtensionContext,
    watcher: vscode.FileSystemWatcher
  ) {
    watcher.onDidChange((uri) => {
      void this.onFileEvent(uri);
    });
    watcher.onDidCreate((uri) => {
      void this.onFileEvent(uri);
    });
    watcher.onDidDelete((uri) => {
      void this.onFileEvent(uri);
    });
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    this.currentView = view;
    view.webview.options = { enableScripts: true, localResourceRoots: [this.context.extensionUri] };

    const collapsed =
      this.context.workspaceState.get<Record<string, boolean>>(COLLAPSE_KEY) ?? {};
    const settings = readSidebarSettings();

    view.webview.html = buildWebviewHtml(view.webview, this.context.extensionUri, {
      mode: 'sidebar',
      ...settings,
      collapsedLists: collapsed,
    });

    view.webview.onDidReceiveMessage(async (msg: { type: string; [k: string]: unknown }) => {
      switch (msg.type) {
        case 'load':
        case 'reload': {
          await this.sendUpdate();
          break;
        }

        case 'edit': {
          await this.persistEdit(msg.kanban as unknown);
          break;
        }

        case 'set-collapse-state': {
          await this.context.workspaceState.update(COLLAPSE_KEY, msg.collapsedLists);
          break;
        }

        case 'create-todo-kanban': {
          await this.runAutoCreationFlow();
          break;
        }

        case 'open': {
          await vscode.env.openExternal(vscode.Uri.parse(msg.url as string));
          break;
        }

        case 'info-message': {
          await vscode.window.showInformationMessage(msg.message as string);
          break;
        }
      }
    });
  }

  private async onFileEvent(uri: vscode.Uri): Promise<void> {
    if (!uri.path.endsWith(`/${TARGET_FILENAME}`)) return;
    await this.sendUpdate();
  }

  private async sendUpdate(): Promise<void> {
    const view = this.currentView;
    if (!view) return;
    const root = vscode.workspace.workspaceFolders?.[0];
    if (!root) {
      await view.webview.postMessage({ type: 'update', text: '', title: '' });
      return;
    }

    const target = vscode.Uri.joinPath(root.uri, TARGET_FILENAME);
    try {
      const bytes = await vscode.workspace.fs.readFile(target);
      await view.webview.postMessage({
        type: 'update',
        text: Buffer.from(bytes).toString('utf8'),
        title: TARGET_FILENAME.replace('.kanban', ''),
      });
    } catch {
      await view.webview.postMessage({ type: 'update', text: '', title: '' });
    }
  }

  private async persistEdit(kanban: unknown): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0];
    if (!root) return;
    const target = vscode.Uri.joinPath(root.uri, TARGET_FILENAME);
    const payload = Buffer.from(JSON.stringify(kanban, null, 2), 'utf8');
    await vscode.workspace.fs.writeFile(target, payload);
  }

  private async runAutoCreationFlow(): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0];
    if (!root) {
      await vscode.window.showWarningMessage('Open a folder or workspace to use Code Kanban.');
      return;
    }

    const choice = await vscode.window.showInformationMessage(
      'No kanban found in this workspace. Create .todo.kanban at the root?',
      { modal: true },
      'Create and add to .gitignore',
      'Create only'
    );
    if (choice === undefined) return;

    const defaultLists =
      vscode.workspace.getConfiguration().get<string[]>('code-kanban.default-lists') ?? [];
    const initialKanban = buildInitialKanban(defaultLists);
    const target = vscode.Uri.joinPath(root.uri, TARGET_FILENAME);
    await vscode.workspace.fs.writeFile(
      target,
      Buffer.from(JSON.stringify(initialKanban, null, 2), 'utf8')
    );

    if (choice === 'Create and add to .gitignore') {
      await ensureGitignoreEntry(root.uri.fsPath, '*.kanban');
    }

    await this.sendUpdate();
  }
}
```

- [ ] **Step 2: Register in `src/extension.ts`**

Add imports at the top:
```typescript
import { PanelBoardViewProvider } from './panelBoardView';
```

Inside `activate()`, after the `shortcutBounceProvider` registration, add:
```typescript
const kanbanWatcher = vscode.workspace.createFileSystemWatcher('**/*.kanban');
const panelBoardProvider = new PanelBoardViewProvider(context, kanbanWatcher);
context.subscriptions.push(
  kanbanWatcher,
  vscode.window.registerWebviewViewProvider('code-kanban.panel-view', panelBoardProvider)
);
```

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | tail -3`
Expected: compiles.

- [ ] **Step 4: Commit**

```bash
git add src/panelBoardView.ts src/extension.ts
git commit -m "feat: PanelBoardView — webview-view hosting the sidebar React app"
```

---

## Task 10: End-to-end manual smoke + final fixes

**Files:** none (verification only, unless fixes needed)

- [ ] **Step 1: Full build + tests green**

Run: `npm run build 2>&1 | tail -3 && npx vitest run 2>&1 | tail -5`
Expected: compiles with only the 3 pre-existing warnings; 12/12 tests pass.

- [ ] **Step 2: Launch dev host (F5 in VSCode)**

Then perform these scenarios in the dev host window:

**Shortcut mode (default):**
1. Open `/home/marc/Dev/tmpdev` as folder.
2. Delete `.todo.kanban` if it exists (so we test from clean).
3. Click the Code Kanban icon in the activity bar. Expect: modal "No kanban found…" appears, click "Create and add to .gitignore". File created, opens in main editor. **Sidebar must be closed** (Explorer/etc not visible).
4. Click the icon again. Expect: tab closes. Sidebar still closed.
5. Click again. Expect: tab opens. Sidebar still closed.
6. Press `Ctrl+Alt+K`. Expect: same toggle behavior.

**Panel mode:**
7. Settings → set `code-kanban.activity-bar-mode` to `panel`.
8. Click the icon. Expect: sidebar opens with "Code Kanban" header and the vertical board (Backlog/To Do/Doing/Done rectangles).
9. Click "+ Add card" inside Backlog. Type "Buy milk" + Enter. Expect: card appears in Backlog.
10. Drag the card down to To Do. Expect: it moves. Open `.todo.kanban` at terminal — verify the JSON reflects the move.
11. Click ▾ next to Done. Expect: list collapses. Reload window (Ctrl+Shift+P → Developer: Reload Window). Expect: Done is still collapsed (workspaceState persistence).
12. Open the same `.todo.kanban` in the main editor as well (Ctrl+Alt+K — wait, mode is panel now; use File > Open). With both views open, drag a card in the main editor. Expect: sidebar updates (FS watcher).
13. Click a card in the sidebar. Expect: it gets a highlight border (selection). Nothing else.

**Empty workspace:**
14. Delete `.todo.kanban`. Click the icon (still panel mode). Expect: sidebar shows "No kanban yet" + "Create todo kanban" button. Click it. Expect: same modal flow.

**Settings:**
15. Set `code-kanban.sidebar.show-labels` to false. Reload window. Expect: label pills no longer show on cards.

- [ ] **Step 3: Fix any bugs found**

If a scenario fails, fix in-place (don't add new tasks unless major). Commit each fix with a descriptive message.

- [ ] **Step 4: Final stray-reference grep**

Run: `grep -rn "shortcutSidebarProvider\|panelSidebarProvider" --include="*.ts" --include="*.json" . 2>/dev/null | grep -v node_modules | grep -v dist/`
Expected: no matches (the old provider files were deleted and references cleaned up).

- [ ] **Step 5: Final commit if changes were needed**

If any fixes happened during step 3, ensure they're committed.

---

## Out of scope (per spec)

- Inline title/description edit at sidebar (use main editor).
- Archive/delete cards from sidebar (use main editor).
- Reorder lists from sidebar (use main editor).
- Filter/search in sidebar (use main editor).
- Multi-root workspaces.
- Live setting reactivity inside open webview (reload window required to apply changes).

## Notes for the implementing engineer

- The "bounce" pattern in `ShortcutBounceView` is unusual. It works because VSCode always shows a view container when its activity-bar icon is clicked, and `workbench.action.closeSidebar` immediately collapses it. Don't try to skip the webview view registration — VSCode requires at least one view per view-container.
- `kanbanActions.useAddCards` (Task 8) might be named differently in `src/kanban/store.ts`. The plan assumes a sensible name; verify against the file and adapt if needed.
- The `selectors.useKanban()` returns `undefined` when no kanban is loaded — that's the trigger for the empty state in `SidebarBoard`. If it's loaded but with an empty list array, render the columns empty (with the "+ Add card" still available).
- File watcher events fire for `**/*.kanban`. The `PanelBoardView` filters for the exact filename `.todo.kanban`.
- The `'edit'` message from sidebar carries the entire kanban state (same shape as the custom editor protocol). Re-using the existing post-message contract from `App.tsx` is intentional — keeps the React app's message-emit code identical for both modes.
