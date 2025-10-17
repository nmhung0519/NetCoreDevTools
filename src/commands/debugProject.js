const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

async function debugProject(treeItem, context, buildTaskProvider, debugSessionManager) {
    if (!treeItem || !treeItem.uri) {
        vscode.window.showErrorMessage('No project selected');
        return;
    }

    const projectPath = treeItem.uri.fsPath;
    const projectDir = path.dirname(projectPath);
    const projectName = path.basename(projectPath, '.csproj');

    try {
        // Get netcoredbg path
        const extensionPath = context.extensionPath;
        const netcoredbgPath = path.join(extensionPath, 'assets', 'debugger', 'x64', 'netcoredbg.exe');
        
        // Check if netcoredbg exists
        if (!fs.existsSync(netcoredbgPath)) {
            vscode.window.showWarningMessage('netcoredbg.exe not found, using dotnet run instead');
            const terminal = vscode.window.createTerminal(`Run: ${projectName}`);
            terminal.show();
            terminal.sendText(`cd "${projectDir}"`);
            // Add pause at the end to wait for any key press before closing
            if (process.platform === 'win32') {
                terminal.sendText(`dotnet run; Write-Host "Press any key to close..."; $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")`);
            } else {
                terminal.sendText(`dotnet run; read -n 1 -s -r -p "Press any key to close..."`);
            }
            return;
        }

        // Read project file to find output DLL
        const projectContent = fs.readFileSync(projectPath, 'utf8');
        
        // Extract TargetFramework
        const tfmMatch = projectContent.match(/<TargetFramework>([^<]+)<\/TargetFramework>/);
        const targetFramework = tfmMatch ? tfmMatch[1] : 'net8.0';
        
        // Construct the DLL path
        const outputDll = path.join(projectDir, 'bin', 'Debug', targetFramework, `${projectName}.dll`);
        
        // Register build task with the task provider
        const buildTask = buildTaskProvider.registerBuildTask(projectPath, projectDir, projectName);
        
        // Register this debug session with the manager for restart detection
        debugSessionManager.registerSession(projectName, {
            taskName: buildTask.name,
            projectPath: projectPath,
            projectDir: projectDir,
            projectName: projectName
        });
        
        // Build BEFORE starting debug
        vscode.window.showInformationMessage(`🔨 Building ${projectName}...`);
        
        const execution = await vscode.tasks.executeTask(buildTask);
        
        // Wait for build to complete
        const buildSuccess = await new Promise((resolve) => {
            const disposable = vscode.tasks.onDidEndTaskProcess(e => {
                if (e.execution === execution) {
                    disposable.dispose();
                    resolve(e.exitCode === 0);
                }
            });
            
            // Timeout after 2 minutes
            setTimeout(() => {
                disposable.dispose();
                resolve(false);
            }, 120000);
        });
        
        if (!buildSuccess) {
            vscode.window.showErrorMessage(`❌ Build failed for ${projectName}`);
            return;
        }
        
        // Check if DLL exists after build
        if (!fs.existsSync(outputDll)) {
            vscode.window.showErrorMessage(`Build succeeded but DLL not found: ${outputDll}`);
            return;
        }
        
        vscode.window.showInformationMessage(`✅ Build succeeded for ${projectName}`);
        
        // Create a debug configuration for netcoredbg using pipeTransport
        // Reference: https://engincanveske.substack.com/p/debug-your-net-apps-in-cursor-code
        // 
        // pipeTransport allows netcoredbg to communicate with VSCode's Debug Adapter Protocol
        // by using PowerShell/bash as an intermediary pipe. This is the correct way to
        // integrate netcoredbg with VSCode/Cursor-based editors.
        const debugConfig = {
            type: 'coreclr',
            request: 'launch',
            name: projectName,  // Use projectName as session name for tracking
            program: outputDll,
            args: [],
            cwd: projectDir,
            stopAtEntry: false,
            console: 'integratedTerminal',
            // Use pipeTransport for netcoredbg
            pipeTransport: {
                pipeCwd: projectDir,
                pipeProgram: process.platform === 'win32' ? 'powershell' : 'bash',
                pipeArgs: process.platform === 'win32' ? ['-Command'] : ['-c'],
                debuggerPath: netcoredbgPath,
                debuggerArgs: ['--interpreter=vscode'],
                quoteArgs: true
            },
            env: {
                DOTNET_ENVIRONMENT: 'Development'
            }
        };
        
        // Start debugging session AFTER build completes
        const started = await vscode.debug.startDebugging(undefined, debugConfig);
        
        if (!started) {
            vscode.window.showWarningMessage('Could not start debugger. Running without debug...');
            const runTerminal = vscode.window.createTerminal(`Run: ${projectName}`);
            runTerminal.show();
            runTerminal.sendText(`cd "${projectDir}"`);
            // Add pause at the end to wait for any key press before closing
            if (process.platform === 'win32') {
                runTerminal.sendText(`dotnet run; Write-Host "Press any key to close..."; $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")`);
            } else {
                runTerminal.sendText(`dotnet run; read -n 1 -s -r -p "Press any key to close..."`);
            }
        }
        
    } catch (error) {
        vscode.window.showErrorMessage(`Debug error: ${error.message}`);
    }
}

module.exports = { debugProject };

