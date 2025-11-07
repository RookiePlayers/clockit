"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pipeline_1 = require("../src/core/pipeline");
const sessions_1 = require("../src/core/sessions");
describe('Pipeline', () => {
    it('runs middlewares in order', async () => {
        const s0 = (0, sessions_1.makeSession)({ startedIso: '2025-01-01T00:00:00.000Z', durationSeconds: 299 });
        const p = new pipeline_1.Pipeline()
            .use(s => (0, sessions_1.trimIdleTail)({ ...s }, { tailIdleMs: 0 }))
            .use(s => (0, sessions_1.roundSession)(s, 300, 60)); // round to 5min
        const out = await p.run(s0);
        expect(out.durationSeconds).toBe(300);
        expect(out.endedIso).toBe('2025-01-01T00:05:00.000Z');
    });
    it('trimIdleTail removes trailing idle seconds', async () => {
        const s0 = (0, sessions_1.makeSession)({ startedIso: '2025-01-01T00:00:00.000Z', durationSeconds: 600 });
        const out = (0, sessions_1.trimIdleTail)(s0, { tailIdleMs: 120 * 1000 }); // cut 2 min
        expect(out.durationSeconds).toBe(480);
        expect(out.endedIso).toBe('2025-01-01T00:08:00.000Z');
    });
});
//# sourceMappingURL=core.pipeline.test.js.map