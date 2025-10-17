const vscode = require('vscode');
const path = require('path');

/**
 * Task Provider for dynamic .NET Core build tasks
 * This ensures tasks are available for preLaunchTask even on debug restart
 */
class NetCoreBuildTaskProvider {
    constructor() {
        this.tasks = new Map();
    }

    /**
     * Register a build task for a project
     * This allows the task to be found by name when used as preLaunchTask
     */
    registerBuildTask(projectPath, projectDir, projectName) {
        const taskName = `build: ${projectName}`;
        
        // Task definition
        const taskDefinition = {
            type: 'netcore-build',
            projectPath: projectPath
        };

        // Shell execution for dotnet build
        const execution = new vscode.ShellExecution(
            'dotnet',
            ['build', projectPath, '--configuration', 'Debug'],
            {
                cwd: projectDir
            }
        );

        // Create the task
        const buildTask = new vscode.Task(
            taskDefinition,
            vscode.TaskScope.Workspace,
            taskName,
            'dotnet',
            execution,
            '$msCompile' // Problem matcher for build errors
        );

        // Configure task presentation
        buildTask.presentationOptions = {
            reveal: vscode.TaskRevealKind.Always,
            panel: vscode.TaskPanelKind.Dedicated,
            clear: true,
            showReuseMessage: false
        };

        // Mark as a build task
        buildTask.group = vscode.TaskGroup.Build;

        // Store the task
        this.tasks.set(taskName, buildTask);

        return buildTask;
    }

    /**
     * Provide all registered build tasks
     * Called by VS Code when it needs to list available tasks
     */
    provideTasks() {
        return Array.from(this.tasks.values());
    }

    /**
     * Resolve a task by name
     * Called by VS Code when a task is referenced (e.g., in preLaunchTask)
     * This is crucial for debug restart functionality
     */
    resolveTask(task) {
        const taskName = task.name;
        
        // Check if we have this task registered
        if (this.tasks.has(taskName)) {
            return this.tasks.get(taskName);
        }

        // Try to resolve from task definition
        if (task.definition && task.definition.type === 'netcore-build') {
            const projectPath = task.definition.projectPath;
            if (projectPath) {
                const projectDir = path.dirname(projectPath);
                const projectName = path.basename(projectPath, '.csproj');
                return this.registerBuildTask(projectPath, projectDir, projectName);
            }
        }

        return undefined;
    }
}

module.exports = { NetCoreBuildTaskProvider };

