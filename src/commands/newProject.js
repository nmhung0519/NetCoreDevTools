const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const util = require('util');
const child_process = require('child_process');
const exec = util.promisify(child_process.exec);

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

    // Determine location: use solution folder or the clicked solution folder
    const solutionDir = path.dirname(solutionExplorerProvider.solutionFile.fsPath);
    let targetDir = solutionDir;
    try {
        if (treeItem && treeItem.itemType === 'folder' && treeItem.label) {
            // If the command was invoked on a solution folder, create the project inside that folder (under solution dir)
            targetDir = path.join(solutionDir, treeItem.label);
        }
    } catch (err) {
        // fallback to solution dir
        targetDir = solutionDir;
    }

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

    // Try to run dotnet commands programmatically for a robust add to solution
    const slnPath = solutionExplorerProvider.solutionFile.fsPath;
    try {
        // Ensure parent dir exists
        const projectParent = path.dirname(projectDir);
        if (!fs.existsSync(projectParent)) {
            fs.mkdirSync(projectParent, { recursive: true });
        }

        // Run `dotnet new <template> -n <name> -o <projectDir>` to create project in the target folder
        await exec(`dotnet new ${template} -n "${projectName}" -o "${projectDir}"`);

        // Find the created .csproj
        let csprojPath = path.join(projectDir, `${projectName}.csproj`);
        if (!fs.existsSync(csprojPath)) {
            // Fallback: search recursively for first .csproj under projectDir
            const findCsProj = (dir) => {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const e of entries) {
                    const full = path.join(dir, e.name);
                    if (e.isFile() && full.endsWith('.csproj')) return full;
                    if (e.isDirectory()) {
                        const found = findCsProj(full);
                        if (found) return found;
                    }
                }
                return null;
            };
            const found = findCsProj(projectDir);
            if (found) csprojPath = found;
        }

        if (!csprojPath || !fs.existsSync(csprojPath)) {
            throw new Error('.csproj not found after dotnet new');
        }

        // Run `dotnet sln <sln> add <csproj>` to add project to solution
        await exec(`dotnet sln "${slnPath}" add "${csprojPath}"`, { cwd: path.dirname(slnPath) });

        // Refresh provider
        await solutionExplorerProvider.loadSolution(vscode.Uri.file(slnPath));
        vscode.window.showInformationMessage(`Project ${projectName} created and added to solution.`);
    } catch (err) {
        // Fallback to opening an integrated terminal if programmatic exec fails (e.g., dotnet not installed or permission issues)
        console.error('Programmatic dotnet commands failed:', err);
        const term = vscode.window.createTerminal({ name: `dotnet new ${projectName}` });
        term.show();
        term.sendText(`cd "${projectDir.replace(/"/g, '\\"')}"`);
        term.sendText(`dotnet new ${template} -n "${projectName}"`);
        term.sendText(`dotnet sln "${slnPath}" add "${path.join(projectDir, projectName + '.csproj')}"`);
        vscode.window.showWarningMessage('Failed to run dotnet commands automatically. A terminal has been opened so you can run the commands manually.');
    }
}

module.exports = { newProject };
