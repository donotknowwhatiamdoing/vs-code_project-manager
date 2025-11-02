# Anleitung: Eigene VS Code Extension "Workspace Explorer (Modern)"

## Ziel

Erstelle eine eigene, moderne VS Code-Extension, die alle `.code-workspace`-Dateien aus einem frei wählbaren Ordner in der Seitenleiste anzeigt und per Klick öffnet. Keine Build-Tools nötig, reine JavaScript-Version.

---

## Voraussetzungen

* Node.js installiert (prüfen mit `node -v`)
* Visual Studio Code

---

## Schritt 1 – Projektordner anlegen

```powershell
mkdir A:\VSCode-Workspace-Explorer
cd A:\VSCode-Workspace-Explorer
npm init -y
```

---

## Schritt 2 – package.json ersetzen

Ersetze den Inhalt der erzeugten Datei `package.json` durch:

```json
{
  "name": "workspace-explorer-modern",
  "displayName": "Workspace Explorer (Modern)",
  "description": "Zeigt .code-workspace-Dateien aus einem frei wählbaren Ordner in der Seitenleiste.",
  "version": "0.0.1",
  "publisher": "local",
  "engines": { "vscode": "^1.95.0" },
  "categories": ["Other"],
  "activationEvents": [
    "onStartupFinished",
    "onCommand:workspaceExplorerModern.setBaseFolder",
    "onView:workspaceExplorerModern.view"
  ],
  "main": "./extension.js",
  "contributes": {
    "viewsContainers": {
      "activitybar": [
        {
          "id": "workspaceExplorerModern.container",
          "title": "Workspaces",
          "icon": "resources/icon.svg"
        }
      ]
    },
    "views": {
      "workspaceExplorerModern.container": [
        {
          "id": "workspaceExplorerModern.view",
          "name": "Workspace Explorer"
        }
      ]
    },
    "commands": [
      {
        "command": "workspaceExplorerModern.setBaseFolder",
        "title": "Workspace Explorer: Basisordner festlegen"
      },
      {
        "command": "workspaceExplorerModern.openWorkspace",
        "title": "Workspace Explorer: Workspace öffnen"
      }
    ],
    "configuration": {
      "type": "object",
      "title": "Workspace Explorer (Modern)",
      "properties": {
        "workspaceExplorerModern.baseFolder": {
          "type": "string",
          "default": "",
          "description": "Ordner, in dem .code-workspace-Dateien gesucht werden."
        }
      }
    }
  },
  "scripts": {},
  "license": "MIT"
}
```

---

## Schritt 3 – extension.js anlegen

Erstelle eine Datei `extension.js` mit folgendem Inhalt:

```javascript
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

function activate(context) {
  const tree = new WorkspaceTreeProvider(context);
  const view = vscode.window.createTreeView('workspaceExplorerModern.view', { treeDataProvider: tree });

  context.subscriptions.push(
    view,
    vscode.commands.registerCommand('workspaceExplorerModern.setBaseFolder', async () => {
      const pick = await vscode.window.showOpenDialog({
        canSelectFiles: false, canSelectFolders: true, canSelectMany: false, openLabel: 'Ordner wählen'
      });
      if (!pick || !pick[0]) return;
      const folder = pick[0].fsPath;
      await vscode.workspace.getConfiguration().update(
        'workspaceExplorerModern.baseFolder', folder, vscode.ConfigurationTarget.Global
      );
      vscode.window.showInformationMessage(`Basisordner gesetzt: ${folder}`);
      tree.refresh();
    }),
    vscode.commands.registerCommand('workspaceExplorerModern.openWorkspace', async (item) => {
      if (!item || !item.fullPath) return;
      await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(item.fullPath), true);
    })
  );
}

class WorkspaceTreeProvider {
  constructor(context) {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.context = context;
  }
  refresh() { this._onDidChangeTreeData.fire(); }
  getTreeItem(element) { return element; }

  async getChildren() {
    const cfgFolder = vscode.workspace.getConfiguration().get('workspaceExplorerModern.baseFolder') || '';
    if (!cfgFolder) return [this._infoItem('Kein Basisordner gesetzt. Menü: Workspace Explorer → Basisordner festlegen')];
    if (!fs.existsSync(cfgFolder)) return [this._infoItem(`Ordner nicht gefunden: ${cfgFolder}`)];

    let files = [];
    try {
      files = fs.readdirSync(cfgFolder)
        .filter(f => f.toLowerCase().endsWith('.code-workspace'))
        .map(f => path.join(cfgFolder, f));
    } catch (e) {
      return [this._infoItem(`Fehler beim Lesen: ${e.message}`)];
    }

    if (files.length === 0) return [this._infoItem('Keine .code-workspace-Dateien gefunden.')];

    return files.map(fp => {
      const label = path.basename(fp, '.code-workspace');
      const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
      item.command = { command: 'workspaceExplorerModern.openWorkspace', title: 'Öffnen', arguments: [{ fullPath: fp }] };
      item.tooltip = fp;
      item.description = path.basename(fp);
      item.iconPath = new vscode.ThemeIcon('briefcase');
      item.fullPath = fp;
      return item;
    });
  }

  _infoItem(text) {
    const item = new vscode.TreeItem(text, vscode.TreeItemCollapsibleState.None);
    item.iconPath = new vscode.ThemeIcon('info');
    item.contextValue = 'info';
    item.selectable = false;
    return item;
  }
}

function deactivate() {}

module.exports = { activate, deactivate };
```

---

## Schritt 4 – Icon hinzufügen

```powershell
mkdir resources
```

Erstelle die Datei `resources/icon.svg` mit folgendem Inhalt:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <path d="M3 4h8l2 2h8v14H3z"/>
</svg>
```

---

## Schritt 5 – Extension starten

```powershell
code A:\VSCode-Workspace-Explorer
```

In VS Code `F5` drücken → neues Fenster öffnet sich („Extension Development Host“).

1. `Strg+Shift+P` → **Workspace Explorer: Basisordner festlegen**
2. Zielordner z. B. `A:\VSWorkspaces` wählen
3. Deine `.code-workspace`-Dateien erscheinen in der Seitenleiste unter **Workspaces → Workspace Explorer**
4. Klick auf einen Eintrag öffnet den Workspace in einem neuen Fenster

---

## Schritt 6 – Test & Nutzung

* Der Explorer liest nur `.code-workspace`-Dateien, keine Unterordner
* Keine Systemdateien werden verändert
* Entfernen: Ordner löschen genügt

---

## Optional: Erweiterungsideen

* Unterordner rekursiv durchsuchen
* Favoriten speichern
* Anzeige von zuletzt geöffneten Workspaces
* Quick-Open-Kommando via Tastatur
