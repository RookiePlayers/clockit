import z from "zod";

export type IsoString = string;

export type SessionUpload = z.infer<typeof SessionUploadSchema>;

export type Goal = z.infer<typeof GoalSchema>;

export const GoalSchema = z.object({
    title: z.string().optional(),
    createdAt: z.string().optional(),
    completedAt: z.string().nullable().optional(),
    timeTaken: z.coerce.number().nullable().optional(),
});

export const SessionUploadSchema = z.object({
    startedIso: z.string().optional(),
    endedIso: z.string().optional(),
    durationSeconds: z.coerce.number().optional(),
    title: z.string().optional(),
    idleSeconds: z.coerce.number().optional(),
    linesAdded: z.coerce.number().optional(),
    linesDeleted: z.coerce.number().optional(),
    perFileSeconds: z.union([z.record(z.coerce.number()), z.string().transform(val => {
        try { return JSON.parse(val); } catch { return {}; }
    })]).optional(),
    perLanguageSeconds: z.union([z.record(z.coerce.number()), z.string().transform(val => {
        try { return JSON.parse(val); } catch { return {}; }
    })]).optional(),
    authorName: z.string().optional(),
    authorEmail: z.string().optional(),
    machine: z.string().optional(),
    ideName: z.string().optional(),
    workspace: z.string().optional(),
    repoPath: z.string().optional(),
    branch: z.string().nullable().optional(),
    issueKey: z.string().nullable().optional(),
    comment: z.string().optional(),
    meta: z.record(z.unknown()).optional(),
    goals: z.union([z.array(GoalSchema), z.string().transform(val => {
        try { return JSON.parse(val); } catch { return []; }
    })]).optional(),
});

