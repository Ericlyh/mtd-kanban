'use client'

import { useEffect, useState } from 'react'

type Project = { id: number; name: string; status: string; current_phase: string | null }
type KanbanItem = {
  id: number; project: string; project_id: number; description: string
  task_id: string | null; kanban_column: string; created_at: string
}
type Data = { projects: Project[]; events: KanbanItem[]; stats: any }

const COLS = [
  { id: 'todo', label: 'Todo', cls: 'col-todo', numCls: 'blue' },
  { id: 'in_progress', label: 'In Progress', cls: 'col-in_progress', numCls: 'yellow' },
  { id: 'done', label: 'Done', cls: 'col-done', numCls: 'green' },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

async function moveItem(id: number, col: string, setData: (d: Data) => void, data: Data) {
  await fetch('/api/move', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId: id, column: col }) })
  const events = data.events.map(e => e.id === id ? { ...e, kanban_column: col } : e)
  const stats = { ...data.stats, todo: events.filter(e => e.kanban_column === 'todo').length, in_progress: events.filter(e => e.kanban_column === 'in_progress').length, done: events.filter(e => e.kanban_column === 'done').length }
  setData({ ...data, events, stats })
}

async function addItem(projectId: number, description: string, column: string, taskId: string, setData: (d: Data) => void, data: Data) {
  const res = await fetch('/api/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId, description, column, taskId }) })
  if (res.ok) {
    const events = await fetch('/api/kanban').then(r => r.json()).then((d: Data) => d.events)
    const stats = { ...data.stats, todo: events.filter((e: KanbanItem) => e.kanban_column === 'todo').length, in_progress: events.filter((e: KanbanItem) => e.kanban_column === 'in_progress').length, done: events.filter((e: KanbanItem) => e.kanban_column === 'done').length, total: events.length }
    setData({ ...data, events, stats })
  }
}

export default function Home() {
  const [data, setData] = useState<Data | null>(null)

  useEffect(() => { fetch('/api/kanban').then(r => r.json()).then(setData) }, [])

  if (!data) return (
    <main><div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280' }}>Loading...</div></main>
  )

  const { projects, events, stats } = data

  return (
    <main>
      <header>
        <div>
          <h1>MakeThingsDone Kanban</h1>
          <p>Event-driven Kanban -- powered by MTD agent</p>
        </div>
        <div className="stats">
          <div className="stat"><div className="stat-num blue">{stats.todo}</div><div className="stat-label">Todo</div></div>
          <div className="stat"><div className="stat-num yellow">{stats.in_progress}</div><div className="stat-label">In Progress</div></div>
          <div className="stat"><div className="stat-num green">{stats.done}</div><div className="stat-label">Done</div></div>
          <div className="stat"><div className="stat-num red">{stats.openBlockers}</div><div className="stat-label">Blockers</div></div>
        </div>
      </header>

      {data.blockers && data.blockers.length > 0 && (
        <div className="blockers">
          <h3>Open Blockers</h3>
          <ul>{data.blockers.map((b: any, i: number) => <li key={i}>[{b.project}] {b.blocker_text}</li>)}</ul>
        </div>
      )}

      {projects.map(project => {
        const projEvents = events.filter(e => e.project_id === project.id)
        return (
          <div key={project.id} className="project">
            <div className="project-header">
              <h2>{project.name}</h2>
              <span className={`badge ${project.status === 'active' ? 'badge-active' : 'badge-blocked'}`}>{project.status}</span>
              {project.current_phase && <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{project.current_phase}</span>}
            </div>
            <div className="columns">
              {COLS.map(col => {
                const colEvents = projEvents.filter(e => e.kanban_column === col.id)
                return (
                  <div key={col.id} className={`col ${col.cls}`}>
                    <div className="col-header">
                      <span>{col.label}</span>
                      <span className="col-count">{colEvents.length}</span>
                    </div>
                    <div>
                      {colEvents.length === 0
                        ? <div className="btn-empty">No items</div>
                        : colEvents.map(item => (
                          <div key={item.id} className="card">
                            <p>{item.description}</p>
                            {item.task_id && <p className="task-id">{item.task_id}</p>}
                            <div className="card-footer">
                              <span className="date">{formatDate(item.created_at)}</span>
                              <div className="actions">
                                {COLS.filter(c => c.id !== col.id).map(c => (
                                  <button key={c.id} className={`btn-${c.id}`} onClick={() => moveItem(item.id, c.id, setData, data)}> {c.label}</button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      <div className="add-form">
        <div className="field">
          <label>Task</label>
          <input type="text" id="descInput" placeholder="What needs to be done?" />
        </div>
        <div className="field">
          <label>Project</label>
          <select id="projInput">{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        </div>
        <div className="field">
          <label>Column</label>
          <select id="colInput">
            <option value="todo">Todo</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>
        <div className="field" style={{ maxWidth: '6rem' }}>
          <label>Task ID</label>
          <input type="text" id="taskInput" placeholder="T1-007" />
        </div>
        <button onClick={() => {
          const desc = (document.getElementById('descInput') as HTMLInputElement).value
          const projId = parseInt((document.getElementById('projInput') as HTMLSelectElement).value)
          const col = (document.getElementById('colInput') as HTMLSelectElement).value
          const taskId = (document.getElementById('taskInput') as HTMLInputElement).value
          if (desc) { addItem(projId, desc, col, taskId, setData, data); (document.getElementById('descInput') as HTMLInputElement).value = ''; (document.getElementById('taskInput') as HTMLInputElement).value = '' }
        }}>+ Add</button>
      </div>
    </main>
  )
}
