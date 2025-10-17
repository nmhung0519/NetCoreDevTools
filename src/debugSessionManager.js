const vscode = require('vscode');

/**
 * Debug Session Manager
 * Handles building before debug start/restart
 */
class DebugSessionManager {
    constructor(buildTaskProvider) {
        this.buildTaskProvider = buildTaskProvider;
        // Store metadata for active debug sessions
        this.activeSessions = new Map();
        // Track recently terminated sessions to detect restart
        this.recentlyTerminated = new Map();
        // Track if we're currently building
        this.currentlyBuilding = new Set();
        // Track last build time to avoid duplicate builds
        this.lastBuildTime = new Map();
        // Track sessions we're manually restarting to avoid double-detection
        this.manuallyRestarting = new Set();
    }

    /**
     * Register a debug session with build metadata
     */
    registerSession(sessionName, metadata) {
        this.activeSessions.set(sessionName, metadata);
        console.log(`[DebugSessionManager] Registered session: ${sessionName}`);
    }

    /**
     * Handle when debug session starts
     * Check if this is a restart (terminated recently) and build if needed
     */
    async onSessionStart(session) {
        const sessionName = session.name;
        const timestamp = new Date().toLocaleTimeString();
        
        console.log(`[${timestamp}] Debug session started: ${sessionName}`);

        // Check if this is one of our tracked sessions
        const metadata = this.activeSessions.get(sessionName);
        if (!metadata) {
            console.log(`[${timestamp}] Not our session, skipping`);
            return;
        }

        // Check if this is a session we're manually restarting
        if (this.manuallyRestarting.has(sessionName)) {
            this.manuallyRestarting.delete(sessionName);
            console.log(`[${timestamp}] Session ${sessionName} restarted after build, continuing...`);
            return;
        }

        // Check if this session was recently terminated (restart pattern)
        const wasRecentlyTerminated = this.recentlyTerminated.has(sessionName);
        if (wasRecentlyTerminated) {
            this.recentlyTerminated.delete(sessionName);
            
            console.log(`[${timestamp}] 🔄 RESTART detected for ${sessionName}!`);
            console.log(`[${timestamp}] Stopping session to build first...`);
            
            // IMPORTANT: Stop the session immediately before it runs code
            await vscode.debug.stopDebugging(session);
            
            // Build
            vscode.window.showInformationMessage(`🔄 Restarting ${metadata.projectName}, building...`);
            const buildSuccess = await this.buildBeforeDebug(metadata, sessionName);
            
            if (!buildSuccess) {
                vscode.window.showErrorMessage(`❌ Build failed, restart cancelled`);
                return;
            }
            
            vscode.window.showInformationMessage(`✅ Build succeeded, restarting debug...`);
            
            // Mark that we're manually restarting to avoid double-detection
            this.manuallyRestarting.add(sessionName);
            
            // Start debug again with the same configuration
            await vscode.debug.startDebugging(undefined, session.configuration);
        } else {
            console.log(`[${timestamp}] First debug start (already built), skipping build`);
            // Mark that we've seen this session
            this.lastBuildTime.set(sessionName, Date.now());
        }
    }

    /**
     * Handle when debug session terminates
     * Track it to detect restart pattern
     */
    onSessionTerminate(session) {
        const sessionName = session.name;
        const timestamp = new Date().toLocaleTimeString();
        
        console.log(`[${timestamp}] Debug session terminated: ${sessionName}`);

        // Check if this is one of our sessions
        if (this.activeSessions.has(sessionName)) {
            // Store the configuration for restart detection
            this.recentlyTerminated.set(sessionName, session.configuration);
            
            // Clear after 2 seconds (if not restarted, it was a normal stop)
            setTimeout(() => {
                if (this.recentlyTerminated.has(sessionName)) {
                    console.log(`[${timestamp}] Session ${sessionName} was stopped, not restarted`);
                    this.recentlyTerminated.delete(sessionName);
                    // Also remove from active sessions
                    this.activeSessions.delete(sessionName);
                }
            }, 2000);
        }
    }

    /**
     * Build before debug
     */
    async buildBeforeDebug(metadata, sessionName) {
        // Avoid duplicate builds
        if (this.currentlyBuilding.has(sessionName)) {
            console.log(`Already building ${sessionName}, skipping`);
            return true;
        }

        this.currentlyBuilding.add(sessionName);

        try {
            const buildSuccess = await this.buildProject(metadata);
            
            if (buildSuccess) {
                this.lastBuildTime.set(sessionName, Date.now());
            }
            
            return buildSuccess;
        } finally {
            this.currentlyBuilding.delete(sessionName);
        }
    }

    /**
     * Build project from metadata
     */
    async buildProject(metadata) {
        const { taskName, projectPath, projectDir, projectName } = metadata;

        if (!taskName || !this.buildTaskProvider) {
            return true;
        }

        vscode.window.showInformationMessage(`🔨 Building ${projectName}...`);

        // Get or create the build task
        let buildTask = this.buildTaskProvider.tasks.get(taskName);
        if (!buildTask) {
            buildTask = this.buildTaskProvider.registerBuildTask(projectPath, projectDir, projectName);
        }

        try {
            // Execute the build task
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
                return false;
            }

            vscode.window.showInformationMessage(`✅ Build succeeded for ${projectName}`);
            return true;
        } catch (error) {
            vscode.window.showErrorMessage(`Build error: ${error.message}`);
            return false;
        }
    }
}

module.exports = { DebugSessionManager };

