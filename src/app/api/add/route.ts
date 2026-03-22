import { NextResponse } from 'next/server'
import { addItem } from '../../../lib/db'

export async function POST(req: Request) {
  try {
    const { projectId, description, column, taskId } = await req.json()
    if (!projectId || !description || !column) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    await addItem(Number(projectId), description, column, taskId)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
