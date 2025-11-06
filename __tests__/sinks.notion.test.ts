import { NotionSink } from '../src/sinks/notion.sink';
import type { TimeSinkConfig } from '../src/core/sink';
import { makeSession } from '../src/core/sessions';

describe('NotionSink', () => {
  beforeEach(() => { (global.fetch as jest.Mock).mockReset(); });

  it('creates page in database', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200, text: async () => '' });

    const cfg: TimeSinkConfig = {
      kind: 'notion',
      enabled: true,
      options: { apiToken: 'x', databaseId: 'db123' }
    };
    const sink = new NotionSink(cfg);
    const s = makeSession({ startedIso: '2025-01-01T00:00:00.000Z', durationSeconds: 1800, comment: 'Work' });
    const r = await sink.export(s);

    expect(r.ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.notion.com/v1/pages',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('appends to page when pageId set', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200, text: async () => '' });

    const cfg: TimeSinkConfig = {
      kind: 'notion',
      enabled: true,
      options: { apiToken: 'x', pageId: 'page123' }
    };
    const sink = new NotionSink(cfg);
    const s = makeSession({ startedIso: '2025-01-01T00:00:00.000Z', durationSeconds: 60 });
    const r = await sink.export(s);

    expect(r.ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/blocks/page123/children'),
      expect.objectContaining({ method: 'PATCH' })
    );
  });
});