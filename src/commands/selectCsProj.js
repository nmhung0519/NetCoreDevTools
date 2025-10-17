const vscode = require('vscode');
const path = require('path');

async function selectCsProj() {
    try {
        // Find all .csproj files in the workspace
        const csprojFiles = await vscode.workspace.findFiles('**/*.csproj', '**/node_modules/**');

        if (csprojFiles.length === 0) {
            vscode.window.showInformationMessage('No .csproj files found in the workspace.');
            return;
        }

        // Create quick pick items with relative paths
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const quickPickItems = csprojFiles.map(uri => {
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
            placeHolder: 'Select a .csproj file',
            matchOnDescription: true,
            matchOnDetail: true
        });

        if (selected) {
            // Open the selected file
            const document = await vscode.workspace.openTextDocument(selected.uri);
            await vscode.window.showTextDocument(document);
            
            vscode.window.showInformationMessage(`Selected: ${selected.label}`);
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Error: ${error.message}`);
    }
}

module.exports = { selectCsProj };

