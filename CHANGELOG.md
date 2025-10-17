# Change Log

All notable changes to the ".Net Core Dev Tools" extension will be documented in this file.

## [0.0.1] - 2025-01-13

### Added
- Initial release of .Net Core Dev Tools
- **Auto-open Solution**: Automatically opens .sln file if only one exists in workspace
- **Select .csproj File**: Command to quickly find and open project files
- **Open Solution**: Command to open solution files with auto-open for single .sln
- **Solution Explorer View**: Tree view showing solution structure
  - Solution folders with proper hierarchy
  - All projects organized in folders
  - Nested folder structure from .sln file
  - Expandable project contents (dependencies, files, folders)
  - Auto-reveal active file in tree view
- **Right-click Context Menu** on projects:
  - **Build**: Run `dotnet build` on the project
  - **Clean**: Run `dotnet clean` on the project
  - **Debug**: Debug using netcoredbg with VSCode DAP interface
- **NetCoreDbg Integration**: 
  - Uses Samsung's netcoredbg for debugging
  - Included binaries for Windows x64
  - Supports VSCode Debug Adapter Protocol (DAP)
  - Auto-focus on Debug view when debugging starts
  - Always builds in Debug configuration for optimal debugging
- **Settings**:
  - `netcore-dev-tools.autoRevealFile`: Toggle auto-reveal file in tree view

### Technical Details
- Scan all files in project directories (excludes bin, obj, .vs, node_modules)
- Parse .sln files for solution structure
- Parse .csproj files for dependencies and file listings
- Cache project contents for performance
- Support for Windows, Linux, and macOS (netcoredbg binaries included for Windows)

## [Unreleased]

### Planned Features
- Support for multiple solution files
- Project templates
- NuGet package management
- Additional debugging features

