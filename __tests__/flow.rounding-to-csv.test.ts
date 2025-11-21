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

import { Pipeline } from '../src/core/pipeline';
import { roundSession, makeSession } from '../src/core/sessions';
import { CsvSink } from '../src/sinks/csv.sink';
import type { TimeSinkConfig } from '../src/core/sink';
import * as fs from 'fs/promises';

describe('End-to-end: pipeline → csv', () => {
  beforeEach(() => {
    const fsm = fs as any;
    Object.keys(fsm.__store).forEach(k => delete fsm.__store[k]);
    fsm.appendFile.mockClear();
    fsm.access.mockClear();
    fsm.mkdir.mockClear();
    fsm.readFile.mockClear?.();
  });

  it('rounds to 5m and writes header + one row', async () => {
    // Ensure first access behaves like "missing file"
    (fs as any).access.mockImplementationOnce(async () => { throw new Error('ENOENT'); });

    const s0 = makeSession({
      startedIso: '2025-01-01T00:00:00.000Z',
      durationSeconds: 299,
      comment: 'work',
    });
    const pipe = new Pipeline().use(s => roundSession(s, 300, 60));
    const s = await pipe.run(s0);

    const cfg: TimeSinkConfig = {
      kind: 'csv',
      enabled: true,
      options: { outputDirectory: '/repo', filename: 'time_log.csv', addHeaderIfMissing: true },
    };
    const sink = new CsvSink(cfg);
    const r = await sink.export(s);
    expect(r.ok).toBe(true);

    const appendMock = (fs as any).appendFile as jest.Mock;
    expect(appendMock).toHaveBeenCalledTimes(1);

    const pathUsed = appendMock.mock.calls[0][0] as string;
    const content = appendMock.mock.calls
      .filter(call => call[0] === pathUsed)
      .map(call => String(call[1]))
      .join('');

    const header = 'startedIso,endedIso,durationSeconds,idleSeconds,linesAdded,linesDeleted,perFileSeconds,perLanguageSeconds,authorName,authorEmail,machine,workspace,repoPath,branch,issueKey,comment';
    const lines = content.split('\n').filter(Boolean);

    expect(content).toContain(header); // header present
    expect(lines.length).toBe(2);      // header + 1 row
    expect(lines[1]).toContain(',300,');
    expect(lines[1]).toContain('work');
  });
});
