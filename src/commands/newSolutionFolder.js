const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

async function newSolutionFolder(treeItem, solutionExplorerProvider) {
    if (!solutionExplorerProvider || !solutionExplorerProvider.solutionFile) {
        vscode.window.showErrorMessage('No solution is loaded. Open a .sln first.');
        return;
    }

    const folderName = await vscode.window.showInputBox({ prompt: 'Enter solution folder name' });
    if (!folderName) return;

    const slnPath = solutionExplorerProvider.solutionFile.fsPath;
    try {
        let slnText = fs.readFileSync(slnPath, 'utf8');

        // Create a new GUID for the folder
        const folderGuid = generateGuid().toUpperCase();
        const folderTypeGuid = '2150E333-8FDC-42A3-9474-1A3956D46DE8';

        const projectLine = `Project("{${folderTypeGuid}}") = "${folderName}", "${folderName}", "{${folderGuid}}"\nEndProject\n`;

        // Insert before Global
        const idx = slnText.lastIndexOf('\nGlobal');
        if (idx !== -1) {
            slnText = slnText.slice(0, idx) + '\n' + projectLine + slnText.slice(idx);
        } else {
            slnText += '\n' + projectLine;
        }

        // Also add an entry in NestedProjects section to keep it root-level (no parent)
        if (slnText.includes('GlobalSection(NestedProjects)')) {
            // append nothing (folder will be root)
        }

        fs.writeFileSync(slnPath, slnText, 'utf8');

        await solutionExplorerProvider.loadSolution(vscode.Uri.file(slnPath));
        vscode.window.showInformationMessage(`Solution folder '${folderName}' added.`);
    } catch (err) {
        vscode.window.showErrorMessage(`Failed to add solution folder: ${err.message}`);
    }
}

function generateGuid() {
    function s4() { return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1); }
    return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;

}

module.exports = { newSolutionFolder };
