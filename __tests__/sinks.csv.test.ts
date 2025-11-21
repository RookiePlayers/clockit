jest.mock('fs/promises', () => {
  const store: Record<string, string> = {};
  return {
    __store: store,
    mkdir: jest.fn(async () => {}),
    access: jest.fn(async (p: string) => {
      if (!(p in store)) {throw new Error('ENOENT');}
    }),
    appendFile: jest.fn(async (p: string, data: string) => {
      store[p] = (store[p] ?? '') + data;
    }),
    readFile: jest.fn(async (p: string) => store[p] ?? ''),
  };
});

import type { TimeSinkConfig } from '../src/core/sink';
import { CsvSink } from '../src/sinks/csv.sink';
import { makeSession } from '../src/core/sessions';
import * as fs from 'fs/promises';

describe('CsvSink', () => {
  beforeEach(() => {
    const fsm = fs as any;
    Object.keys(fsm.__store).forEach(k => delete fsm.__store[k]);
    fsm.appendFile.mockClear();
    fsm.access.mockClear();
    fsm.mkdir.mockClear();
    fsm.readFile.mockClear?.();
  });

  it('writes header once and appends rows', async () => {
     (fs as any).access.mockImplementationOnce(async () => { throw new Error('ENOENT'); });
    const filename = `time_log_${Date.now()}_${Math.random()}.csv`;
    const cfg: TimeSinkConfig = {
      kind: 'csv',
      enabled: true,
      options: { outputDirectory: '/repo', filename, addHeaderIfMissing: true },
    };
    const sink = new CsvSink(cfg);

    await sink.export(makeSession({ startedIso: '2025-01-01T00:00:00.000Z', durationSeconds: 300, comment: 'first' }));
    await sink.export(makeSession({ startedIso: '2025-01-01T01:00:00.000Z', durationSeconds: 600, comment: 'second' }));

    const appendMock = (fs as any).appendFile as jest.Mock;
    expect(appendMock).toHaveBeenCalledTimes(2);

    const pathUsed = appendMock.mock.calls[0][0] as string;
    const content = appendMock.mock.calls
      .filter(call => call[0] === pathUsed)
      .map(call => String(call[1]))
      .join('');

    const header = 'startedIso,endedIso,durationSeconds,idleSeconds,linesAdded,linesDeleted,perFileSeconds,perLanguageSeconds,authorName,authorEmail,machine,workspace,repoPath,branch,issueKey,comment';
    const lines = content.split('\n').filter(Boolean);

    expect(content).toContain(header);          // header present
    expect(lines.length).toBe(3);               // header + 2 rows
    expect(lines.some(l => l.includes('first'))).toBe(true);
    expect(lines.some(l => l.includes('second'))).toBe(true);
  });
});
