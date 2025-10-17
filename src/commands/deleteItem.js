const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

async function deleteItem(item, solutionExplorerProvider) {
    if (!item) {
        return;
    }

    let itemPath;
    let itemType;
    let displayName;

    if (item.itemType === 'projectFile') {
        if (!item.uri) {
            vscode.window.showErrorMessage('Unable to determine file path');
            return;
        }
        itemPath = item.uri.fsPath;
        itemType = 'file';
        displayName = item.label;
    } else if (item.itemType === 'projectFolder') {
        if (!item.uri) {
            vscode.window.showErrorMessage('Unable to determine folder path');
            return;
        }
        itemPath = item.uri.fsPath;
        itemType = 'folder';
        displayName = item.label;
    } else {
        vscode.window.showErrorMessage('Cannot delete this item');
        return;
    }

    // Confirm deletion
    const confirmMessage = itemType === 'folder' 
        ? `Are you sure you want to delete the folder "${displayName}" and all its contents?`
        : `Are you sure you want to delete the file "${displayName}"?`;
    
    const answer = await vscode.window.showWarningMessage(
        confirmMessage,
        { modal: true },
        'Delete'
    );

    if (answer !== 'Delete') {
        return; // User cancelled
    }

    try {
        if (itemType === 'folder') {
            // Delete folder recursively
            fs.rmSync(itemPath, { recursive: true, force: true });
            vscode.window.showInformationMessage(`Folder "${displayName}" deleted successfully`);
        } else {
            // Delete file
            fs.unlinkSync(itemPath);
            vscode.window.showInformationMessage(`File "${displayName}" deleted successfully`);
        }

        // Refresh the solution explorer
        if (solutionExplorerProvider) {
            // Clear cache for the affected project
            const projectUri = findParentProjectUri(item, solutionExplorerProvider);
            if (projectUri) {
                solutionExplorerProvider.projectContentsCache.delete(projectUri.fsPath);
            }
            solutionExplorerProvider.refresh();
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to delete ${itemType}: ${error.message}`);
    }
}

// Helper function to find parent project URI
function findParentProjectUri(item, solutionExplorerProvider) {
    // For files, we can use the file path to find the project
    if (item.uri) {
        const filePath = item.uri.fsPath;
        for (const [, projectItem] of solutionExplorerProvider.itemsMap) {
            if (projectItem.itemType === 'project' && projectItem.uri) {
                const projectDir = path.dirname(projectItem.uri.fsPath);
                if (filePath.startsWith(projectDir)) {
                    return projectItem.uri;
                }
            }
        }
    }
    
    // For folders, search through all projects
    for (const [, projectItem] of solutionExplorerProvider.itemsMap) {
        if (projectItem.itemType === 'project' && projectItem.uri) {
            return projectItem.uri;
        }
    }
    
    return null;
}

module.exports = { deleteItem };

