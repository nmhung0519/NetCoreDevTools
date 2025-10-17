# Commands Directory

This directory contains all command handlers for the .NET Core Dev Tools extension.

## Structure

```
commands/
├── index.js                    # Exports all commands
├── selectCsProj.js             # Select .csproj file command
├── openSolution.js             # Open solution command
├── closeSolution.js            # Close solution command
├── buildProject.js             # Build project command
├── cleanProject.js             # Clean project command
├── debugProject.js             # Debug project command
├── openInTerminal.js           # Open in terminal command
└── revealInFileExplorer.js     # Reveal in File Explorer command
```

## Command IDs

All command IDs are defined as constants in `src/constants.js`:

- `COMMANDS.SELECT_CSPROJ` - Select a .csproj file
- `COMMANDS.OPEN_SOLUTION` - Open a .sln solution file
- `COMMANDS.CLOSE_SOLUTION` - Close the current solution
- `COMMANDS.BUILD_PROJECT` - Build a project
- `COMMANDS.CLEAN_PROJECT` - Clean a project
- `COMMANDS.DEBUG_PROJECT` - Debug a project
- `COMMANDS.OPEN_IN_TERMINAL` - Open project directory in terminal
- `COMMANDS.REVEAL_IN_FILE_EXPLORER` - Reveal file/folder in OS file explorer

## Adding New Commands

1. Create a new file in `src/commands/` (e.g., `myCommand.js`)
2. Export the command function:
   ```javascript
   async function myCommand(arg1, arg2) {
       // Command implementation
   }
   
   module.exports = { myCommand };
   ```
3. Add the command to `src/commands/index.js`
4. Add the command ID to `src/constants.js`
5. Register the command in `src/extension.js`
6. Add the command configuration to `package.json`

