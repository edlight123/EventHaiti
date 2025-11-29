import { NextResponse } from 'next/server'
// @ts-expect-error no types
import webpush from 'web-push'
import { adminDb } from '@/lib/firebase/admin'

export const runtime = 'nodejs'

export async function POST() {
  // Fetch all stored subscriptions
  const snap = await adminDb.collection('pushSubscriptions').get()
  const subs: any[] = snap.docs
    .map((d: any) => ({ endpoint: d.id, keys: d.data().keys }))
    .filter((s: any) => s.keys && s.keys.p256dh && s.keys.auth)
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: 'VAPID keys not set' }, { status: 500 })
  }
  if (!subs.length) return NextResponse.json({ error: 'No valid subscriptions (keys missing)' }, { status: 404 })
  webpush.setVapidDetails('mailto:support@eventhaiti.com', process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY)
  const payload = JSON.stringify({ title: 'EventHaiti', body: 'Test notification', data: { url: '/tickets' } })
  type SendResult = { endpoint: string; ok: boolean; error?: string; statusCode?: number }
  const results: SendResult[] = await Promise.all(subs.map(s => webpush
    .sendNotification(s, payload)
    .then((): SendResult => ({ endpoint: s.endpoint, ok: true }))
    .catch((e: any): SendResult => ({ endpoint: s.endpoint, ok: false, error: String(e?.message || 'error'), statusCode: e?.statusCode }))
  ))
  const expired = results.filter((r: SendResult) => !r.ok && (r.statusCode === 410 || r.statusCode === 404))
  await Promise.all(expired.map((r: SendResult) => adminDb.collection('pushSubscriptions').doc(r.endpoint).delete()))
  // Dispatch log (non-blocking)
  try {
    await adminDb.collection('pushDispatchLogs').add({
      kind: 'test',
      title: 'EventHaiti',
      body: 'Test notification',
      url: '/tickets',
      sentCount: results.length,
      successCount: results.filter(r => r.ok).length,
      pruned: expired.map(e => e.endpoint),
      timestamp: new Date().toISOString()
    })
  } catch {}
  return NextResponse.json({ sent: results, pruned: expired.map((e: SendResult) => e.endpoint) })
}
