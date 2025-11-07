"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
jest.mock('fs/promises', () => {
    const store = {};
    return {
        __store: store,
        mkdir: jest.fn(async () => { }),
        access: jest.fn(async (p) => {
            if (!(p in store)) {
                throw new Error('ENOENT');
            }
        }),
        appendFile: jest.fn(async (p, data) => {
            store[p] = (store[p] ?? '') + data;
        }),
        readFile: jest.fn(async (p) => store[p] ?? ''),
    };
});
const pipeline_1 = require("../src/core/pipeline");
const sessions_1 = require("../src/core/sessions");
const csv_sink_1 = require("../src/sinks/csv.sink");
const fs = __importStar(require("fs/promises"));
describe('End-to-end: pipeline → csv', () => {
    beforeEach(() => {
        const fsm = fs;
        Object.keys(fsm.__store).forEach(k => delete fsm.__store[k]);
        fsm.appendFile.mockClear();
        fsm.access.mockClear();
        fsm.mkdir.mockClear();
        fsm.readFile.mockClear?.();
    });
    it('rounds to 5m and writes header + one row', async () => {
        // Ensure first access behaves like "missing file"
        fs.access.mockImplementationOnce(async () => { throw new Error('ENOENT'); });
        const s0 = (0, sessions_1.makeSession)({
            startedIso: '2025-01-01T00:00:00.000Z',
            durationSeconds: 299,
            comment: 'work',
        });
        const pipe = new pipeline_1.Pipeline().use(s => (0, sessions_1.roundSession)(s, 300, 60));
        const s = await pipe.run(s0);
        const cfg = {
            kind: 'csv',
            enabled: true,
            options: { outputDirectory: '/repo', filename: 'time_log.csv', addHeaderIfMissing: true },
        };
        const sink = new csv_sink_1.CsvSink(cfg);
        const r = await sink.export(s);
        expect(r.ok).toBe(true);
        const appendMock = fs.appendFile;
        expect(appendMock).toHaveBeenCalledTimes(1);
        const pathUsed = appendMock.mock.calls[0][0];
        const content = appendMock.mock.calls
            .filter(call => call[0] === pathUsed)
            .map(call => String(call[1]))
            .join('');
        const header = 'startedIso,endedIso,durationSeconds,workspace,repoPath,branch,issueKey,comment';
        const lines = content.split('\n').filter(Boolean);
        expect(content).toContain(header); // header present
        expect(lines.length).toBe(2); // header + 1 row
        expect(lines[1]).toContain(',300,');
        expect(lines[1]).toContain('work');
    });
});
//# sourceMappingURL=flow.rounding-to-csv.test.js.map