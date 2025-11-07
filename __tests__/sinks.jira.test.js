"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jira_sink_1 = require("../src/sinks/jira.sink");
const sessions_1 = require("../src/core/sessions");
describe('JiraSink', () => {
    beforeEach(() => {
        global.fetch.mockReset();
    });
    const cfg = {
        kind: 'jira',
        enabled: true,
        options: { domain: 'example.atlassian.net', email: 'u@example.com', apiToken: 't' }
    };
    it('skips when no issueKey', async () => {
        const sink = new jira_sink_1.JiraSink(cfg);
        const s = (0, sessions_1.makeSession)({ startedIso: '2025-01-01T00:00:00.000Z', durationSeconds: 300 });
        const r = await sink.export(s);
        expect(r.ok).toBe(true);
        expect(r.message).toMatch(/No issueKey/);
        expect(global.fetch).not.toHaveBeenCalled();
    });
    it('posts worklog when issueKey present', async () => {
        global.fetch.mockResolvedValue({ ok: true, status: 201, text: async () => '' });
        const sink = new jira_sink_1.JiraSink(cfg);
        const s = (0, sessions_1.makeSession)({ startedIso: '2025-01-01T00:00:00.000Z', durationSeconds: 300, });
        s.issueKey = 'TP-123';
        const r = await sink.export(s);
        expect(r.ok).toBe(true);
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/rest/api/3/issue/TP-123/worklog'), expect.objectContaining({ method: 'POST' }));
    });
});
//# sourceMappingURL=sinks.jira.test.js.map