import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const endpoint: string | undefined = body?.endpoint
    if (!endpoint) return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })
    await adminDb.collection('pushSubscriptions').doc(endpoint).delete()
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Bad Request', detail: (e as any)?.message }, { status: 400 })
  }
}
