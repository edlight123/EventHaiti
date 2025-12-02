import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { createHash } from 'crypto'

export const runtime = 'nodejs'

function encodeEndpoint(endpoint: string): string {
  return createHash('sha256').update(endpoint).digest('hex')
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const endpoint: string | undefined = body?.endpoint
    console.log('[push/unsubscribe] Request:', { endpoint: endpoint?.substring(0, 50) })
    if (!endpoint) return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })
    const docId = encodeEndpoint(endpoint)
    await adminDb.collection('pushSubscriptions').doc(docId).delete()
    console.log('[push/unsubscribe] Success')
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[push/unsubscribe] Error:', e)
    return NextResponse.json({ error: 'Bad Request', detail: (e as any)?.message }, { status: 400 })
  }
}
