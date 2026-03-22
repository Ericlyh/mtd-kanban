import { NextResponse } from 'next/server'
import { getKanbanData, initKVData } from '../../lib/db'
import type { Project, KanbanItem } from '../../lib/db'

const DEFAULT_PROJECTS: Project[] = [
  { id: 1, name: 'ai-agent-research', status: 'active', current_phase: 'Initial research' },
  { id: 2, name: 'hk-freelance-match', status: 'active', current_phase: 'Tier 1 - MVP Enhancement' },
]

export async function GET() {
  try {
    await initKVData(DEFAULT_PROJECTS, [])
    const data = await getKanbanData()
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
