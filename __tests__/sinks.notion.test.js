"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const notion_sink_1 = require("../src/sinks/notion.sink");
const sessions_1 = require("../src/core/sessions");
describe('NotionSink', () => {
    beforeEach(() => { global.fetch.mockReset(); });
    it('creates page in database', async () => {
        global.fetch.mockResolvedValue({ ok: true, status: 200, text: async () => '' });
        const cfg = {
            kind: 'notion',
            enabled: true,
            options: { apiToken: 'x', databaseId: 'db123' }
        };
        const sink = new notion_sink_1.NotionSink(cfg);
        const s = (0, sessions_1.makeSession)({ startedIso: '2025-01-01T00:00:00.000Z', durationSeconds: 1800, comment: 'Work' });
        const r = await sink.export(s);
        expect(r.ok).toBe(true);
        expect(global.fetch).toHaveBeenCalledWith('https://api.notion.com/v1/pages', expect.objectContaining({ method: 'POST' }));
    });
    it('appends to page when pageId set', async () => {
        global.fetch.mockResolvedValue({ ok: true, status: 200, text: async () => '' });
        const cfg = {
            kind: 'notion',
            enabled: true,
            options: { apiToken: 'x', pageId: 'page123' }
        };
        const sink = new notion_sink_1.NotionSink(cfg);
        const s = (0, sessions_1.makeSession)({ startedIso: '2025-01-01T00:00:00.000Z', durationSeconds: 60 });
        const r = await sink.export(s);
        expect(r.ok).toBe(true);
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/v1/blocks/page123/children'), expect.objectContaining({ method: 'PATCH' }));
    });
});
//# sourceMappingURL=sinks.notion.test.js.map