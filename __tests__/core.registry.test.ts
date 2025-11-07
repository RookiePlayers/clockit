import { SinkRegistry } from '../src/core/registry';
import type { TimeSink, TimeSinkConfig } from '../src/core/sink';

class OkSink implements TimeSink {
  readonly kind = 'ok';
  constructor(public cfg: TimeSinkConfig) {}
  validate() { return { ok: true }; }
  async export() { return { ok: true as const, message: 'ok' }; }
}

class BadSink implements TimeSink {
  readonly kind = 'bad';
  constructor(public cfg: TimeSinkConfig) {}
  validate() { return { ok: false, missing: ['x'] }; }
  async export() { return { ok: true as const, message: 'bad' }; }
}

describe('SinkRegistry', () => {
  it('creates known sinks', () => {
    const r = new SinkRegistry();
    r.register('ok', (c) => new OkSink(c));

    const sinks = r.create([{ kind: 'ok', enabled: true, options: {} }]);
    expect(sinks).toHaveLength(1);
    expect(sinks[0].kind).toBe('ok');
  });

  it('skips unknown kind without throwing', () => {
  const r = new SinkRegistry();
  const sinks = r.create([{ kind: 'nope', enabled: true, options: {} }]);
  expect(sinks).toHaveLength(0);
});


  it('ignores disabled configs', () => {
    const r = new SinkRegistry();
    r.register('ok', (c) => new OkSink(c));

    const sinks = r.create([{ kind: 'ok', enabled: false, options: {} }]);
    expect(sinks).toHaveLength(0);
  });
});