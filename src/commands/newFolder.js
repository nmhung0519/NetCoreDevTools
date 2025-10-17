const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

async function newFolder(item, solutionExplorerProvider) {
    if (!item) {
        return;
    }

    // Determine the target directory
    let targetDir;
    
    if (item.itemType === 'project') {
        // For project items, get the project directory
        targetDir = path.dirname(item.uri.fsPath);
    } else if (item.itemType === 'projectFolder') {
        // For project folders, the URI now contains the folder path
        if (!item.uri) {
            vscode.window.showErrorMessage('Unable to determine folder path');
            return;
        }
        targetDir = item.uri.fsPath;
    } else {
        vscode.window.showErrorMessage('Cannot create folder here');
        return;
    }

    if (!targetDir) {
        vscode.window.showErrorMessage('Unable to determine target directory');
        return;
    }

    // Prompt user for folder name
    const folderName = await vscode.window.showInputBox({
        prompt: 'Enter folder name',
        placeHolder: 'NewFolder',
        validateInput: (value) => {
            if (!value || value.trim() === '') {
                return 'Folder name cannot be empty';
            }
            if (/[<>:"/\\|?*]/.test(value)) {
                return 'Folder name contains invalid characters';
            }
            return null;
        }
    });

    if (!folderName) {
        return; // User cancelled
    }

    try {
        const newFolderPath = path.join(targetDir, folderName);
        
        // Check if folder already exists
        if (fs.existsSync(newFolderPath)) {
            vscode.window.showErrorMessage(`Folder "${folderName}" already exists`);
            return;
        }

        // Create the folder
        fs.mkdirSync(newFolderPath, { recursive: true });
        
        vscode.window.showInformationMessage(`Folder "${folderName}" created successfully`);
        
        // Refresh the solution explorer
        if (solutionExplorerProvider) {
            // Clear cache for the affected project
            if (item.itemType === 'project') {
                solutionExplorerProvider.projectContentsCache.delete(item.uri.fsPath);
            } else if (item.itemType === 'projectFolder') {
                // Find and clear the parent project cache
                const projectUri = findParentProjectUri(item, solutionExplorerProvider);
                if (projectUri) {
                    solutionExplorerProvider.projectContentsCache.delete(projectUri.fsPath);
                }
            }
            solutionExplorerProvider.refresh();
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to create folder: ${error.message}`);
    }
}

// Helper function to find parent project URI
function findParentProjectUri(item, solutionExplorerProvider) {
    // Search through all items to find which project contains this folder
    for (const [, projectItem] of solutionExplorerProvider.itemsMap) {
        if (projectItem.itemType === 'project' && projectItem.uri) {
            return projectItem.uri;
        }
    }
    return null;
}

module.exports = { newFolder };

