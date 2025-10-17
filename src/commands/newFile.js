const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

// Simple templates for C# types
const templates = {
    class: (name, ns) => `using System;\n\nnamespace ${ns}\n{\n    public class ${name}\n    {\n    }\n}\n`,
    interface: (name, ns) => `using System;\n\nnamespace ${ns}\n{\n    public interface ${name}\n    {\n    }\n}\n`,
    enum: (name, ns) => `using System;\n\nnamespace ${ns}\n{\n    public enum ${name}\n    {\n    }\n}\n`
};

function ensureValidFilename(name) {
    return name && name.trim().length > 0 && !/[\\/:*?"<>|]/.test(name);
}

async function createFileAt(folderUri, fileName, content) {
    const filePath = path.join(folderUri.fsPath, fileName);
    try {
        // Check for existence
        if (fs.existsSync(filePath)) {
            const overwrite = await vscode.window.showWarningMessage(
                `File ${fileName} already exists. Overwrite?`,
                { modal: true },
                'Yes',
                'No'
            );
            if (overwrite !== 'Yes') return null;
        }

        await vscode.workspace.fs.writeFile(vscode.Uri.file(filePath), Buffer.from(content, 'utf8'));
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
        await vscode.window.showTextDocument(doc);
        return vscode.Uri.file(filePath);
    } catch (err) {
        vscode.window.showErrorMessage(`Failed to create file: ${err.message}`);
        return null;
    }
}

async function promptForName(defaultName = 'NewType') {
    const name = await vscode.window.showInputBox({
        prompt: 'Enter name (without extension)',
        value: defaultName,
        validateInput: (v) => {
            if (!ensureValidFilename(v)) return 'Invalid name';
            return null;
        }
    });
    return name;
}

async function determineNamespace(folderUri) {
    // Try to infer namespace from nearest csproj file or folder structure
    // Fallback to 'MyNamespace'
    try {
        // Search for nearest .csproj upwards
        let dir = folderUri.fsPath;
        while (dir && dir !== path.parse(dir).root) {
            const files = fs.readdirSync(dir);
            const csproj = files.find(f => f.endsWith('.csproj'));
            if (csproj) {
                // Use project name as namespace
                return path.basename(csproj, '.csproj');
            }
            dir = path.dirname(dir);
        }
    } catch (err) {
        // ignore
    }
    return 'MyNamespace';
}

async function newFileHandler(type, treeItem, solutionExplorerProvider) {
    try {
        // Determine target folder URI
        let targetUri = null;
        if (!treeItem) {
            // Ask user to pick a folder
            const uris = await vscode.window.showOpenDialog({ canSelectFiles: false, canSelectFolders: true, canSelectMany: false });
            if (!uris || uris.length === 0) return;
            targetUri = uris[0];
        } else if (treeItem.itemType === 'project') {
            // project.uri is the csproj file - use its directory
            targetUri = vscode.Uri.file(path.dirname(treeItem.uri.fsPath));
        } else if (treeItem.itemType === 'projectFolder' || treeItem.itemType === 'solutionFolder') {
            targetUri = treeItem.resourceUri ? treeItem.resourceUri : treeItem.uri;
        } else if (treeItem.resourceUri) {
            targetUri = treeItem.resourceUri;
        } else if (treeItem.uri) {
            targetUri = treeItem.uri;
        }

        if (!targetUri) {
            vscode.window.showErrorMessage('Could not determine target folder for new file.');
            return;
        }

        // Ensure folder exists and is a folder
        const stat = await vscode.workspace.fs.stat(targetUri);
        if (stat.type !== vscode.FileType.Directory) {
            // If it's a file, use its parent
            targetUri = vscode.Uri.file(path.dirname(targetUri.fsPath));
        }

        // Prompt for name
        const name = await promptForName('New' + (type === 'class' ? 'Class' : type.charAt(0).toUpperCase() + type.slice(1)));
        if (!name) return;

        const ns = await determineNamespace(targetUri);

        if (type === 'custom') {
            const fileName = await vscode.window.showInputBox({ prompt: 'Enter file name with extension (e.g. file.txt)', value: `${name}.cs` });
            if (!fileName) return;
                const newUri = await createFileAt(targetUri, fileName, '// New file');
                // If file created, refresh solution explorer and clear project cache
                if (newUri && solutionExplorerProvider) {
                    try {
                        const projectUri = solutionExplorerProvider.findProjectForFile(newUri.fsPath);
                        if (projectUri) {
                            solutionExplorerProvider.projectContentsCache.delete(projectUri.fsPath);
                        }
                    } catch (err) {
                        // ignore
                    }
                    solutionExplorerProvider.refresh();
                }
                return;
        }

        // Build filename and content for C# types
        const fileName = `${name}.cs`;
        const template = templates[type](name, ns);
        const newUri = await createFileAt(targetUri, fileName, template);
        // If file created, refresh solution explorer and clear project cache
        if (newUri && solutionExplorerProvider) {
            try {
                const projectUri = solutionExplorerProvider.findProjectForFile(newUri.fsPath);
                if (projectUri) {
                    solutionExplorerProvider.projectContentsCache.delete(projectUri.fsPath);
                }
            } catch (err) {
                // ignore
            }
            solutionExplorerProvider.refresh();
        }
    } catch (err) {
        vscode.window.showErrorMessage(`Error creating new file: ${err.message}`);
    }
}

module.exports = {
    newFileHandler
};

