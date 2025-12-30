import z from "zod";

export interface ClockitSession {
  id: string;
  [key: string]: unknown;
}

export interface SaveSessionsRequest {
  sessions: ClockitSession[];
}

export interface SessionListItem {
  id: string;
  label: string;
  startedAt: number;
  accumulatedMs: number;
  endedAt?: number;
  running: boolean;
  groupId?: string;
  groupName?: string;
}

export type SessionResponse = z.infer<typeof SessionResponseSchema>;

export const SessionListResponseSchema = 
  z.object({
    id: z.string(),
    label: z.string(),
    startedAt: z.number(),
    accumulatedMs: z.number(),
    endedAt: z.number().optional(),
    running: z.boolean(),
    groupId: z.string().optional(),
    groupName: z.string().optional(),
    comment: z.string().optional(),
    pausedAt: z.number().optional(),
    csv: z.string().optional(),
    createdAt: z.string().optional(),
    lastUpdatedAt: z.string().optional(),
  });


export const SessionListItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  startedAt: z.number(),
  accumulatedMs: z.number(),
  endedAt: z.number().optional(),
  running: z.boolean(),
  groupId: z.string().optional(),
  groupName: z.string().optional(),
}); 

export const SessionResponseSchema = z.object({
  id: z.string(),
  label: z.string(),
  startedAt: z.number(),
  accumulatedMs: z.number(),
  endedAt: z.number().optional(),
  running: z.boolean(),
  goals: z.array(z.unknown()),
  groupId: z.string().optional(),
  groupName: z.string().optional(),
  comment: z.string().optional(),
  pausedAt: z.number().optional(),
  csv: z.string().optional(),
  createdAt: z.string().optional(),
  lastUpdatedAt: z.string().optional(),
});

export type SessionDataFormat = 'csv' | 'json';

