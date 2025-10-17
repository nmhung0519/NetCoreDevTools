// Export all commands
const { selectCsProj } = require('./selectCsProj');
const { openSolution } = require('./openSolution');
const { closeSolution } = require('./closeSolution');
const { buildProject } = require('./buildProject');
const { cleanProject } = require('./cleanProject');
const { debugProject } = require('./debugProject');
const { openInTerminal } = require('./openInTerminal');
const { revealInFileExplorer } = require('./revealInFileExplorer');
const { newFolder } = require('./newFolder');
const { deleteItem } = require('./deleteItem');
const { newFileHandler } = require('./newFile');

module.exports = {
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
    ,newFileHandler
};

