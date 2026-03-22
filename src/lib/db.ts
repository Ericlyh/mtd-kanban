import { kv } from '@vercel/kv'

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
  const projects = await kv.get<Project[]>(KV_PROJECTS)
  return projects || []
}

export async function getEvents(): Promise<KanbanItem[]> {
  const events = await kv.get<KanbanItem[]>(KV_EVENTS)
  return events || []
}

export async function getKanbanData() {
  const [projects, events] = await Promise.all([getProjects(), getEvents()])
  
  const blockers: any[] = [] // Vercel KV version doesn't have blockers table yet
  
  const todo = events.filter(e => e.kanban_column === 'todo').length
  const in_progress = events.filter(e => e.kanban_column === 'in_progress').length
  const done = events.filter(e => e.kanban_column === 'done').length
  
  const stats = { total: events.length, todo, in_progress, done, openBlockers: blockers.length }
  
  return { projects, events, stats, blockers }
}

export async function moveItem(eventId: number, column: string) {
  const events = await getEvents()
  const updated = events.map(e => e.id === eventId ? { ...e, kanban_column: column } : e)
  await kv.set(KV_EVENTS, updated)
}

export async function addItem(projectId: number, description: string, column: string, taskId?: string) {
  const events = await getEvents()
  const counter = await kv.get<number>(KV_COUNTER) || 0
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
  
  await kv.set(KV_EVENTS, [...events, newEvent])
  await kv.set(KV_COUNTER, nextId)
}

export async function initKVData(defaultProjects: Project[], defaultEvents: KanbanItem[]) {
  const existing = await kv.get(KV_PROJECTS)
  if (!existing) {
    await kv.set(KV_PROJECTS, defaultProjects)
    await kv.set(KV_EVENTS, defaultEvents)
    await kv.set(KV_COUNTER, defaultEvents.length)
  }
}
