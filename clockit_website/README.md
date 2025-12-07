# Clockit Website

Marketing, docs, and dashboard UI for the Clockit VS Code extension. Built with Next.js (App Router), Tailwind, and Firebase auth.

## Key Pages
- **Dashboard / Advanced Stats**: charts fed by uploaded CSVs, focus radars, range totals with paging/mode filters.
- **Recent Activity**: latest CSV uploads with IDE badges and timestamps.
- **Docs**: extension usage, commands, exports (CSV/Jira/Notion/Cloud).
- **Profile / Data tools**: profile, CSV upload, request/delete data flows.

## Dev Setup
```bash
cd clockit_website
npm install
npm run dev
# open http://localhost:3000
```

Environment: Firebase client keys live in `.env.local` (see `src/lib/firebase.ts`). Routes are dynamic and expect those env vars at runtime.

## Notable UI Features
- Focus radars with expandable modals.
- Range totals with pagination (10 per page) and Sum/Avg/Min/Max modes; smooth size transitions.
- Recent activity cards include upload time + IDE badge.
- Docs highlight pause/resume, focus timer, and CSV/Clockit Cloud actions.

## Deploy
We deploy via Vercel. Set Firebase/API env vars in project settings before shipping. 
