import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log('[push/subscribe] Received:', { endpoint: body?.endpoint?.substring(0, 50), hasKeys: !!body?.keys })
    if (!body || !body.endpoint) return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })

    // Accept optional topics array from client (e.g. ["reminders", "promotions"])
    const topics: string[] = Array.isArray(body.topics)
      ? (body.topics as unknown[])
          .filter((t: unknown): t is string => typeof t === 'string')
          .filter((t: string) => t.length <= 32)
          .slice(0, 10)
      : []

    const ref = adminDb.collection('pushSubscriptions').doc(body.endpoint)
    const doc = await ref.get()
    const existing = doc.exists ? doc.data() : null
    const mergedTopics = Array.from(new Set([...(existing?.topics || []), ...topics]))
    // Accept optional userId from body
    const userId = typeof body.userId === 'string' && body.userId.length <= 64 ? body.userId : (existing?.userId || null)

    const data = {
      endpoint: body.endpoint,
      keys: body.keys || {},
      topics: mergedTopics,
      userId,
      updatedAt: new Date().toISOString(),
      createdAt: existing?.createdAt || new Date().toISOString()
    }
    await ref.set(data, { merge: true })
    console.log('[push/subscribe] Success:', { endpoint: data.endpoint.substring(0, 50), topics: data.topics })
    return NextResponse.json({ ok: true, topics: data.topics })
  } catch (e) {
    console.error('[push/subscribe] Error:', e)
    return NextResponse.json({ error: 'Bad Request', detail: (e as any)?.message }, { status: 400 })
  }
}
