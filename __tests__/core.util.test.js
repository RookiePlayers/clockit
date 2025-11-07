"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../src/core/util");
describe('util', () => {
    it('roundSeconds rounds to step with floor', () => {
        expect((0, util_1.roundSeconds)(299, 300, 60)).toBe(300);
        expect((0, util_1.roundSeconds)(40, 300, 60)).toBe(60);
        expect((0, util_1.roundSeconds)(749, 300, 60)).toBe(600); // 12m29s ~ 12.48 -> 12*5? wait: nearest -> 750 -> 600 since 749 < 750
    });
    it('addSecondsToIso adds correctly', () => {
        expect((0, util_1.addSecondsToIso)('2025-01-01T00:00:00.000Z', 90)).toBe('2025-01-01T00:01:30.000Z');
    });
});
//# sourceMappingURL=core.util.test.js.map