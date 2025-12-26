# clockit-server

Realtime companion for Clockit Online. This service keeps track of active sessions across users, streams stopwatch ticks over WebSockets, and records which goals are attached to each session.

## Capabilities

- WebSocket hub that fans out session state to all connected clients for a user.
- Tracks multiple active sessions per user, each with one or more attached goals.
- Emits per-second ticks so the UI can keep timers in sync even if a tab is backgrounded.
- HTTP health check for uptime monitoring.

## Quick start

1. `cd clockit-server`
2. `npm install` (installs `express`, `ws`, and `cors`)
3. `npm run dev`

Then connect a WebSocket client to `ws://localhost:4000/session?userId=<uid>`.

## Message contract (draft)

All messages are JSON with a `type` key.

- `ready` – sent once on connection with the current `sessions` array.
- `session-start` – `{ type: "session-start", payload: { sessionId, label, goals: Goal[], comment? } }`
- `session-stop` – `{ type: "session-stop", payload: { sessionId } }`
- `session-attach` – `{ type: "session-attach", payload: { sessionId, goal } }`
- `session-detach` – `{ type: "session-detach", payload: { sessionId, goalId } }`
- `tick` – sent every second: `{ type: "tick", payload: { sessionId, elapsedMs, running } }`
- `session-snapshot` – broadcast after any mutation: `{ type: "session-snapshot", payload: SessionState[] }`

## Data model

- **SessionState:** `{ sessionId, userId, label, startedAt, accumulatedMs, running, goals, groupId?, groupName?, comment? }`
- **Goal:** `{ id, title, completed, completedAt?, groupId, groupName, estimatedGoalTime? }`

Storage is currently in-memory; swap the `sessionStore` in `src/index.ts` with Redis or Firestore when ready.

## Notes

- Keep the schema aligned with the UI expectations in `clockit_website/src/app/clockit-online/page.tsx`.
- The server intentionally avoids writing CSVs; the client downloads them locally today. A later milestone can expose a `POST /ingestCsv` endpoint to mirror the VS Code extension.
