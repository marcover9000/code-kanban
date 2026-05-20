# Activity bar toggle + configurable defaults

**Date:** 2026-05-21
**Status:** Draft (pending implementation)

## Context

Code Kanban actualment només s'obre a través de fitxers `.kanban` al disc (custom editor sobre el patró `*.kanban`). Fer servir l'extensió per gestionar to-do lists per projecte requereix navegar fins al fitxer cada vegada, o tenir-lo obert i no tancar-lo mai. Falta una manera ràpida d'obrir/tancar el board.

Aquest canvi afegeix:

1. Una **icona a l'activity bar de VSCode** com a punt d'entrada permanent.
2. Un **comportament configurable** per a aquesta icona: o bé un toggle directe del fitxer al main editor (mode `shortcut`), o bé un sidebar amb la llista de boards (mode `panel`, estil Git).
3. **Auto-creació** d'un `.todo.kanban` al root del workspace la primera vegada que es fa servir en un workspace sense kanban, amb opció marcada per defecte d'afegir `*.kanban` al `.gitignore`.
4. **Llistes per defecte configurables** via setting (en lloc del Backlog/To Do/Doing/Done hardcoded actual a `src/extension.ts:22-49`).
5. **Drecera de teclat** per dispar el toggle sense interacció amb el ratolí.

L'objectiu és fer la transició de "fitxer que has d'obrir manualment" a "panell sempre a una pulsació de distància", mantenint l'extensió petita, sense afegir UI nova quan un setting ja basta.

## User-facing behavior

### Icona a l'activity bar

Sempre present quan l'extensió està activa. Logo: el mateix gris+lima del `assets/icon.svg`, adaptat al format monocrom d'activity bar (VSCode aplicarà la regla automàticament; preparem un `media/activity-bar-icon.svg` monocrom).

### Setting `code-kanban.activity-bar-mode`

```jsonc
{
  "code-kanban.activity-bar-mode": "shortcut" | "panel"  // default: "shortcut"
}
```

#### Mode `shortcut` (default)

- Clicar la icona executa el command `code-kanban.toggle`:
  - Si `.todo.kanban` (del root del workspace) **no està obert** com a tab → l'obre al main editor area.
  - Si **ja està obert** → tanca aquella tab.
  - Si **no existeix el fitxer** → entra al flux d'auto-creació (sota).
- No s'obre cap sidebar; l'experiència és un toggle pur d'1 click.
- Tècnica: el view container associat a la icona té un únic webview/tree-view de placeholder que en `resolveWebviewView` / `getChildren` executa `code-kanban.toggle` i deixa el view buit. Es plega sol al recarregar.

#### Mode `panel`

- Clicar la icona obre un **primary sidebar** anomenat "Code Kanban" amb:
  - Botó d'acció "**+ New Kanban**" al header del view.
  - Tree view (`vscode.TreeView`) amb tots els `*.kanban` del workspace (recursivament, exclou `node_modules` i directoris ignorats per Git).
  - Click en un ítem de l'arbre → l'obre al main editor area.
- Sense controls addicionals en aquest scope (no filtres, no archive, no recents).

### Auto-creació + `.gitignore` (primer ús per workspace)

Quan es dispara `code-kanban.toggle` (o "+ New Kanban") i no existeix cap `.kanban` a la convenció (`<root>/.todo.kanban`):

1. **Diàleg modal** amb:
   - Títol: *"No s'ha trobat cap kanban en aquest workspace."*
   - Cos: *"Crear `.todo.kanban` al root del workspace?"*
   - Checkbox marcat per defecte: **[✓] Add `*.kanban` to `.gitignore`**
   - Botons: `Create` / `Cancel`
2. Si `Create`:
   - Es crea el fitxer `<root>/.todo.kanban` amb les llistes per defecte (vegeu setting `default-lists`).
   - Si el checkbox està marcat:
     - Si existeix `.gitignore` al root i no conté `*.kanban`: hi afegim una línia `*.kanban` (precedida d'un comentari `# Code Kanban` si el fitxer no acaba en \n).
     - Si **no existeix `.gitignore`**: el creem amb el contingut `# Code Kanban\n*.kanban\n`.
   - Es obre el fitxer al main editor area.
3. Si `Cancel`: no es fa res.

Nota: el diàleg s'usa amb `vscode.window.showInformationMessage` amb modal i botons custom. Per al checkbox VSCode no té un widget directe a `showInformationMessage`; modelem-ho amb dos botons: `Create + add to gitignore` (primer, recomanat) i `Create only`. L'efecte UX equival a un checkbox marcat per defecte.

### Comportament del command `code-kanban.toggle`

Pseudo:
```
on toggle():
  root = workspaceFolders[0]  // primera carpeta del workspace
  if root is undefined:
    showWarning("Open a folder/workspace first")
    return

  target = path.join(root, ".todo.kanban")

  if not exists(target):
    runAutoCreationFlow(target)  // diàleg modal + create + gitignore
    return

  openTab = findTabWithUri(target)
  if openTab exists:
    closeTab(openTab)
  else:
    openWithCustomEditor(target, "code-kanban.edit")
```

### Setting `code-kanban.default-lists`

```jsonc
{
  "code-kanban.default-lists": ["Backlog", "To Do", "Doing", "Done"]  // default
}
```

- Substitueix l'array hardcoded actual a `src/extension.ts:22-49`.
- En crear un kanban nou (tant des de `code-kanban.toggle` auto-create com des de `code-kanban.new`), genera una list per cada string del array amb un nou UUID i `cards: []`.
- Mínim 1 string, sense màxim explícit. Si l'array està buit, fallback al default hardcoded amb un warning a Output.

### Drecera de teclat

- Command: `code-kanban.toggle`
- Default key binding: `Ctrl+Alt+K` (Linux/Windows) i `Cmd+Alt+K` (Mac).
- Sobreescribible per l'usuari via la UI de Keyboard Shortcuts.
- Registrat a `package.json` → `contributes.keybindings`.

## Implementation outline

### Fitxers nous

- `src/sidebarTreeProvider.ts` — `vscode.TreeDataProvider<KanbanFileItem>` que llista els `*.kanban` del workspace. Es fa servir només quan `activity-bar-mode === "panel"`.
- `media/activity-bar-icon.svg` — versió monocrom (un sol color, p.ex. `currentColor`) del logo per a l'activity bar.

### Fitxers modificats

- `package.json`:
  - `contributes.viewsContainers.activitybar` → afegir entry `code-kanban`.
  - `contributes.views` → afegir view `code-kanban.sidebar` lligat al container.
  - `contributes.commands` → afegir `code-kanban.toggle` i `code-kanban.openFromTree` (intern).
  - `contributes.menus.view/title` → "+ New Kanban" al header del sidebar quan mode panel.
  - `contributes.keybindings` → `Ctrl+Alt+K` / `Cmd+Alt+K` per `code-kanban.toggle`.
  - `contributes.configuration` → 2 settings nous: `activity-bar-mode`, `default-lists`.
- `src/extension.ts`:
  - Registrar `code-kanban.toggle` amb la lògica del pseudo de més amunt.
  - Registrar el sidebar TreeView (sempre, però el seu contingut depèn del mode).
  - Llegir `code-kanban.default-lists` per construir l'`initialKanban` (afegint un helper `buildInitialKanban(titles: string[]): Kanban`).
  - Helper `ensureGitignoreEntry(workspaceRoot, pattern)` per al flux de creació.
- `src/kanbanEditor.ts`: cap canvi (no afecta el render del board).

### Decisió sobre el doble mode

VSCode no permet desvincular l'activity bar icon d'un view container. La icona **sempre** obre/tanca el sidebar. La diferència entre modes es resol amb:
- Mode `shortcut`: el view del sidebar és un `WebviewView` mínim. En `resolveWebviewView` executa `code-kanban.toggle` un sol cop i mostra missatge `"Toggling..."`. Quan el sidebar es torna a clicar, com que ja estaria visible, VSCode el plega — i en re-obrir-lo torna a disparar el toggle. Efecte net: cada click de la icona dispara el toggle.
- Mode `panel`: el view del sidebar és el `TreeView` real amb la llista de kanbans.

Si en la pràctica el truc del WebviewView per al mode shortcut resulta inestable, fallback: el view del mode shortcut és un TreeView amb un sol ítem "▶ Open .todo.kanban" amb `command` enllaçat a `code-kanban.toggle`. 2 clicks en lloc d'1, però bulletproof. Decidim quina via fer servir a l'implementation plan.

## Out of scope

- Multi-root workspaces: usem `workspaceFolders[0]` sempre. Suport multi-root: futur canvi.
- Setting per al nom del fitxer per defecte (`.todo.kanban` és fix de moment).
- Filtres / archive view / recents al sidebar.
- Refresh dinàmic dels settings al webview (canviar `theme` en calent encara requereix reobrir la tab — issue heretat).
- Color/theme/botons customitzables — explicitament fora, els abordem en un canvi posterior.

## Verification

### Funcional manual (a dev host)

1. Workspace **net** (sense `.kanban`):
   - Click activity bar icon → apareix diàleg "Create `.todo.kanban`?".
   - Confirma amb `Create + add to gitignore` → es crea `.todo.kanban`, `.gitignore` conté `*.kanban`, board obert.
   - Click icona altra vegada → tab es tanca.
   - Click icona altra vegada → tab s'obre.
2. Workspace **amb `.todo.kanban` existent**:
   - Click → s'obre.
   - Click → es tanca.
3. **Mode panel** (`code-kanban.activity-bar-mode: "panel"`):
   - Click icona → sidebar amb llista (mostrarà `.todo.kanban`).
   - Click "+ New Kanban" al header → demana nom, crea fitxer, l'obre.
   - Crear `bugs.kanban` manualment al filesystem → apareix al sidebar després de refresh (si suportem fs watcher) o al re-obrir.
4. **Drecera de teclat**: `Ctrl+Alt+K` dispara `code-kanban.toggle` igual que el click.
5. **Setting `default-lists`**: canvia a `["Inbox", "Doing", "Done"]`, crea un kanban nou → té 3 llistes amb aquests títols.
6. **Edge cases**:
   - Sense workspace obert: la icona mostra missatge "Open a folder first" o el botó queda no operatiu.
   - `.gitignore` ja conté `*.kanban`: l'auto-create no duplica la línia.
   - Setting `default-lists: []`: fallback al default amb warning.

### Tests automàtics

- `src/tests/buildInitialKanban.test.ts` — verifica que `buildInitialKanban(titles)` retorna l'estructura correcta i que `[]` fa fallback.
- `src/tests/ensureGitignoreEntry.test.ts` — verifica idempotència (afegir dues vegades no duplica) i creació quan el fitxer no existeix.

### Build

`npm run build` ha de seguir sense errors. `npm test` ha de continuar amb tots els tests passant (4 existents + 2 nous).
