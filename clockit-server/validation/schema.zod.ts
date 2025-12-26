import z from "zod";

export const goalSchema = z.object({
    id: z.string(),
    title: z.string(),
    completed: z.boolean(),
    completedAt: z.string().optional(),
    groupId: z.string(),
    groupName: z.string(),
    estimatedGoalTime: z.number().optional(),
});


export const clientMessageSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("session-start"),
        payload: z.object({
            sessionId: z.string().optional(),
            label: z.string(),
            goals: z.array(goalSchema).optional(),
            groupId: z.string().optional(),
            groupName: z.string().optional(),
            comment: z.string().optional(),
        }),
    }),
    z.object({
        type: z.literal("session-stop"),
        payload: z.object({ sessionId: z.string() }),
    }),
    z.object({
        type: z.literal("session-resume"),
        payload: z.object({ sessionId: z.string() }),
    }),
    z.object({
        type: z.literal("session-pause"),
        payload: z.object({ sessionId: z.string() }),
    }),
    z.object({
        type: z.literal("session-remove"),
        payload: z.object({ sessionId: z.string() }),
    }),
    z.object({
        type: z.literal("session-attach"),
        payload: z.object({
            sessionId: z.string(),
            goal: goalSchema,
        }),
    }),
    z.object({
        type: z.literal("session-detach"),
        payload: z.object({
            sessionId: z.string(),
            goalId: z.string(),
        }),
    }),
]);