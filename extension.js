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
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Ordner wählen'
      });
      if (!pick || !pick[0]) return;
      const folder = pick[0].fsPath;
      await vscode.workspace.getConfiguration().update(
        'workspaceExplorerModern.baseFolder',
        folder,
        vscode.ConfigurationTarget.Global
      );
      vscode.window.showInformationMessage(`Basisordner gesetzt: ${folder}`);
      tree.refresh();
    }),
    vscode.commands.registerCommand('workspaceExplorerModern.openWorkspace', async (item) => {
      if (!item || !item.fullPath) return;
      await vscode.commands.executeCommand(
        'vscode.openFolder',
        vscode.Uri.file(item.fullPath),
        true
      );
    })
  );
}

class WorkspaceTreeProvider {
  constructor(context) {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.context = context;
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element) {
    return element;
  }

  async getChildren() {
    const cfgFolder = vscode.workspace.getConfiguration().get('workspaceExplorerModern.baseFolder') || '';
    if (!cfgFolder) {
      return [this._infoItem('Kein Basisordner gesetzt. Menü: Workspace Explorer → Basisordner festlegen')];
    }
    if (!fs.existsSync(cfgFolder)) {
      return [this._infoItem(`Ordner nicht gefunden: ${cfgFolder}`)];
    }

    let files = [];
    try {
      files = fs
        .readdirSync(cfgFolder)
        .filter((f) => f.toLowerCase().endsWith('.code-workspace'))
        .map((f) => path.join(cfgFolder, f));
    } catch (e) {
      return [this._infoItem(`Fehler beim Lesen: ${e.message}`)];
    }

    if (files.length === 0) {
      return [this._infoItem('Keine .code-workspace-Dateien gefunden.')];
    }

    return files.map((fp) => {
      const label = path.basename(fp, '.code-workspace');
      const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
      item.command = {
        command: 'workspaceExplorerModern.openWorkspace',
        title: 'Öffnen',
        arguments: [{ fullPath: fp }]
      };
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
