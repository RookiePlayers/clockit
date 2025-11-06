import { JiraSink } from '../src/sinks/jira.sink';
import type { TimeSinkConfig } from '../src/core/sink';
import { makeSession } from '../src/core/sessions';

describe('JiraSink', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockReset();
  });

  const cfg: TimeSinkConfig = {
    kind: 'jira',
    enabled: true,
    options: { domain: 'example.atlassian.net', email: 'u@example.com', apiToken: 't' }
  };

  it('skips when no issueKey', async () => {
    const sink = new JiraSink(cfg);
    const s = makeSession({ startedIso: '2025-01-01T00:00:00.000Z', durationSeconds: 300 });
    const r = await sink.export(s);
    expect(r.ok).toBe(true);
    expect(r.message).toMatch(/No issueKey/);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('posts worklog when issueKey present', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 201, text: async () => '' });

    const sink = new JiraSink(cfg);
    const s = makeSession({ startedIso: '2025-01-01T00:00:00.000Z', durationSeconds: 300, });
    s.issueKey = 'TP-123';
    const r = await sink.export(s);

    expect(r.ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/rest/api/3/issue/TP-123/worklog'),
      expect.objectContaining({ method: 'POST' })
    );
  });
});