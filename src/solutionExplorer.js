const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

class SolutionTreeItem extends vscode.TreeItem {
    constructor(label, collapsibleState, uri, itemType, guid = null, resourceUri = null, extensionPath = null) {
        super(label, collapsibleState);
        this.uri = uri;
        this.itemType = itemType;
        this.guid = guid;
        this.children = [];
        this.resourceUri = resourceUri || uri;
        
        if (itemType === 'solution') {
            this.iconPath = new vscode.ThemeIcon('file-code');
            this.contextValue = 'solution';
        } else if (itemType === 'folder') {
            this.iconPath = new vscode.ThemeIcon('folder');
            this.contextValue = 'solutionFolder';
        } else if (itemType === 'project') {
            // Use custom C# icon for projects with theme support
            if (extensionPath) {
                this.iconPath = {
                    light: path.join(extensionPath, 'assets', 'images', 'csharp.svg'),
                    dark: path.join(extensionPath, 'assets', 'images', 'csharp.dark.svg')
                };
            } else {
                this.iconPath = new vscode.ThemeIcon('project');
            }
            this.contextValue = 'project';
        } else if (itemType === 'projectFolder') {
            this.iconPath = new vscode.ThemeIcon('folder');
            this.contextValue = 'projectFolder';
        } else if (itemType === 'projectFile') {
            this.iconPath = vscode.ThemeIcon.File;
            this.contextValue = 'projectFile';
            if (uri) {
                this.command = {
                    command: 'vscode.open',
                    title: 'Open File',
                    arguments: [uri]
                };
            }
        } else if (itemType === 'dependencies') {
            this.iconPath = new vscode.ThemeIcon('package');
            this.contextValue = 'dependencies';
        } else if (itemType === 'dependency') {
            this.iconPath = new vscode.ThemeIcon('library');
            this.contextValue = 'dependency';
        }
    }
}

class SolutionExplorerProvider {
    constructor(extensionPath = null) {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.solutionFile = null;
        this.rootItems = [];
        this.itemsMap = new Map(); // Map GUID to tree item
        this.allFileItems = []; // Cache of all file items for quick lookup
        this.projectContentsCache = new Map(); // Cache parsed project contents
        this.extensionPath = extensionPath;
    }

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    async loadSolution(solutionUri) {
        this.solutionFile = solutionUri;
        this.allFileItems = []; // Clear cache
        this.projectContentsCache.clear(); // Clear project cache
        await this.parseSolutionFile(solutionUri);
        this.refresh();
    }

    async findItemByUri(uri) {
        // Normalize path for comparison (handle Windows case insensitivity)
        const normalizedSearchPath = uri.fsPath.toLowerCase().replace(/\\/g, '/');
        
        // First check if the file belongs to any project directory
        const projectMatch = this.findProjectForFile(uri.fsPath);
        if (!projectMatch) {
            return null; // File is not in any project
        }
        
        // Recursive search through entire tree structure
        const searchInChildren = async (items, skipProjectParse = false) => {
            for (const item of items) {
                // Check if this item matches
                if (item.uri) {
                    const itemPath = item.uri.fsPath.toLowerCase().replace(/\\/g, '/');
                    if (itemPath === normalizedSearchPath) {
                        return item;
                    }
                }
                
                // If item has children, search recursively
                if (item.children && item.children.length > 0) {
                    const found = await searchInChildren(item.children, true);
                    if (found) return found;
                }
                
                // If item is the matching project and hasn't been expanded yet
                if (!skipProjectParse && item.itemType === 'project' && item.uri && 
                    item.uri.fsPath === projectMatch.fsPath) {
                    try {
                        // Use cached project contents if available
                        let projectChildren = this.projectContentsCache.get(item.uri.fsPath);
                        if (!projectChildren) {
                            projectChildren = await this.parseProjectFile(item.uri);
                            this.projectContentsCache.set(item.uri.fsPath, projectChildren);
                        }
                        const found = await searchInChildren(projectChildren, true);
                        if (found) return found;
                    } catch (error) {
                        // If parsing fails, continue to next item
                        console.error(`Error parsing project ${item.label}:`, error);
                    }
                }
            }
            return null;
        };
        
        // Search from root items
        return await searchInChildren(this.rootItems);
    }

    findProjectForFile(filePath) {
        // Find which project this file belongs to
        const normalizedFilePath = filePath.toLowerCase().replace(/\\/g, '/');
        
        for (const [, item] of this.itemsMap) {
            if (item.itemType === 'project' && item.uri) {
                const projectDir = path.dirname(item.uri.fsPath).toLowerCase().replace(/\\/g, '/');
                if (normalizedFilePath.startsWith(projectDir)) {
                    return item.uri;
                }
            }
        }
        return null;
    }

    async parseSolutionFile(solutionUri) {
        try {
            const content = await vscode.workspace.fs.readFile(solutionUri);
            const text = Buffer.from(content).toString('utf8');
            
            this.itemsMap.clear();
            this.rootItems = [];
            
            const solutionDir = path.dirname(solutionUri.fsPath);
            
            // Parse all projects and folders
            // Format: Project("{TYPE-GUID}") = "Name", "Path", "{PROJECT-GUID}"
            const projectRegex = /Project\("\{([^}]+)\}"\)\s*=\s*"([^"]*)"\s*,\s*"([^"]*)"\s*,\s*"\{([^}]+)\}"/g;
            const matches = [...text.matchAll(projectRegex)];
            
            const FOLDER_TYPE = '2150E333-8FDC-42A3-9474-1A3956D46DE8';
            
            for (const match of matches) {
                const typeGuid = match[1];
                const itemName = match[2];
                const itemPath = match[3];
                const itemGuid = match[4];
                
                if (typeGuid.toUpperCase() === FOLDER_TYPE) {
                    // This is a solution folder - collapsed by default for level 1
                    const folderItem = new SolutionTreeItem(
                        itemName,
                        vscode.TreeItemCollapsibleState.Collapsed,
                        null,
                        'folder',
                        itemGuid
                    );
                    this.itemsMap.set(itemGuid, folderItem);
                } else if (itemPath.endsWith('.csproj')) {
                    // This is a project - collapsed by default
                    const fullPath = path.resolve(solutionDir, itemPath);
                    
                    if (fs.existsSync(fullPath)) {
                        const projectItem = new SolutionTreeItem(
                            itemName,
                            vscode.TreeItemCollapsibleState.Collapsed,
                            vscode.Uri.file(fullPath),
                            'project',
                            itemGuid,
                            null,
                            this.extensionPath
                        );
                        this.itemsMap.set(itemGuid, projectItem);
                    }
                }
            }
            
            // Parse nested projects section to build hierarchy
            // GlobalSection(NestedProjects) = preSolution
            //     {ChildGUID} = {ParentGUID}
            // EndGlobalSection
            const nestedSection = text.match(/GlobalSection\(NestedProjects\)\s*=\s*preSolution([\s\S]*?)EndGlobalSection/);
            
            if (nestedSection) {
                const nestedLines = nestedSection[1].trim().split('\n');
                for (const line of nestedLines) {
                    const nestedMatch = line.match(/\{([^}]+)\}\s*=\s*\{([^}]+)\}/);
                    if (nestedMatch) {
                        const childGuid = nestedMatch[1];
                        const parentGuid = nestedMatch[2];
                        
                        const childItem = this.itemsMap.get(childGuid);
                        const parentItem = this.itemsMap.get(parentGuid);
                        
                        if (childItem && parentItem) {
                            parentItem.children.push(childItem);
                        }
                    }
                }
            }
            
            // Collect root items (items without parents)
            for (const [, item] of this.itemsMap) {
                let isChild = false;
                for (const [, parentItem] of this.itemsMap) {
                    if (parentItem.children.includes(item)) {
                        isChild = true;
                        break;
                    }
                }
                if (!isChild) {
                    this.rootItems.push(item);
                }
            }
            
            // Sort items: folders first, then projects
            this.rootItems.sort((a, b) => {
                if (a.itemType === 'folder' && b.itemType !== 'folder') return -1;
                if (a.itemType !== 'folder' && b.itemType === 'folder') return 1;
                return a.label.localeCompare(b.label);
            });
            
        } catch (error) {
            vscode.window.showErrorMessage(`Error parsing solution file: ${error.message}`);
        }
    }

    async parseProjectFile(projectUri) {
        try {
            const content = await vscode.workspace.fs.readFile(projectUri);
            const text = Buffer.from(content).toString('utf8');
            const projectDir = path.dirname(projectUri.fsPath);
            
            const items = [];
            
            // Parse PackageReference for dependencies
            const packageRegex = /<PackageReference\s+Include="([^"]+)"(?:\s+Version="([^"]+)")?/g;
            const packages = [...text.matchAll(packageRegex)];
            
            if (packages.length > 0) {
                const depsItem = new SolutionTreeItem(
                    'Dependencies',
                    vscode.TreeItemCollapsibleState.Collapsed,
                    null,
                    'dependencies'
                );
                
                for (const pkg of packages) {
                    const pkgName = pkg[1];
                    const pkgVersion = pkg[2] || '';
                    const depItem = new SolutionTreeItem(
                        pkgVersion ? `${pkgName} (${pkgVersion})` : pkgName,
                        vscode.TreeItemCollapsibleState.None,
                        null,
                        'dependency'
                    );
                    depsItem.children.push(depItem);
                }
                
                items.push(depsItem);
            }
            
            // Scan all files in project directory
            const fileTree = await this.scanProjectDirectory(projectDir, projectDir);
            
            // Convert fileTree to tree items
            const convertToTreeItems = (tree, basePath = '') => {
                const result = [];
                const entries = Object.entries(tree).sort((a, b) => {
                    // Folders first, then files
                    const aIsFolder = typeof a[1] === 'object' && !(a[1] instanceof vscode.Uri);
                    const bIsFolder = typeof b[1] === 'object' && !(b[1] instanceof vscode.Uri);
                    if (aIsFolder && !bIsFolder) return -1;
                    if (!aIsFolder && bIsFolder) return 1;
                    return a[0].localeCompare(b[0]);
                });
                
                for (const [name, value] of entries) {
                    if (value instanceof vscode.Uri) {
                        // It's a file
                        const fileItem = new SolutionTreeItem(
                            name,
                            vscode.TreeItemCollapsibleState.None,
                            value,
                            'projectFile'
                        );
                        result.push(fileItem);
                        // Cache file items for reveal functionality
                        this.allFileItems.push(fileItem);
                    } else {
                        // It's a folder
                        const folderPath = path.join(projectDir, basePath, name);
                        const folderItem = new SolutionTreeItem(
                            name,
                            vscode.TreeItemCollapsibleState.Collapsed,
                            vscode.Uri.file(folderPath),
                            'projectFolder'
                        );
                        folderItem.children = convertToTreeItems(value, path.join(basePath, name));
                        result.push(folderItem);
                    }
                }
                
                return result;
            };
            
            items.push(...convertToTreeItems(fileTree));
            
            return items;
            
        } catch (error) {
            vscode.window.showErrorMessage(`Error parsing project file: ${error.message}`);
            return [];
        }
    }

    async scanProjectDirectory(dirPath, projectRoot) {
        const tree = {};
        
        // Directories to exclude
        const excludeDirs = ['bin', 'obj', '.vs', '.vscode', 'node_modules', 'packages', '.git'];
        
        try {
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                
                if (entry.isDirectory()) {
                    // Skip excluded directories
                    if (excludeDirs.includes(entry.name.toLowerCase())) {
                        continue;
                    }
                    
                    // Recursively scan subdirectory
                    const subTree = await this.scanProjectDirectory(fullPath, projectRoot);
                    
                    // Only include directory if it has content
                    if (Object.keys(subTree).length > 0) {
                        tree[entry.name] = subTree;
                    }
                } else if (entry.isFile()) {
                    // Skip .csproj, .user, and other project files
                    if (entry.name.endsWith('.csproj') || 
                        entry.name.endsWith('.user') ||
                        entry.name.endsWith('.suo')) {
                        continue;
                    }
                    
                    // Add file to tree
                    tree[entry.name] = vscode.Uri.file(fullPath);
                }
            }
        } catch (error) {
            console.error(`Error scanning directory ${dirPath}: ${error.message}`);
        }
        
        return tree;
    }

    getTreeItem(element) {
        return element;
    }

    async getChildren(element) {
        if (!this.solutionFile) {
            return [];
        }

        if (!element) {
            // Root level - show solution name without extension
            const solutionName = path.basename(this.solutionFile.fsPath, '.sln');
            const solutionItem = new SolutionTreeItem(
                solutionName,
                vscode.TreeItemCollapsibleState.Expanded,
                this.solutionFile,
                'solution'
            );
            return [solutionItem];
        }

        if (element.itemType === 'solution') {
            // Show root items under solution (folders and projects at root level)
            return this.rootItems;
        }

        if (element.itemType === 'folder') {
            // Show children of this folder (can be folders or projects)
            const children = element.children.slice();
            children.sort((a, b) => {
                if (a.itemType === 'folder' && b.itemType !== 'folder') return -1;
                if (a.itemType !== 'folder' && b.itemType === 'folder') return 1;
                return a.label.localeCompare(b.label);
            });
            return children;
        }

        if (element.itemType === 'project') {
            // Show project contents (dependencies, files, folders)
            if (element.uri) {
                // Use cache if available
                let projectContents = this.projectContentsCache.get(element.uri.fsPath);
                if (!projectContents) {
                    projectContents = await this.parseProjectFile(element.uri);
                    this.projectContentsCache.set(element.uri.fsPath, projectContents);
                }
                return projectContents;
            }
            return [];
        }

        if (element.itemType === 'projectFolder') {
            // Show children of project folder
            return element.children;
        }

        if (element.itemType === 'dependencies') {
            // Show package references
            return element.children;
        }

        return [];
    }
}

module.exports = { SolutionExplorerProvider };

