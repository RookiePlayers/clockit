import { Pipeline } from '../src/core/pipeline';
import { roundSession, trimIdleTail, makeSession } from '../src/core/sessions';

describe('Pipeline', () => {
  it('runs middlewares in order', async () => {
    const s0 = makeSession({ startedIso: '2025-01-01T00:00:00.000Z', durationSeconds: 299 });
    const p = new Pipeline()
      .use(s => trimIdleTail({ ...s }, { tailIdleMs: 0 }))
      .use(s => roundSession(s, 300, 60)); // round to 5min

    const out = await p.run(s0);
    expect(out.durationSeconds).toBe(300);
    expect(out.endedIso).toBe('2025-01-01T00:05:00.000Z');
  });

  it('trimIdleTail removes trailing idle seconds', async () => {
    const s0 = makeSession({ startedIso: '2025-01-01T00:00:00.000Z', durationSeconds: 600 });
    const out = trimIdleTail(s0, { tailIdleMs: 120 * 1000 }); // cut 2 min
    expect(out.durationSeconds).toBe(480);
    expect(out.endedIso).toBe('2025-01-01T00:08:00.000Z');
  });
});