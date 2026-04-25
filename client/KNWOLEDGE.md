# Bannin Frontend Refactor Knowledge Base

This file captures the current API surface in the repo and how it is already wired into the frontend so refactoring is easier and safer.

## 1) System map

- `client/` is Next.js (UI + proxy API routes).
- `server/` is Express + Prisma (main backend API).
- `daemon/` is local Go service:
  - tails `auditd` logs
  - sends events/rule requests to backend
  - exposes internal tool APIs on `:8080` used by backend agents

## 2) Canonical event model

Backend DB model (`server/prisma/schema.prisma`):

```ts
interface Event {
  id: string;               // uuid
  sourceTool: "auditd";    // enum today (only auditd)
  timestamp: string;        // ISO date
  priority: string;         // e.g. Info | Warning | High (daemon) or custom string
  description: string;
  rawPayload: unknown;      // JSONB
  reportUrl: string;        // stored S3 path in DB, signed URL in API responses
  count: number;            // dedupe count
  askedAnalysis: boolean;
  finished: boolean;
}
```

## 3) Backend APIs (Express: `server/src/index.ts`)

Base URL is backend origin (`PORT`, default in code is `4000`).

### Health

- `GET /`
- Response: plain text `Hello, bannin!`

### Events

#### `POST /events/new`
Used by daemon to ingest alerts.

Body:

```json
{
  "sourceTool": "auditd",
  "timestamp": "2026-04-25T10:00:00.000Z",
  "priority": "High",
  "description": "auditd ...",
  "rawPayload": { "any": "json" }
}
```

Behavior:

- validates `sourceTool` against enum (`auditd` only right now)
- requires non-empty `description`
- if `timestamp` missing, uses `new Date()`
- dedupe key = `(sourceTool + trimmed description)`
  - if duplicate found: updates existing row and increments `count`
  - if not: creates new row

Responses:

- `201` new event: `{ "success": true, "id": "...", "updatedExisting": false }`
- `200` deduped event: `{ "success": true, "id": "...", "updatedExisting": true }`

#### `GET /events/all`
Used by frontend incident list.

Query params:

- `start` (date string)
- `end` (date string)
- `rows` (positive int, max 500, default 100)
- `lf` (`true|false`) latest-first
- `of` (`true|false`) oldest-first (takes precedence over `lf`)

Response: `Event[]` but **selected summary fields only**:

```ts
{
  id, sourceTool, timestamp, priority, description,
  reportUrl, count, askedAnalysis, finished
}[]
```

Notes:

- `reportUrl` is converted to a temporary signed S3 URL when possible.

#### `GET /events/:uuid`
Used by frontend detail page.

Response: full event row (includes `rawPayload`) with signed `reportUrl`.

#### `GET /events/analyse/:uuid`
Starts async threat analysis job.

Behavior:

- sets event state to: `askedAnalysis = true`, `finished = false`, `reportUrl = ""`
- enqueues background processing

Response:

```json
{ "success": true, "queued": true }
```

`queued` can be `false` if already queued/active.

#### `GET /events/status/:uuid`
Used for polling progress.

Response:

```json
{
  "askedAnalysis": true,
  "finished": false,
  "reportUrl": ""
}
```

When analysis finishes, `finished=true` and `reportUrl` contains signed URL (if upload/sign succeeded).

### Generation APIs (currently daemon-driven, not used by web frontend)

#### `POST /generate/rules?toolname=auditd`
Body:

```json
{ "contents": "optional project summary text" }
```

Behavior:

- validates `toolname`
- generates rules with retries + daemon validation/write/restart flow
- writes to configured tool file (`/etc/audit/rules.d/bannin.rules`)

Response body: plain text (`"success"` on success, error text on failure)

#### `POST /generate/summary`
Input accepted from:

- query: `?path=...`
- body: `{ "path": "..." }` or `{ "projectRoot": "..." }`

Behavior:

- runs project summariser agent
- writes summary to daemon file `~/.bannin/project-summary.md`

Response body: plain text (`"success"` or error)

## 4) Next.js frontend API layer (proxy routes)

All current web pages call Next routes, not backend directly.

- `GET /api/events/all` -> forwards to `${BACKEND_URL}/events/all`
- `GET /api/events/:id` -> forwards to `${BACKEND_URL}/events/:id`
- `GET /api/events/analyse/:id` -> forwards to `${BACKEND_URL}/events/analyse/:id`
- `GET /api/events/status/:id` -> forwards to `${BACKEND_URL}/events/status/:id`

Files:

- `client/src/app/api/events/all/route.ts`
- `client/src/app/api/events/[id]/route.ts`
- `client/src/app/api/events/analyse/[id]/route.ts`
- `client/src/app/api/events/status/[id]/route.ts`

Env requirement:

```bash
BACKEND_URL=http://localhost:4000
```

## 5) Current frontend usage patterns

## `/events/all` page (`client/src/app/events/all/page.tsx`)

Fetch pattern:

- uses TanStack Query (`@tanstack/react-query`) with key `["events", "all", queryString]`
- query fn fetches `/api/events/all?${searchParams}`
- supports filters: date range, rows, sort (`lf`/`of`)

Rendering:

- table columns: source, timestamp, priority, description, count, analysis state, report link
- row click navigates to `/event/{id}`
- live chart card (`recharts`) visualizes attack volume, high/critical count, and pending analysis trend

Polling:

- automatic refetch every 5 seconds (`refetchInterval: 5000`)
- keeps a local rolling trend history for charting

## `/event/[id]` page (`client/src/app/event/[id]/page.tsx`)

Initial load:

- fetch `/api/events/{id}`
- renders metadata + description + raw JSON payload

Action:

- "Analyse incident" button calls `/api/events/analyse/{id}`

Polling:

- while pending, polls `/api/events/status/{id}` every 5 seconds
- when `finished=true`, updates report link + status chips

## 6) Status state machine for UI

Use this mapping in refactor (cards, chips, CTA, banners):

- `askedAnalysis=false, finished=false, reportUrl=""`
  - status label: `Idle`
  - CTA: show `Analyse incident`
- `askedAnalysis=true, finished=false`
  - status label: `Queued` / `In progress`
  - CTA: disabled spinner/loader
- `askedAnalysis=true, finished=true, reportUrl!=""`
  - status label: `Completed`
  - CTA: `View report`
- `askedAnalysis=true, finished=true, reportUrl=""`
  - status label: `Completed (report unavailable)`
  - show warning text (upload/signing failed case)

## 7) Frontend refactor recommendations

### Create a single typed API client

Suggested file: `client/src/lib/api/events.ts`

Responsibilities:

- define `EventSummary`, `EventDetail`, `EventStatus`, `AnalyseResponse` types
- centralize fetch + error handling
- keep page components focused on UI only

### Extract reusable hooks

- `useEventsList(filters)`
- `useEventDetail(id)`
- `useEventStatusPolling(id, enabled)`

This will remove duplicated polling logic and make tests easier.

### Normalize priority rendering

Current color logic is tuned to `Critical/Medium`, but daemon emits values like `Info/Warning/High`.
Use a normalized map:

- high-like: `Critical|High`
- medium-like: `Medium|Warning`
- low-like: `Low|Info|default`

### Handle expiring report URLs

Report links are signed S3 URLs with short TTL (5-10 min by config clamp). If a user keeps detail page open, allow refresh action or re-fetch status before opening.

## 8) Internal daemon API (not for browser UI)

Daemon local server (`:8080`) exposes:

- `GET /tools/read?path=...`
- `POST /tools/write?path=...`
- `POST /tools/edit?path=...`
- `GET|POST /tools/validate?toolname=auditd`
- `GET /tools/restart?toolname=auditd`
- `GET /tools/direnum?path=...&level=...`

These are used by backend agents/services (`server/src/services/daemonToolsClient.ts`), not by Next pages.

## 9) Config gotchas to keep in mind during refactor

Current local-development defaults (aligned):

- `server/src/config/env.ts` default backend port: `4000`
- `server/.env.example` shows `PORT=4000`
- `client/.env.example` points to `http://localhost:4000`
- `daemon/cmd/daemon/main.go` hardcodes backend URL as `http://localhost:4000`

---

If you add frontend screens for rule generation next, create Next proxy routes for:

- `POST /api/generate/summary`
- `POST /api/generate/rules`

and normalize plain-text backend responses into JSON for easier UI handling.
