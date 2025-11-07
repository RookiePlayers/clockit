"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusBarAlignment = exports.commands = exports.extensions = exports.window = exports.workspace = void 0;
exports.Uri = Uri;
// Minimal VS Code API mock for unit tests
const config = {
    'timeit_logger.csv.outputDirectory': '',
    'timeit_logger.csv.filename': 'time_log.csv',
    'timeit_logger.csv.addHeaderIfMissing': true,
    'timeit_logger.enableJira': false,
    'timeit_logger.jira.domain': '',
    'timeit_logger.jira.email': '',
    'timeit_logger.jira.apiToken': '',
    'timeit_logger.notion.enableNotion': false,
    'timeit_logger.notion.apiToken': '',
    'timeit_logger.notion.databaseId': '',
    'timeit_logger.notion.pageId': '',
    'timeit_logger.idleTimeoutMinutes': 5,
    'timeit_logger.showNotifications': false,
};
exports.workspace = {
    name: 'TestWS',
    workspaceFolders: [{ uri: { fsPath: '/repo' }, name: 'repo' }],
    getConfiguration: () => ({
        get: (k) => config[k],
        update: (k, v) => (config[k] = v),
    }),
    onDidChangeTextDocument: jest.fn(),
};
exports.window = {
    showInformationMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showInputBox: jest.fn().mockResolvedValue(''), // overridable per test
    createStatusBarItem: () => ({
        text: '', tooltip: '', command: '', show: jest.fn(),
    }),
    onDidChangeActiveTextEditor: jest.fn(),
};
exports.extensions = {
    getExtension: jest.fn().mockReturnValue({
        isActive: true,
        exports: { getAPI: () => ({ repositories: [] }) },
        activate: jest.fn(),
    }),
};
exports.commands = {
    registerCommand: jest.fn(),
};
exports.StatusBarAlignment = { Left: 1, Right: 2 };
function Uri() { }
//# sourceMappingURL=vscode.js.map