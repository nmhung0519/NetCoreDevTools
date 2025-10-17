const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

async function newProject(treeItem, solutionExplorerProvider) {
    // Ensure a solution is loaded
    if (!solutionExplorerProvider || !solutionExplorerProvider.solutionFile) {
        vscode.window.showErrorMessage('No solution is loaded. Open a .sln first.');
        return;
    }

    // Offer a few common project templates
    const templates = [
        { label: 'console', description: 'Console App (dotnet new console)' },
        { label: 'classlib', description: 'Class Library (dotnet new classlib)' },
        { label: 'webapi', description: 'ASP.NET Core Web API (dotnet new webapi)' },
        { label: 'mvc', description: 'ASP.NET Core MVC (dotnet new mvc)' }
    ];

    const choice = await vscode.window.showQuickPick(templates.map(t => `${t.label} — ${t.description}`), { placeHolder: 'Select project template' });
    if (!choice) return;
    const template = choice.split(' ')[0];

    // Ask for project name
    const projectName = await vscode.window.showInputBox({ prompt: 'Enter project name', value: template });
    if (!projectName) return;

    // Ask for location (default to solution dir)
    const defaultFolder = path.dirname(solutionExplorerProvider.solutionFile.fsPath);
    const uri = await vscode.window.showOpenDialog({ canSelectFolders: true, defaultUri: vscode.Uri.file(defaultFolder), openLabel: 'Select folder to create project in' });
    if (!uri || uri.length === 0) return;
    const targetDir = uri[0].fsPath;

    // Create a subfolder for the project
    const projectDir = path.join(targetDir, projectName);
    try {
        if (!fs.existsSync(projectDir)) {
            fs.mkdirSync(projectDir, { recursive: true });
        }
    } catch (err) {
        vscode.window.showErrorMessage(`Failed to create project folder: ${err.message}`);
        return;
    }

    // Run dotnet new in an integrated terminal
    const term = vscode.window.createTerminal({ name: `dotnet new ${projectName}` });
    term.show();
    term.sendText(`cd "${projectDir.replace(/"/g, '\\"')}"`);
    term.sendText(`dotnet new ${template} -n "${projectName}"`);
    term.sendText('exit');

    // After creation, try to find the csproj and add to solution file
    // Delay slightly to allow dotnet to create files; user can also add manually if timing differs
    setTimeout(async () => {
        try {
            // Find the first .csproj in the projectDir
            const files = fs.readdirSync(projectDir);
            const csproj = files.find(f => f.endsWith('.csproj'));
            if (csproj) {
                const relativePath = path.relative(path.dirname(solutionExplorerProvider.solutionFile.fsPath), path.join(projectDir, csproj)).replace(/\\/g, '/');
                // Create a GUID placeholder for project in sln
                const projectGuid = generateGuid().toUpperCase();
                const projectTypeGuid = 'FAE04EC0-301F-11D3-BF4B-00C04F79EFBC'; // C# project type
                const projectLine = `Project("{${projectTypeGuid}}") = "${projectName}", "${relativePath}", "{${projectGuid}}"\nEndProject\n`;

                // Append to solution file before Global section
                const slnPath = solutionExplorerProvider.solutionFile.fsPath;
                let slnText = fs.readFileSync(slnPath, 'utf8');
                // Insert before Global (simple heuristic)
                const idx = slnText.lastIndexOf('\nGlobal');
                if (idx !== -1) {
                    slnText = slnText.slice(0, idx) + '\n' + projectLine + slnText.slice(idx);
                } else {
                    slnText += '\n' + projectLine;
                }
                fs.writeFileSync(slnPath, slnText, 'utf8');

                // Refresh provider
                await solutionExplorerProvider.loadSolution(vscode.Uri.file(slnPath));
                vscode.window.showInformationMessage(`Project ${projectName} created and added to solution.`);
            } else {
                vscode.window.showWarningMessage('Project created but .csproj not found automatically. You may need to add it to the solution manually.');
            }
        } catch (err) {
            console.error('Error adding project to solution:', err);
        }
    }, 4000);
}

function generateGuid() {
    // Simple GUID generator
    function s4() { return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1); }
    return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;

}

module.exports = { newProject };
