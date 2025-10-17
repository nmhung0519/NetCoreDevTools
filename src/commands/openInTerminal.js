const vscode = require('vscode');
const path = require('path');

async function openInTerminal(treeItem) {
    if (!treeItem || !treeItem.uri) {
        vscode.window.showErrorMessage('No project selected');
        return;
    }

    const projectPath = treeItem.uri.fsPath;
    const projectDir = path.dirname(projectPath);
    const projectName = path.basename(projectPath, '.csproj');

    const terminal = vscode.window.createTerminal({
        name: `Terminal: ${projectName}`,
        cwd: projectDir
    });
    terminal.show();
    
    vscode.window.showInformationMessage(`Opened terminal in ${projectName} directory`);
}

module.exports = { openInTerminal };

