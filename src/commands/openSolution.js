const vscode = require('vscode');
const path = require('path');

async function openSolution(solutionExplorerProvider) {
    try {
        // Find all .sln files in the workspace
        const slnFiles = await vscode.workspace.findFiles('**/*.sln', '**/node_modules/**');

        if (slnFiles.length === 0) {
            vscode.window.showInformationMessage('No .sln files found in the workspace.');
            return;
        }

        let selectedUri = null;
        let selectedName = null;

        // If only one .sln file, open it automatically
        if (slnFiles.length === 1) {
            selectedUri = slnFiles[0];
            selectedName = path.basename(selectedUri.fsPath);
        } else {
            // Create quick pick items with relative paths
            const workspaceFolders = vscode.workspace.workspaceFolders;
            const quickPickItems = slnFiles.map(uri => {
                let displayPath = uri.fsPath;
                
                // Try to get relative path from workspace root
                if (workspaceFolders && workspaceFolders.length > 0) {
                    const workspaceRoot = workspaceFolders[0].uri.fsPath;
                    displayPath = path.relative(workspaceRoot, uri.fsPath);
                }

                return {
                    label: path.basename(uri.fsPath),
                    description: path.dirname(displayPath),
                    detail: uri.fsPath,
                    uri: uri
                };
            });

            // Show quick pick selection
            const selected = await vscode.window.showQuickPick(quickPickItems, {
                placeHolder: 'Select a solution file',
                matchOnDescription: true,
                matchOnDetail: true
            });

            if (selected) {
                selectedUri = selected.uri;
                selectedName = selected.label;
            }
        }

        if (selectedUri) {
            // Open the selected file
            const document = await vscode.workspace.openTextDocument(selectedUri);
            await vscode.window.showTextDocument(document);
            
            // Load solution in the explorer view
            await vscode.commands.executeCommand('setContext', 'netcoreSolutionLoaded', true);
            await solutionExplorerProvider.loadSolution(selectedUri);
            
            vscode.window.showInformationMessage(`Opened solution: ${selectedName}`);
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Error: ${error.message}`);
    }
}

module.exports = { openSolution };

