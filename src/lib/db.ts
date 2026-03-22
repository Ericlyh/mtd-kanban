import { Redis } from '@upstash/redis'

function createRedisClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    throw new Error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN')
  }
  return new Redis({ url, token })
}

// Parse raw Upstash response - handles both parsed and raw formats
function parseResponse<T>(data: any): T | null {
  if (data === null || data === undefined) return null
  
  // Handle string directly
  if (typeof data === 'string') {
    try { return JSON.parse(data) } catch { return data as any }
  }
  
  // Handle Upstash REST API format { result: ... }
  if (data && typeof data === 'object' && 'result' in data) {
    const result = data.result
    if (result === null) return null
    // Result might be a string that needs parsing
    if (typeof result === 'string') {
      try { return JSON.parse(result) } catch { return result as any }
    }
    return result as T
  }
  
  // Handle { value: ... } format from raw API SET
  if (data && typeof data === 'object' && 'value' in data) {
    const value = data.value
    if (value === null) return null
    if (typeof value === 'string') {
      try { return JSON.parse(value) } catch { return value as any }
    }
    return value as T
  }
  
  return data as T
}

export type Project = {
  id: number
  name: string
  status: string
  current_phase: string | null
}

export type KanbanItem = {
  id: number
  project: string
  project_id: number
  description: string
  context: string | null
  task_id: string | null
  event_type: string
  kanban_column: 'todo' | 'in_progress' | 'done' | null
  created_at: string
}

const KV_PROJECTS = 'kanban:projects'
const KV_EVENTS = 'kanban:events'
const KV_COUNTER = 'kanban:event_counter'

export async function getProjects(): Promise<Project[]> {
  try {
    const redis = createRedisClient()
    const data = await redis.get(KV_PROJECTS)
    const parsed = parseResponse<Project[]>(data)
    return parsed || []
  } catch {
    return []
  }
}

export async function getEvents(): Promise<KanbanItem[]> {
  try {
    const redis = createRedisClient()
    const data = await redis.get(KV_EVENTS)
    const parsed = parseResponse<KanbanItem[]>(data)
    return parsed || []
  } catch {
    return []
  }
}

export async function getKanbanData() {
  const [projects, events] = await Promise.all([getProjects(), getEvents()])
  
  const todo = events.filter(e => e.kanban_column === 'todo').length
  const in_progress = events.filter(e => e.kanban_column === 'in_progress').length
  const done = events.filter(e => e.kanban_column === 'done').length
  
  const stats = { total: events.length, todo, in_progress, done, openBlockers: 0 }
  const blockers: any[] = []
  
  return { projects, events, stats, blockers }
}

export async function moveItem(eventId: number, column: string) {
  const redis = createRedisClient()
  const events = await getEvents()
  const updated = events.map(e => e.id === eventId ? { ...e, kanban_column: column } : e)
  await redis.set(KV_EVENTS, JSON.stringify(updated))
}

export async function addItem(projectId: number, description: string, column: string, taskId?: string) {
  const redis = createRedisClient()
  const events = await getEvents()
  const counterData = await redis.get(KV_COUNTER)
  const counter = parseResponse<number>(counterData) || 0
  const nextId = counter + 1
  
  const projects = await getProjects()
  const project = projects.find(p => p.id === projectId)
  
  const newEvent: KanbanItem = {
    id: nextId,
    project: project?.name || 'unknown',
    project_id: projectId,
    description,
    context: null,
    task_id: taskId || null,
    event_type: 'progress',
    kanban_column: column as any,
    created_at: new Date().toISOString()
  }
  
  await redis.set(KV_EVENTS, JSON.stringify([...events, newEvent]))
  await redis.set(KV_COUNTER, nextId)
}

export async function initKVData(defaultProjects: Project[], defaultEvents: KanbanItem[]) {
  try {
    const redis = createRedisClient()
    const [existingProjects, existingEvents] = await Promise.all([
      redis.get(KV_PROJECTS),
      redis.get(KV_EVENTS)
    ])
    const projParsed = parseResponse(existingProjects)
    const evtParsed = parseResponse(existingEvents)
    if (!projParsed) {
      await redis.set(KV_PROJECTS, JSON.stringify(defaultProjects))
      await redis.set(KV_EVENTS, JSON.stringify(defaultEvents))
      await redis.set(KV_COUNTER, defaultEvents.length)
    }
  } catch {
    // Silently fail
  }
}
