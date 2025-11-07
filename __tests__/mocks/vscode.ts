// Minimal VS Code API mock for unit tests
const config: Record<string, any> = {
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

export const workspace: any = {
  name: 'TestWS',
  workspaceFolders: [{ uri: { fsPath: '/repo' }, name: 'repo' }],
  getConfiguration: () => ({
    get: (k: string) => config[k],
    update: (k: string, v: any) => (config[k] = v),
  }),
  onDidChangeTextDocument: jest.fn(),
};

export const window: any = {
  showInformationMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  showErrorMessage: jest.fn(),
  showInputBox: jest.fn().mockResolvedValue(''), // overridable per test
  createStatusBarItem: () => ({
    text: '', tooltip: '', command: '', show: jest.fn(),
  }),
  onDidChangeActiveTextEditor: jest.fn(),
};

export const extensions: any = {
  getExtension: jest.fn().mockReturnValue({
    isActive: true,
    exports: { getAPI: () => ({ repositories: [] }) },
    activate: jest.fn(),
  }),
};

export const commands: any = {
  registerCommand: jest.fn(),
};

export const StatusBarAlignment = { Left: 1, Right: 2 };

export function Uri() {}