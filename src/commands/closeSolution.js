const vscode = require('vscode');

async function closeSolution(solutionExplorerProvider) {
    try {
        // Clear the solution
        solutionExplorerProvider.solutionFile = null;
        solutionExplorerProvider.rootItems = [];
        solutionExplorerProvider.itemsMap.clear();
        solutionExplorerProvider.allFileItems = [];
        solutionExplorerProvider.projectContentsCache.clear();
        
        // Update context to hide solution
        await vscode.commands.executeCommand('setContext', 'netcoreSolutionLoaded', false);
        
        // Refresh the view
        solutionExplorerProvider.refresh();
        
        vscode.window.showInformationMessage('Solution closed');
    } catch (error) {
        vscode.window.showErrorMessage(`Error: ${error.message}`);
    }
}

module.exports = { closeSolution };

