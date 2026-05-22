# Activity-bar modes redesign: 1-click shortcut + vertical board sidebar

**Data:** 21/05/2026
**Status:** Draft (pending implementation)
**Supersedes (partially):** `2026-05-21-activity-bar-toggle-and-defaults-design.md` — both the "panel mode" (changed to render the board) and the "shortcut mode" (changed to 1-click toggle without intermediate sidebar UI). Auto-creation / settings / keybinding decisions from the previous spec stay.

## Context

A la branca `feature/activity-bar-toggle`:

- El **mode `panel`** està implementat com a `TreeDataProvider` que llista els `*.kanban` del workspace. L'usuari volia una cosa diferent: renderitzar el board mateix dins del sidebar com a vista vertical compacta.
- El **mode `shortcut`** està implementat com a `TreeDataProvider` amb un sol ítem "Open todo kanban" que en clic dispara `code-kanban.toggle`. Calen 2 clicks (icona + ítem). L'usuari vol que el click directe a la icona executi el toggle, sense passar per cap UI intermedia.

Aquest spec redissenya ambdós modes perquè **un click a la icona sempre faci una acció directa**, depenent del setting:

- `shortcut` (default): click icona → obre/tanca `.todo.kanban` al main editor. Sense sidebar visible.
- `panel`: click icona → obre sidebar amb el board renderitzat com a stack vertical de cards.

Objectiu: que tots dos modes siguin 1-click i pràctics per a rutina diària. Afegir to-dos i moure cards és l'ús principal; la feina rica (editar descripcions, labels, arxivar) segueix al main editor.

## User-facing behavior

### Mode `shortcut` (default)

Comportament:

- Click a la icona de l'activity bar → executa `code-kanban.toggle` (open/close del `.todo.kanban` al main editor) i el sidebar es plega automàticament.
- Sense fitxer al workspace → modal d'auto-creació (igual que el `Ctrl+Alt+K`).
- Sense workspace obert → warning "Open a folder or workspace to use Code Kanban."

Implementació tècnica (cal documentar-la perquè és un patró no obvi):

- Es registra un `WebviewViewProvider` per al view `code-kanban.shortcut-view`.
- A `resolveWebviewView`:
  - Sets a minimal HTML (un sol `<div>Opening Code Kanban…</div>`, mai visible més d'un frame).
  - Dispara `code-kanban.toggle`.
  - Immediatament executa `vscode.commands.executeCommand('workbench.action.closeSidebar')` per plegar el sidebar.
- Es subscriu a `view.onDidChangeVisibility`: cada cop que `view.visible === true`, repeteix el cicle (toggle + closeSidebar).
- Una variable de re-entry guard impedeix toggles dobles si `onDidChangeVisibility` dispara dues vegades.

Tradeoff conegut: `workbench.action.closeSidebar` tanca el primary sidebar **sencer**, no només la nostra view. Si l'usuari tenia Explorer obert al sidebar, també es plegarà. És acceptable perquè el contracte del mode shortcut és "click = obre fitxer al main editor"; si l'usuari vol veure Explorer un altre cop, el reobre manualment.

### Mode `panel`

### Layout

El sidebar (mode `panel`) renderitza les lists del `.todo.kanban` apilades verticalment:

```
+- Code Kanban sidebar ----+
|                          |
| Backlog (2)          [^] |
|   ┌────────────────────┐ |
|   │ Implement login    │ |
|   │ ● backend          │ |
|   └────────────────────┘ |
|   ┌────────────────────┐ |
|   │ Setup CI           │ |
|   └────────────────────┘ |
|   [ + Add card ]         |
|                          |
| To Do (1)            [^] |
|   ...                    |
|                          |
| Doing (0)            [^] |
|                          |
| Done (3)             [v] |
+--------------------------+
```

- **Cada rectangle = una list** del kanban. Header amb títol, comptador entre parèntesis, i toggle collapse/expand `[^]/[v]`.
- **Cards dins del rectangle**: títol sempre visible, més info opcional (vegeu settings).
- **Botó "+ Add card"** al final de cada rectangle expandit obre un input inline; Enter crea la card amb només títol.
- **Estat collapse/expand de cada list es persisteix per workspace** (via `vscode.ExtensionContext.workspaceState`). Es recorda entre reinicis.

### Interaccions

| Acció | Implementació |
|---|---|
| Arrossegar card entre lists | `react-beautiful-dnd` amb direcció vertical. Mou la card a la list de destí. |
| "+" per list → afegir card | Input inline al peu del rectangle; Enter crea la card només amb títol. |
| Clic en una card | Selecció visual (highlight) al sidebar. **No obre res.** Per editar la card, l'usuari obre el main editor (Ctrl+Alt+K o icona) i fa clic a la card allà. |
| Toggle collapse/expand | Click al `[^]/[v]` del header del rectangle plega/desplega les cards. |

### Sense fitxer `.todo.kanban`

Quan el sidebar (mode `panel`) està actiu però no existeix `.todo.kanban` al root del workspace, mostra un missatge breu + botó **"Create todo kanban"** centrat:

```
+- Code Kanban sidebar ----+
|                          |
|   No kanban yet.         |
|                          |
|   [ Create todo kanban ] |
|                          |
+--------------------------+
```

El botó dispara el mateix flow modal d'auto-creació que el command `code-kanban.toggle` (modal amb `Create and add to .gitignore` / `Create only` / `Cancel`). Després de la creació, el sidebar es re-renderitza amb el board vertical.

### Settings nous (3 toggles)

Tots per defecte `true`. Controlen què mostra cada card al sidebar (no afecten el main editor):

```jsonc
"code-kanban.sidebar.show-labels": true,
"code-kanban.sidebar.show-due-date": true,
"code-kanban.sidebar.show-checkbox-count": true
```

A més, **es reaprofiten els existents** quan tenen sentit:
- `code-kanban.show-description`: si està a true, el sidebar mostra la primera línia de la descripció sota el títol.

Si tots els toggles de presentació estan a `false`, cada card queda com una línia amb només títol — vista més densa.

### Sincronia main editor + sidebar

Ambdós views (custom editor al main + webview view al sidebar) llegeixen i escriuen el mateix `.kanban` via missatgeria amb l'extension. Source of truth: el `vscode.TextDocument`. Quan el sidebar fa un canvi, l'extension actualitza el document via `applyEdit` (mateix patró que ja fa servir `KanbanEditorProvider.updateTextDocument` a `src/kanbanEditor.ts:126-137`). El custom editor (si està obert) recarrega via el cicle normal de canvis del document. I al revés.

## Implementation outline

### Substitució dels dos providers existents

- Eliminar `src/shortcutSidebarProvider.ts` (l'actual `TreeDataProvider` amb un sol ítem "Open"). Es reemplaça per un `WebviewViewProvider` amb el truc de auto-close descrit a la secció del mode shortcut.
- Eliminar `src/panelSidebarProvider.ts` (l'actual `TreeDataProvider` amb la llista de fitxers). Es reemplaça per un `WebviewViewProvider` que renderitza el board vertical.
- Eliminar les seves crides `registerTreeDataProvider` a `src/extension.ts`.

### Nou ShortcutBoundceView (mode shortcut)

- Nou fitxer `src/shortcutBounceView.ts` amb una classe `ShortcutBounceViewProvider implements vscode.WebviewViewProvider`.
- HTML mínim: `<!DOCTYPE html><html><body></body></html>`.
- En `resolveWebviewView`:
  - Subscriu `view.onDidChangeVisibility`.
  - Crida helper `bounce()`: estableix `bouncing = true`, executa `code-kanban.toggle`, executa `workbench.action.closeSidebar`, retorna i estableix `bouncing = false`.
  - Crida `bounce()` inicialment (com a primer trigger).
  - A `onDidChangeVisibility`: si `view.visible && !bouncing`, crida `bounce()`.
- Registrat al view container `code-kanban` amb id `code-kanban.shortcut-view` (declarat a package.json amb `"type": "webview"`).

### Nou WebviewViewProvider

- Nou fitxer `src/sidebarBoardView.ts` amb una classe `SidebarBoardViewProvider implements vscode.WebviewViewProvider`.
- En `resolveWebviewView`:
  - Construeix HTML que carrega el mateix `dist/kanban.js` (igual que fa `KanbanEditorProvider.getHtmlForWebview`).
  - Passa per `window.codeKanbanMode = 'sidebar'` (vs `'editor'` per al custom editor) a través de `window.settings`.
  - Passa també els 3 settings nous (`show-labels`, `show-due-date`, `show-checkbox-count`).
- Gestiona missatges del React app via `onDidReceiveMessage` (mateixos tipus que el custom editor: `load`, `edit`, `info-message`, `open`, `reload`).
- Per a la càrrega inicial:
  - Si existeix `<root>/.todo.kanban`: llegeix el seu contingut i envia un missatge `update` al webview amb el JSON.
  - Si no existeix: envia un missatge `no-file` al webview (que pinta el botó "Create todo kanban").
- Per a edits: rep `edit` del webview, escriu al fitxer (o aplica al `TextDocument` si està obert). Si el fitxer no existia (cas crear nou), crea'l primer via el flow modal (re-utilitza el mateix codi que `toggleKanban`).
- Watcher: usa `vscode.workspace.createFileSystemWatcher('**/.todo.kanban')` (o reusa el general `**/*.kanban` ja creat) per re-enviar `update` al webview quan el fitxer canvia externament.

### Canvis al React app

- **Nova ruta `/sidebar`** al router de l'app que renderitza `SidebarBoard`.
- **Nou component `src/kanban/pages/SidebarBoard.tsx`**:
  - Layout vertical: `flex-direction: column` envolupant les lists.
  - Reusa els hooks de Jotai existents (`selectors.useLists`, `kanbanActions.useMoveCardAcrossList`, etc.).
  - DragDropContext amb un únic Droppable global de tipus `cards` direcció vertical, o múltiples Droppables un per list (decisió a l'implementation plan; el patró actual de `Board.tsx` ja té un Droppable per list a `List.tsx`).
- **Nou component `src/kanban/components/SidebarList.tsx`**: rectangle d'una list. Header amb títol + count + toggle collapse. Quan no està collapsed, renderitza les cards + l'input "+". Estat collapsed llegit/escrit a un atom nou que es persisteix via missatgeria a workspaceState.
- **Nou component `src/kanban/components/SidebarCard.tsx`**: card compacta. Renderitza títol + (opcionalment) labels com a píndoles, due date amb iconet, checkbox count `(3/5)`, primera línia de description. Pelletet de selecció visual quan està seleccionada (estat local del SidebarBoard).
- **Routing inicial**: a `src/kanban/index.tsx`, llegir `window.codeKanbanMode`. Si és `'sidebar'`, navegar a `/sidebar` al boot.

### Persistència del collapse state

- Nou tipus de missatge `set-collapse-state` (sidebar → extension) amb payload `{ listId, collapsed }`.
- L'extension guarda a `context.workspaceState` amb key `code-kanban.sidebar.collapsed-lists` un objecte `Record<listId, boolean>`.
- En `resolveWebviewView`, l'extension passa l'estat actual al webview via `window.codeKanbanCollapsed`.

### Package.json

- Tots dos views passen a tipus `webview`:
  ```json
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
  ```
- Renombrar `"name"` del panel view de `"Boards"` a `"Code Kanban"` (ja no llista boards).
- Eliminar el menu `view/title` per al command `code-kanban.new` (el botó "+" ja viu dins el webview per cada list, no al view title).
- Actualitzar les `enumDescriptions` del setting `code-kanban.activity-bar-mode`:
  - shortcut: `"Activity-bar icon toggles .todo.kanban in the main editor area (no sidebar)."`
  - panel: `"Activity-bar icon opens a sidebar rendering the vertical compact board."`
- Afegir 3 nous settings a `contributes.configuration.properties` (`sidebar.show-labels`, `sidebar.show-due-date`, `sidebar.show-checkbox-count`).

## Out of scope

- Reordenar lists des del sidebar (només main editor).
- Esborrar / arxivar cards des del sidebar (només main editor).
- Editar títol / descripció inline al sidebar (només main editor).
- Filter / search dins del sidebar (només main editor).
- Múltiples boards al sidebar (sempre `.todo.kanban` del workspace primer).
- Multi-root workspaces (només `workspaceFolders[0]`, com al spec previ).
- Refresh dinàmic dels settings dins del webview viu (canviar `show-labels` requereix recarregar la finestra, igual que el problema del theme).

## Verification

### Manual (dev host)

1. **Setup**: F5; obre la carpeta de prova `/home/marc/Dev/tmpdev`.
2. **Mode shortcut (default)**:
   - **Sense `.todo.kanban`**: click a la icona → modal d'auto-creació → confirma → `.todo.kanban` es crea i obre al main editor. El sidebar no queda obert.
   - **Amb `.todo.kanban` tancat**: click a la icona → s'obre al main editor. Sidebar no queda obert.
   - **Amb `.todo.kanban` obert**: click a la icona → es tanca la tab. Sidebar no queda obert.
   - `Ctrl+Alt+K` fa el mateix toggle (sense passar per la icona).
3. **Mode panel**: canvia el setting a `panel`.
   - **Sense `.kanban`**: clica la icona del activity bar. Sidebar mostra "No kanban yet" + botó. Click → modal → confirma. Sidebar es re-renderitza amb les 4 lists buides apilades verticalment.
   - **Afegir card**: clica "+" a Backlog. Apareix input. Escriu "Buy milk" + Enter. La card apareix dins Backlog.
   - **Drag**: arrossega "Buy milk" cap a To Do. Es mou. `.todo.kanban` al disc reflecteix el canvi.
   - **Settings**: `code-kanban.sidebar.show-labels` a `false` + reload window → píndoles de labels desapareixen.
   - **Collapse**: collapse "Done". Reload window. "Done" segueix collapsed.
   - **Sync amb main editor**: amb sidebar obert, obre també el `.todo.kanban` al main editor. Mou una card. Verifica que el sidebar reflecteix el canvi (i viceversa).
   - **Card selection**: click a una card del sidebar = només highlight visual, cap altre efecte.
4. **Canvi de mode en calent**: amb el sidebar obert en panel, canvia el setting a `shortcut`. El sidebar es plega; pròxim click a la icona obre el fitxer directament al main editor.

### Tests automàtics

- Nous tests no estrictament necessaris al nivell d'aquest spec — la lògica nova viu majoritàriament a React + missatgeria amb VSCode, que és integració difícil de testejar sense mocks.
- Si afegim helpers pures (p.ex. una funció `serializeCollapseState`), s'afegiran tests vitest.
- Els helpers `buildInitialKanban` i `ensureGitignoreEntry` es continuen testejant tal com estan.

## Risks i mitigations

- **Mode shortcut + closeSidebar**: `workbench.action.closeSidebar` plega el sidebar sencer, no només la view de Code Kanban. Si l'usuari tenia Explorer/Git/etc oberts allà, també desapareixeran. Acceptable perquè el contracte del mode shortcut és que la icona = "obre fitxer al main editor" — l'usuari pot reobrir Explorer manualment. Si en pràctica resulta molest, alternativa per a v2: usar `workbench.action.previousSideBarView` que torna al view anterior abans del nostre — més complex i depèn de l'historial intern de VSCode.
- **Re-entry al `bounce()` del shortcut**: `onDidChangeVisibility` pot disparar dues vegades en un mateix cicle. La variable `bouncing` evita toggles duplicats. Si falla, el simptoma seria que un click obre i tanca el fitxer al mateix moment — fàcil de detectar i corregir.
- **React app routing**: l'app actual usa `react-router-dom` però potser amb una BrowserRouter o HashRouter no clara al sidebar. Verificar a `src/kanban/index.tsx` quin router es fa servir i si el "navega al boot" funciona bé. Si no, fallback: passar el mode com a prop al `<App>` i renderitzar directament `<SidebarBoard>` sense routing.
- **DragDropContext duplicat**: si el main editor i el sidebar estan oberts simultàniament, cada un té el seu propi `DragDropContext` (cada webview és un iframe separat) — no hi ha conflicte real, però comprovar.
- **State sync delay**: si l'usuari arrossega ràpid al sidebar i al main editor alhora, podem tenir race conditions sobre el `TextDocument`. Mitigem fent que tots els edits passin per l'extension i s'apliquin seqüencialment.
- **Persistència del collapse state**: si dos workspaces tenen el mateix `listId` (UUID), no col·lisionen (workspaceState és per-workspace). Si un usuari clona el `.kanban` a un altre workspace, comença amb totes expandides — acceptable.
