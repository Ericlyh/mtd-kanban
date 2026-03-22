import { NextResponse } from 'next/server'
import { moveItem } from '../../lib/db'

export async function POST(req: Request) {
  try {
    const { eventId, column } = await req.json()
    if (!eventId || !column) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    await moveItem(Number(eventId), column)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
