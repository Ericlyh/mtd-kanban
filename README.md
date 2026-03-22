# MakeThingsDone Kanban

Event-driven Kanban board powered by MTD agent. Read from Vercel KV, synced from MTD's SQLite event database.

## Setup

### 1. Create Vercel KV Database

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Create KV database
vercel kv create kanban
```

This gives you:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

### 2. Add Environment Variables in Vercel

Go to your Vercel project → Settings → Environment Variables:
- `KV_REST_API_URL` = your KV_REST_API_URL
- `KV_REST_API_TOKEN` = your KV_REST_API_TOKEN

### 3. Deploy

```bash
npm install
npm run build
vercel deploy
```

Or connect the GitHub repo to Vercel for auto-deploy on push.

### 4. Configure MTD Sync (on container)

Add to MTD's cron or run manually:

```bash
./scripts/sync-to-vercel.sh <KV_REST_API_URL> <KV_REST_API_TOKEN>
```

Or set environment variables:
```bash
export KV_REST_API_URL="https://..."
export KV_REST_API_TOKEN="..."
./scripts/sync-to-vercel.sh
```

## MTD Agent Sync (for Ethan)

MTD logs events to `events/events.db` in its workspace. Run the sync script to push events to the Vercel KV store.

Add to MTD AGENTS.md workflow: after logging significant events, optionally trigger sync.

## Tech Stack

- **Frontend:** Next.js 14 (App Router)
- **Database:** Vercel KV (serverless Redis)
- **Styling:** Vanilla CSS (no Tailwind)
- **Sync:** Bash script → Vercel KV REST API
