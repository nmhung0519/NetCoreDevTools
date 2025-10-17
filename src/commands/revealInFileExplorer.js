const vscode = require('vscode');

async function revealInFileExplorer(treeItem) {
    if (!treeItem || !treeItem.uri) {
        vscode.window.showErrorMessage('No item selected');
        return;
    }

    try {
        // Use VSCode's built-in command to reveal file in OS file explorer
        await vscode.commands.executeCommand('revealFileInOS', treeItem.uri);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to reveal in file explorer: ${error.message}`);
    }
}

module.exports = { revealInFileExplorer };

