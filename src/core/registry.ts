import { TimeSink, TimeSinkConfig } from './sink';

//factory to build a TimeSink from its config
type Factory = (cfg: TimeSinkConfig) => TimeSink;

export class SinkRegistry {
  private factories = new Map<string, Factory>();
  register(kind: string, factory: Factory) {
    if (this.factories.has(kind)) {throw new Error(`Sink "${kind}" already registered`);}
    this.factories.set(kind, factory);
  }
  create(cfgs: TimeSinkConfig[]): TimeSink[] {
    return cfgs
      .filter(c => c.enabled)
      .map(c => {
        const f = this.factories.get(c.kind);
        if (!f) {throw new Error(`No sink factory for "${c.kind}"`);}
        const sink = f(c);
        const res = sink.validate();
        if (!res.ok) {throw res.error ?? new Error(res.message || `Invalid config for ${c.kind}`);}
        return sink;
      });
  }
}