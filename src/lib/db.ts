import { Redis } from '@upstash/redis'

// Initialize Upstash Redis client
// Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables
function createRedisClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    throw new Error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN environment variables')
  }
  return new Redis({ url, token })
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

// Keys
const KV_PROJECTS = 'kanban:projects'
const KV_EVENTS = 'kanban:events'
const KV_COUNTER = 'kanban:event_counter'

export async function getProjects(): Promise<Project[]> {
  try {
    const redis = createRedisClient()
    const data = await redis.get<Project[]>(KV_PROJECTS)
    return data || []
  } catch {
    return []
  }
}

export async function getEvents(): Promise<KanbanItem[]> {
  try {
    const redis = createRedisClient()
    const data = await redis.get<KanbanItem[]>(KV_EVENTS)
    return data || []
  } catch {
    return []
  }
}

export async function getKanbanData() {
  const [projects, events] = await Promise.all([getProjects(), getEvents()])
  
  const blockers: any[] = []
  const todo = events.filter(e => e.kanban_column === 'todo').length
  const in_progress = events.filter(e => e.kanban_column === 'in_progress').length
  const done = events.filter(e => e.kanban_column === 'done').length
  
  const stats = { total: events.length, todo, in_progress, done, openBlockers: blockers.length }
  
  return { projects, events, stats, blockers }
}

export async function moveItem(eventId: number, column: string) {
  const redis = createRedisClient()
  const events = await getEvents()
  const updated = events.map(e => e.id === eventId ? { ...e, kanban_column: column } : e)
  await redis.set(KV_EVENTS, updated)
}

export async function addItem(projectId: number, description: string, column: string, taskId?: string) {
  const redis = createRedisClient()
  const events = await getEvents()
  const counter = await redis.get<number>(KV_COUNTER) || 0
  const nextId = counter + 1
  
  const project = (await getProjects()).find(p => p.id === projectId)
  
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
  
  await redis.set(KV_EVENTS, [...events, newEvent])
  await redis.set(KV_COUNTER, nextId)
}

export async function initKVData(defaultProjects: Project[], defaultEvents: KanbanItem[]) {
  try {
    const redis = createRedisClient()
    const [existingProjects, existingEvents] = await Promise.all([
      redis.get(KV_PROJECTS),
      redis.get(KV_EVENTS)
    ])
    if (!existingProjects) {
      await redis.set(KV_PROJECTS, defaultProjects)
      await redis.set(KV_EVENTS, defaultEvents)
      await redis.set(KV_COUNTER, defaultEvents.length)
    }
    // Only init events if both are missing (preserve existing events)
  } catch {
    // Silently fail if Redis not configured
  }
}
