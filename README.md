# MakeThingsDone Kanban

Event-driven Kanban board powered by MTD agent. Uses Upstash Redis for storage.

## Setup

### 1. Create Upstash Redis Database (Free)

1. Go to https://console.upstash.com
2. Sign up (free tier: 10K commands/day)
3. Create a new Redis database
4. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

### 2. Deploy to Vercel

**Option A: Via Vercel Dashboard**
1. Go to https://vercel.com/new
2. Import `Ericlyh/mtd-kanban`
3. Add environment variables:
   - `UPSTASH_REDIS_REST_URL` = (from Upstash)
   - `UPSTASH_REDIS_REST_TOKEN` = (from Upstash)
4. Deploy

**Option B: Via Vercel API (MTD uses this)**
```bash
curl -X POST "https://api.vercel.com/v13/deployments" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "mtd-kanban", "gitSource": {"type": "github", "repo": "Ericlyh/mtd-kanban", "ref": "main", "repoId": 1188501793}}'
```

### 3. MTD Sync (optional — push local events to cloud)

After deploying, run the sync script to push MTD's SQLite events to Upstash:

```bash
export UPSTASH_REDIS_REST_URL="https://..."
export UPSTASH_REDIS_REST_TOKEN="..."
./scripts/sync-to-upstash.sh
```

## MTD → Kanban Sync

MTD logs events to `events/events.db`. The sync script exports them to Upstash Redis.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), vanilla CSS
- **Database:** Upstash Redis (serverless, free tier)
- **Sync:** Bash script → Upstash REST API
