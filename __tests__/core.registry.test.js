"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const registry_1 = require("../src/core/registry");
class FakeSink {
    cfg;
    kind = 'fake';
    constructor(cfg) {
        this.cfg = cfg;
    }
    validate() { return { ok: this.cfg.enabled }; }
    async export() { return { ok: true, message: 'ok' }; }
}
describe('SinkRegistry', () => {
    it('registers and creates enabled sinks', () => {
        const r = new registry_1.SinkRegistry();
        r.register('fake', (cfg) => new FakeSink(cfg));
        const sinks = r.create([
            { kind: 'fake', enabled: true, options: {} },
            { kind: 'fake', enabled: false, options: {} },
        ]);
        expect(sinks).toHaveLength(1);
        expect(sinks[0].kind).toBe('fake');
    });
    it('throws for unknown kind', () => {
        const r = new registry_1.SinkRegistry();
        expect(() => r.create([{ kind: 'nope', enabled: true, options: {} }])).toThrow();
    });
});
//# sourceMappingURL=core.registry.test.js.map