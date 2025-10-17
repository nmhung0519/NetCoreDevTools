# .Net Core Dev Tools

Development tools extension for .NET Core projects in Visual Studio Code.

## Features

This extension provides development tools for .NET Core:
- **Auto-open Solution**: When you open VSCode, if there's exactly one .sln file in the workspace, it automatically opens that solution
- **Select .csproj File**: Quickly find and open any .csproj project file in your workspace
- **Open Solution**: Quickly find and open any .sln solution file in your workspace (automatically opens if only one .sln file exists)
- **Solution Explorer View**: When you open a .sln file, a ".Net Core Solution" panel appears in the Explorer sidebar showing:
  - Solution folders with proper hierarchy
  - All projects organized in their respective folders
  - Nested folder structure exactly as defined in the .sln file
  - Expandable project contents including:
    - Dependencies (NuGet packages with versions)
    - All files and folders in the project directory (automatically scanned)
    - Recursive folder structure
    - Excludes bin, obj, .vs, node_modules, and other build artifacts
  - **Auto-reveal active file**: When you open a file, it automatically highlights in the tree view
  - **Right-click context menu** on projects with options:
    - **Build**: Run `dotnet build` on the project
    - **Clean**: Run `dotnet clean` on the project
    - **Debug**: Debug using netcoredbg (Samsung's .NET Core debugger with VSCode DAP interface)
- **NetCoreDbg Integration**: 
  - Uses Samsung's [netcoredbg](https://github.com/Samsung/netcoredbg) for debugging
  - Included binaries in `assets/debugger/x64/` for Windows
  - Supports VSCode Debug Adapter Protocol (DAP) via `pipeTransport`
  - Works perfectly in VSCode, Cursor, and other VSCode-based editors
  - Automatic fallback to `dotnet run` if netcoredbg is not available

## Requirements

- Visual Studio Code v1.80.0 or higher
- .NET Core SDK (for building and running projects)
- Windows OS (netcoredbg binaries included are for Windows x64)

## Getting Started

### Automatic Solution Loading

When you open a workspace/folder with exactly **one .sln file**, the extension will automatically:
1. Open the solution file in the editor
2. Load the solution structure in the ".Net Core Solution" panel
3. Display all projects and files

This provides an instant IDE-like experience without any manual steps!

### Manual Commands

If you have multiple solutions or want to manually control solution loading:

1. Run commands from the command palette:
   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
   - Type `.Net Core Dev Tools: Select .csproj File` to select a project file
   - Type `.Net Core Dev Tools: Open Solution` to open a solution file
   - After opening a solution, check the Explorer sidebar for the ".Net Core Solution" panel to see all projects

3. Right-click on any project in the Solution Explorer to:
   - **Build** the project (uses `dotnet build`)
   - **Clean** build artifacts (uses `dotnet clean`)
   - **Debug** the project (uses netcoredbg with VSCode DAP interface)
     - Automatically builds the project in **Debug configuration** first
     - Launches debugger with full breakpoint support
     - Uses `assets/debugger/x64/netcoredbg.exe` on Windows
     - No "Release build" warnings - always uses Debug mode for optimal debugging
     - **Auto-focuses on Debug view and Debug Console** when debugging starts for immediate visibility

> 💡 **Tip:** Debug builds are slower but provide the best debugging experience with full variable inspection and accurate breakpoints. For production, use regular `dotnet build --configuration Release`.

### For Extension Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Press F5 to open a new window with your extension loaded

3. Set breakpoints in your code inside `src/extension.js` to debug your extension

### Package the Extension

To create a .vsix package:

```bash
npm install -g vsce
vsce package
```

### Install the Extension

```bash
code --install-extension netcore-dev-tools-0.0.1.vsix
```

## Extension Settings

This extension contributes the following settings:

* `netcore-dev-tools.enable`: Enable/disable this extension

## Known Issues

None at the moment.

## Release Notes

### 0.0.1

Initial release of .Net Core Dev Tools

## Development

### Project Structure

```
.
├── assets/
│   └── debugger/
│       └── x64/              # NetCoreDbg debugger binaries
│           ├── netcoredbg.exe
│           ├── dbgshim.dll
│           ├── ManagedPart.dll
│           └── Microsoft.CodeAnalysis.*.dll
├── src/
│   ├── extension.js          # Extension entry point
│   └── solutionExplorer.js   # Solution explorer tree view provider
├── package.json              # Extension manifest
└── README.md                # This file
```

### Adding New Features

1. Register commands in `package.json` under `contributes.commands`
2. Implement command handlers in `src/extension.js`
3. Test your changes by pressing F5

### About NetCoreDbg

This extension includes [NetCoreDbg](https://github.com/Samsung/netcoredbg) by Samsung, a managed code debugger with GDB/MI, VSCode DAP and CLI interfaces for CoreCLR.

**Features:**
- Full debugging support for .NET Core applications
- Breakpoints, stepping, variable inspection
- VSCode Debug Adapter Protocol (DAP) support
- Cross-platform debugger (Windows binaries included)

**Usage:** When you right-click on a project and select "Debug", the extension automatically:
1. Builds your project with `dotnet build --configuration Debug`
   - ⚠️ **Always builds in Debug mode** for optimal debugging experience
   - Debug builds include full debug symbols and no compiler optimizations
   - Ensures breakpoints work correctly and variables can be inspected
2. Locates the output DLL in `bin/Debug/{targetFramework}/`
3. Creates a VSCode debug configuration with `pipeTransport`:
   - Uses PowerShell (Windows) or bash (Linux/Mac) as pipe program
   - Launches netcoredbg with `--interpreter=vscode` for DAP support
   - Points to the built DLL for proper debugging
4. Starts the debugging session with full breakpoint support
5. **Automatically switches to Debug view** and opens Debug Console for immediate visibility of output

> **Note:** If you see warnings about "debugging a Release build", make sure you're using the Debug command from this extension, which automatically builds in Debug configuration.

For more information about netcoredbg, visit: https://github.com/Samsung/netcoredbg

## Publishing

### For Maintainers

To publish a new version of this extension:

1. **Install vsce** (if not already installed):
   ```bash
   npm install
   ```

2. **Update version and publish**:
   ```bash
   # Patch version (0.0.1 -> 0.0.2)
   npm run publish:patch
   
   # Minor version (0.0.1 -> 0.1.0)
   npm run publish:minor
   
   # Major version (0.0.1 -> 1.0.0)
   npm run publish:major
   ```

3. **Or create .vsix package only**:
   ```bash
   npm run package
   ```

4. **Manual publish** (if needed):
   ```bash
   npm run publish
   ```

### Prerequisites for Publishing

- Get a Personal Access Token (PAT) from https://dev.azure.com/
- Create a publisher account at https://marketplace.visualstudio.com/manage
- Update `publisher` field in `package.json` with your publisher name
- (Optional) Add an `icon.png` (128x128) in root and update `package.json` with `"icon": "icon.png"`
- Login with vsce: `npx vsce login <publisher-name>`

**Detailed publishing instructions**: See [PUBLISHING.md](PUBLISHING.md) for complete guide

## License

MIT

