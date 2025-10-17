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

        // Determine project path for the solution file entry and on-disk folder
        const solutionDir = path.dirname(slnPath);
        let folderRelativePath = folderName; // default
        let folderDiskPath = path.join(solutionDir, folderName);

        // If invoked on an existing solution folder, create as a subfolder under that folder
        let parentGuid = null;
        if (treeItem && treeItem.itemType === 'folder') {
            // parent folder label and GUID
            const parentLabel = treeItem.label;
            parentGuid = treeItem.guid;
            if (parentLabel) {
                // folderRelativePath should be parentLabel/folderName
                folderRelativePath = path.join(parentLabel, folderName).replace(/\\/g, '/');
                folderDiskPath = path.join(solutionDir, parentLabel, folderName);
            }
        }

        const projectLine = `Project("{${folderTypeGuid}}") = "${folderName}", "${folderRelativePath}", "{${folderGuid}}"\nEndProject\n`;

        // Insert before Global
        const idx = slnText.lastIndexOf('\nGlobal');
        if (idx !== -1) {
            slnText = slnText.slice(0, idx) + '\n' + projectLine + slnText.slice(idx);
        } else {
            slnText += '\n' + projectLine;
        }

        // Ensure the NestedProjects section contains mapping if there is a parent
        if (parentGuid) {
            const nestedRegex = /GlobalSection\(NestedProjects\)\s*=\s*preSolution([\s\S]*?)EndGlobalSection/;
            const match = slnText.match(nestedRegex);
            const mappingLine = `\t\t{${folderGuid}} = {${parentGuid}}\n`;
            if (match) {
                // Insert mapping before EndGlobalSection inside the existing section
                const sectionStart = match.index;
                const insertPos = slnText.indexOf('EndGlobalSection', sectionStart);
                slnText = slnText.slice(0, insertPos) + mappingLine + slnText.slice(insertPos);
            } else {
                // No NestedProjects section exists; insert one before the final EndGlobal
                const endGlobalIdx = slnText.lastIndexOf('\nEndGlobal');
                const nestedBlock = `\n\tGlobalSection(NestedProjects) = preSolution\n${mappingLine}\tEndGlobalSection\n`;
                if (endGlobalIdx !== -1) {
                    slnText = slnText.slice(0, endGlobalIdx) + nestedBlock + slnText.slice(endGlobalIdx);
                } else {
                    // As a fallback, append the nested block
                    slnText += nestedBlock;
                }
            }
        }

        // Ensure on-disk folder exists under solution (or under parent folder)
        try {
            if (!fs.existsSync(folderDiskPath)) {
                fs.mkdirSync(folderDiskPath, { recursive: true });
            }
        } catch (err) {
            // ignore disk create errors but still add to sln
            console.error('Failed to create folder on disk:', err);
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
