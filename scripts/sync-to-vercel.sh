#!/bin/bash
# MTD sync script: Push events from MTD's SQLite to Vercel KV
# Usage: ./sync-to-vercel.sh <VercelKV_REST_API_URL> <VercelKV_REST_API_TOKEN>
#
# Or set environment variables:
#   export KV_REST_API_URL="https://..."
#   export KV_REST_API_TOKEN="..."

set -e

KV_URL="${1:-$KV_REST_API_URL}"
KV_TOKEN="${2:-$KV_REST_API_TOKEN}"

if [ -z "$KV_URL" ] || [ -z "$KV_TOKEN" ]; then
  echo "Usage: $0 <KV_REST_API_URL> <KV_REST_API_TOKEN>"
  echo "Or set KV_REST_API_URL and KV_REST_API_TOKEN environment variables"
  exit 1
fi

WORKSPACE="/home/node/.openclaw/workspace-makethingsdone"
DB_PATH="$WORKSPACE/events/events.db"

echo "Syncing MTD events to Vercel KV..."

# Export projects
PROJECTS=$(python3 -c "
import sqlite3, json
db = sqlite3.connect('$DB_PATH')
projects = db.execute('SELECT id, name, status, current_phase FROM projects').fetchall()
result = [{'id': p[0], 'name': p[1], 'status': p[2], 'current_phase': p[3]} for p in projects]
print(json.dumps(result))
db.close()
")

curl -s -X PUT "$KV_URL/kanban:projects" \
  -H "Authorization: Bearer $KV_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PROJECTS" > /dev/null
echo "  Synced projects: $(echo $PROJECTS | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))')"

# Export events with kanban_column
EVENTS=$(python3 -c "
import sqlite3, json
db = sqlite3.connect('$DB_PATH')
events = db.execute('''
  SELECT e.id, p.name, e.project_id, e.description, e.context, e.task_id, e.event_type, e.kanban_column, e.created_at
  FROM events e JOIN projects p ON e.project_id = p.id
  WHERE e.kanban_column IS NOT NULL
  ORDER BY e.project_id, e.created_at DESC
''').fetchall()
result = [{'id': e[0], 'project': e[1], 'project_id': e[2], 'description': e[3], 'context': e[4], 'task_id': e[5], 'event_type': e[6], 'kanban_column': e[7], 'created_at': e[8]} for e in events]
print(json.dumps(result))
db.close()
")

curl -s -X PUT "$KV_URL/kanban:events" \
  -H "Authorization: Bearer $KV_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$EVENTS" > /dev/null
echo "  Synced events: $(echo $EVENTS | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))')"

# Export counter
COUNTER=$(echo $EVENTS | python3 -c "import json,sys; events=json.load(sys.stdin); print(max(e['id'] for e in events) if events else 0)")
curl -s -X PUT "$KV_URL/kanban:event_counter" \
  -H "Authorization: Bearer $KV_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$COUNTER" > /dev/null

echo "Sync complete!"
