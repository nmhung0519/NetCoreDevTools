// The module 'vscode' contains the VS Code extensibility API
const vscode = require('vscode');
const path = require('path');
const { SolutionExplorerProvider } = require('./solutionExplorer');
const { NetCoreBuildTaskProvider } = require('./taskProvider');
const { DebugSessionManager } = require('./debugSessionManager');
const { COMMANDS } = require('./constants');

// Import command handlers
const {
    selectCsProj,
    openSolution,
    closeSolution,
    buildProject,
    cleanProject,
    debugProject,
    openInTerminal,
    revealInFileExplorer,
    newFolder,
    deleteItem
} = require('./commands');
const { newFileHandler } = require('./commands');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('Congratulations, your extension "netcore-dev-tools" is now active!');

    // Initialize context - no solution loaded by default
    vscode.commands.executeCommand('setContext', 'netcoreSolutionLoaded', false);

    // Create solution explorer provider
    const solutionExplorerProvider = new SolutionExplorerProvider(context.extensionPath);
    const treeView = vscode.window.createTreeView('netcoreSolutionExplorer', {
        treeDataProvider: solutionExplorerProvider
    });
    
    context.subscriptions.push(treeView);

    // Create and register build task provider
    // This provides dynamic dotnet build tasks
    const buildTaskProvider = new NetCoreBuildTaskProvider();
    const taskProviderDisposable = vscode.tasks.registerTaskProvider('netcore-build', buildTaskProvider);
    context.subscriptions.push(taskProviderDisposable);

    // Create debug session manager
    // This handles building before debug start/restart by detecting restart pattern
    const debugSessionManager = new DebugSessionManager(buildTaskProvider);

    // Listen to debug session start
    // When restart is detected, stop session, build, then restart properly
    context.subscriptions.push(
        vscode.debug.onDidStartDebugSession(async (session) => {
            await debugSessionManager.onSessionStart(session);
        })
    );

    // Auto-reveal file in tree view when opened
    let revealTimeout = null;
    const revealFileInTree = async (editor) => {
        // Debounce to avoid too many calls when switching files quickly
        if (revealTimeout) {
            clearTimeout(revealTimeout);
        }

        revealTimeout = setTimeout(async () => {
            try {
                // Check if auto-reveal is enabled
                const config = vscode.workspace.getConfiguration('netcore-dev-tools');
                if (!config.get('autoRevealFile', true)) {
                    return;
                }

                // Validate editor is still valid and not disposed
                if (!editor || !editor.document) {
                    return;
                }

                // Check if the editor's document is still open
                const activeEditor = vscode.window.activeTextEditor;
                if (!activeEditor || activeEditor.document !== editor.document) {
                    return;
                }

                const uri = editor.document.uri;
                
                // Only reveal for file:// scheme (not for output, debug console, etc.)
                if (uri.scheme !== 'file') {
                    return;
                }

                // Only reveal if solution is loaded
                if (!solutionExplorerProvider.solutionFile) {
                    return;
                }

                // Find the item in tree view (async now)
                const item = await solutionExplorerProvider.findItemByUri(uri);
                if (item) {
                    // Double-check editor is still valid before revealing
                    if (vscode.window.activeTextEditor && 
                        vscode.window.activeTextEditor.document.uri.fsPath === uri.fsPath) {
                        
                        // Reveal the item in tree view with focus and expand parent
                        await treeView.reveal(item, {
                            select: true,
                            focus: false,
                            expand: 2 // Expand 2 levels to ensure visibility
                        });
                    }
                }
            } catch (error) {
                // Silently ignore errors from disposed editors
                if (error.message && 
                    !error.message.includes('disposed') && 
                    !error.message.includes('closed')) {
                    console.error('Error revealing file in tree:', error);
                }
            }
        }, 300); // Wait 300ms before revealing
    };

    // Listen to active editor changes
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(revealFileInTree)
    );

    // Also reveal current active editor on activation
    if (vscode.window.activeTextEditor) {
        revealFileInTree(vscode.window.activeTextEditor);
    }

    // Auto-open solution if only one .sln file exists in workspace
    const autoOpenSolution = async () => {
        try {
            // Wait a bit for workspace to be ready
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Find all .sln files in the workspace
            const slnFiles = await vscode.workspace.findFiles('**/*.sln', '**/node_modules/**');
            
            if (slnFiles.length === 1) {
                // Exactly one solution file found - auto open it
                const solutionUri = slnFiles[0];
                const solutionName = path.basename(solutionUri.fsPath);
                
                console.log(`Auto-opening solution: ${solutionName}`);
                
                // Open the solution file in editor
                const document = await vscode.workspace.openTextDocument(solutionUri);
                await vscode.window.showTextDocument(document, { preview: false });
                
                // Load solution in the explorer view
                await vscode.commands.executeCommand('setContext', 'netcoreSolutionLoaded', true);
                await solutionExplorerProvider.loadSolution(solutionUri);
                
                vscode.window.showInformationMessage(`Auto-opened solution: ${solutionName}`);
            }
        } catch (error) {
            console.error('Error auto-opening solution:', error);
        }
    };

    // Run auto-open after activation
    autoOpenSolution();

    // Auto-focus on Debug view when debug session is ready
    // Use a small delay to avoid interfering with build
    context.subscriptions.push(
        vscode.debug.onDidChangeActiveDebugSession((session) => {
            if (session) {
                setTimeout(() => {
                    // Focus on Debug view (Run and Debug panel in sidebar)
                    vscode.commands.executeCommand('workbench.view.debug');
                    
                    // Focus on Debug Console panel at the bottom
                    vscode.commands.executeCommand('workbench.panel.repl.view.focus');
                }, 500);
            }
        })
    );

    // Track debug session termination to detect restart pattern
    context.subscriptions.push(
        vscode.debug.onDidTerminateDebugSession((session) => {
            debugSessionManager.onSessionTerminate(session);
        })
    );

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand(COMMANDS.SELECT_CSPROJ, selectCsProj)
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(COMMANDS.OPEN_SOLUTION, () => openSolution(solutionExplorerProvider))
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(COMMANDS.CLOSE_SOLUTION, () => closeSolution(solutionExplorerProvider))
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(COMMANDS.BUILD_PROJECT, buildProject)
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(COMMANDS.CLEAN_PROJECT, cleanProject)
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(COMMANDS.DEBUG_PROJECT, (treeItem) => debugProject(treeItem, context, buildTaskProvider, debugSessionManager))
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(COMMANDS.OPEN_IN_TERMINAL, openInTerminal)
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(COMMANDS.REVEAL_IN_FILE_EXPLORER, revealInFileExplorer)
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(COMMANDS.NEW_FOLDER, (treeItem) => newFolder(treeItem, solutionExplorerProvider))
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('netcore-dev-tools.newFile.class', (treeItem) => newFileHandler('class', treeItem, solutionExplorerProvider))
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('netcore-dev-tools.newFile.interface', (treeItem) => newFileHandler('interface', treeItem, solutionExplorerProvider))
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('netcore-dev-tools.newFile.enum', (treeItem) => newFileHandler('enum', treeItem, solutionExplorerProvider))
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('netcore-dev-tools.newFile.custom', (treeItem) => newFileHandler('custom', treeItem, solutionExplorerProvider))
    );

    // Generic New File command - shows QuickPick
    context.subscriptions.push(
        vscode.commands.registerCommand('netcore-dev-tools.newFile', async (treeItem) => {
            const choice = await vscode.window.showQuickPick([
                'Class',
                'Interface',
                'Enum',
                'Custom File'
            ], { placeHolder: 'Select file type to create' });
            if (!choice) return;
            const map = {
                'Class': 'class',
                'Interface': 'interface',
                'Enum': 'enum',
                'Custom File': 'custom'
            };
            await newFileHandler(map[choice], treeItem, solutionExplorerProvider);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(COMMANDS.DELETE_ITEM, (treeItem) => deleteItem(treeItem, solutionExplorerProvider))
    );
}

/**
 * This method is called when your extension is deactivated
 */
function deactivate() {}

module.exports = {
    activate,
    deactivate
};
