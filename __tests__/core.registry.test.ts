import { SinkRegistry } from '../src/core/registry';
import type { TimeSink, TimeSinkConfig } from '../src/core/sink';

class FakeSink implements TimeSink {
  readonly kind = 'fake';
  constructor(private cfg: TimeSinkConfig) {}
  validate() { return { ok: this.cfg.enabled }; }
  async export() { return { ok: true, message: 'ok' }; }
}

describe('SinkRegistry', () => {
  it('registers and creates enabled sinks', () => {
    const r = new SinkRegistry();
    r.register('fake', (cfg) => new FakeSink(cfg));

    const sinks = r.create([
      { kind: 'fake', enabled: true, options: {} },
      { kind: 'fake', enabled: false, options: {} },
    ]);

    expect(sinks).toHaveLength(1);
    expect(sinks[0].kind).toBe('fake');
  });

  it('throws for unknown kind', () => {
    const r = new SinkRegistry();
    expect(() => r.create([{ kind: 'nope', enabled: true, options: {} }])).toThrow();
  });
});