import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { registerUserExpoPushToken } from '@/lib/push/expo'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const token = typeof body?.token === 'string' ? body.token.trim() : ''
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })

  try {
    await registerUserExpoPushToken(user.id, token)
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to register token' }, { status: 400 })
  }
}
