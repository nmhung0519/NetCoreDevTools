const vscode = require('vscode');
const path = require('path');

async function buildProject(treeItem) {
    if (!treeItem || !treeItem.uri) {
        vscode.window.showErrorMessage('No project selected');
        return;
    }

    const projectPath = treeItem.uri.fsPath;
    const projectName = path.basename(projectPath, '.csproj');

    vscode.window.showInformationMessage(`Building ${projectName}...`);

    const terminal = vscode.window.createTerminal(`Build: ${projectName}`);
    terminal.show();
    // Add pause at the end to wait for any key press before closing
    if (process.platform === 'win32') {
        terminal.sendText(`dotnet build "${projectPath}"; Write-Host "Press any key to close..."; $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")`);
    } else {
        terminal.sendText(`dotnet build "${projectPath}"; read -n 1 -s -r -p "Press any key to close..."`);
    }
}

module.exports = { buildProject };

