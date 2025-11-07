"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusBarAlignment = exports.commands = exports.extensions = exports.window = exports.workspace = void 0;
exports.Uri = Uri;
// Minimal VS Code API mock for unit tests
const config = {
    'timeit.csv.outputDirectory': '',
    'timeit.csv.filename': 'time_log.csv',
    'timeit.csv.addHeaderIfMissing': true,
    'timeit.enableJira': false,
    'timeit.jira.domain': '',
    'timeit.jira.email': '',
    'timeit.jira.apiToken': '',
    'timeit.notion.enableNotion': false,
    'timeit.notion.apiToken': '',
    'timeit.notion.databaseId': '',
    'timeit.notion.pageId': '',
    'timeit.idleTimeoutMinutes': 5,
    'timeit.showNotifications': false,
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