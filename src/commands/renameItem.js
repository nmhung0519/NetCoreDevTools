const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

async function renameItem(item, solutionExplorerProvider) {
    if (!item) return;

    // Only support renaming files and folders for now
    if (!(item.itemType === 'projectFile' || item.itemType === 'projectFolder')) {
        vscode.window.showErrorMessage('Rename is only supported for files and folders in the Solution Explorer');
        return;
    }

    const oldUri = item.uri;
    if (!oldUri) {
        vscode.window.showErrorMessage("Unable to determine item's path");
        return;
    }

    const oldPath = oldUri.fsPath;
    const oldName = item.label;

    const newName = await vscode.window.showInputBox({
        value: oldName,
        prompt: `Rename ${oldName}`,
        validateInput: (value) => {
            if (!value || value.trim().length === 0) return 'Name cannot be empty';
            if (value.indexOf(path.sep) !== -1 || value.indexOf('/') !== -1) return 'Name cannot contain path separators';
            return null;
        }
    });

    if (!newName || newName === oldName) {
        return; // cancelled or no change
    }

    try {
        const newPath = path.join(path.dirname(oldPath), newName);

        // Prevent overwriting existing file/folder
        if (fs.existsSync(newPath)) {
            vscode.window.showErrorMessage('A file or folder with the target name already exists');
            return;
        }

        fs.renameSync(oldPath, newPath);

        vscode.window.showInformationMessage(`Renamed "${oldName}" to "${newName}"`);

        // Update caches and refresh
        if (solutionExplorerProvider) {
            // Invalidate project cache for the containing project
            const projectUri = findParentProjectUri(item, solutionExplorerProvider);
            if (projectUri) {
                solutionExplorerProvider.projectContentsCache.delete(projectUri.fsPath);
            }

            // Update any cached file item URIs if present
            if (item.itemType === 'projectFile') {
                // update the item's uri and label stored in caches
                item.uri = vscode.Uri.file(newPath);
                item.label = newName;
            } else if (item.itemType === 'projectFolder') {
                item.uri = vscode.Uri.file(newPath);
                item.label = newName;
            }

            solutionExplorerProvider.refresh();
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to rename: ${error.message}`);
    }
}

function findParentProjectUri(item, solutionExplorerProvider) {
    if (item && item.uri) {
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
    // fallback: return first project
    for (const [, projectItem] of solutionExplorerProvider.itemsMap) {
        if (projectItem.itemType === 'project' && projectItem.uri) return projectItem.uri;
    }
    return null;
}

module.exports = { renameItem };
