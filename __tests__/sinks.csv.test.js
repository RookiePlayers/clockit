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
const csv_sink_1 = require("../src/sinks/csv.sink");
const sessions_1 = require("../src/core/sessions");
const fs = __importStar(require("fs/promises"));
describe('CsvSink', () => {
    beforeEach(() => {
        const fsm = fs;
        Object.keys(fsm.__store).forEach(k => delete fsm.__store[k]);
        fsm.appendFile.mockClear();
        fsm.access.mockClear();
        fsm.mkdir.mockClear();
        fsm.readFile.mockClear?.();
    });
    it('writes header once and appends rows', async () => {
        fs.access.mockImplementationOnce(async () => { throw new Error('ENOENT'); });
        const filename = `time_log_${Date.now()}_${Math.random()}.csv`;
        const cfg = {
            kind: 'csv',
            enabled: true,
            options: { outputDirectory: '/repo', filename, addHeaderIfMissing: true },
        };
        const sink = new csv_sink_1.CsvSink(cfg);
        await sink.export((0, sessions_1.makeSession)({ startedIso: '2025-01-01T00:00:00.000Z', durationSeconds: 300, comment: 'first' }));
        await sink.export((0, sessions_1.makeSession)({ startedIso: '2025-01-01T01:00:00.000Z', durationSeconds: 600, comment: 'second' }));
        const appendMock = fs.appendFile;
        expect(appendMock).toHaveBeenCalledTimes(2);
        const pathUsed = appendMock.mock.calls[0][0];
        const content = appendMock.mock.calls
            .filter(call => call[0] === pathUsed)
            .map(call => String(call[1]))
            .join('');
        const header = 'startedIso,endedIso,durationSeconds,workspace,repoPath,branch,issueKey,comment';
        const lines = content.split('\n').filter(Boolean);
        expect(content).toContain(header); // header present
        expect(lines.length).toBe(3); // header + 2 rows
        expect(lines.some(l => l.includes('first'))).toBe(true);
        expect(lines.some(l => l.includes('second'))).toBe(true);
    });
});
//# sourceMappingURL=sinks.csv.test.js.map