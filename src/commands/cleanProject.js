const vscode = require('vscode');
const path = require('path');

async function cleanProject(treeItem) {
    if (!treeItem || !treeItem.uri) {
        vscode.window.showErrorMessage('No project selected');
        return;
    }

    const projectPath = treeItem.uri.fsPath;
    const projectName = path.basename(projectPath, '.csproj');

    vscode.window.showInformationMessage(`Cleaning ${projectName}...`);

    const terminal = vscode.window.createTerminal(`Clean: ${projectName}`);
    terminal.show();
    // Add pause at the end to wait for any key press before closing
    if (process.platform === 'win32') {
        terminal.sendText(`dotnet clean "${projectPath}"; Write-Host "Press any key to close..."; $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")`);
    } else {
        terminal.sendText(`dotnet clean "${projectPath}"; read -n 1 -s -r -p "Press any key to close..."`);
    }
}

module.exports = { cleanProject };

