import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import adminApp from '@/lib/firebase/admin'
import { getCurrentUser } from '@/lib/auth'
import { isAdmin as isAdminEmail } from '@/lib/admin'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const role = user.role
    const emailIsAdmin = isAdminEmail(user.email || '')
    const roleIsAdmin = role === 'admin' || role === 'super_admin'
    if (!emailIsAdmin && !roleIsAdmin) {
      return NextResponse.json(
        {
          error: 'Admin access required',
          details: {
            email: user.email || null,
            role,
            hint: 'Add your email to ADMIN_EMAILS or set users.role to admin/super_admin',
          },
        },
        { status: 403 }
      )
    }

    const organizersSnap = await adminDb
      .collection('users')
      .where('email', '==', 'info@edlight.org')
      .limit(1)
      .get()

    if (organizersSnap.empty) {
      return NextResponse.json(
        { error: 'Organizer account info@edlight.org not found' },
        { status: 404 }
      )
    }

    const organizerId = organizersSnap.docs[0].id

    // Check events that Discover/Home will actually query.
    // Primary: is_published == true
    const publishedSnap = await adminDb
      .collection('events')
      .where('organizer_id', '==', organizerId)
      .where('is_published', '==', true)
      .orderBy('start_datetime', 'asc')
      .limit(10)
      .get()

    // Fallback: legacy status == 'published'
    const statusSnap = publishedSnap.empty
      ? await adminDb
          .collection('events')
          .where('organizer_id', '==', organizerId)
          .where('status', '==', 'published')
          .orderBy('start_datetime', 'asc')
          .limit(10)
          .get()
      : null

    const docs = (publishedSnap.empty ? statusSnap?.docs ?? [] : publishedSnap.docs).map((d: any) => {
      const data = d.data() || {}
      const start = data?.start_datetime?.toDate?.()?.toISOString() || data?.start_datetime || null
      return {
        id: d.id,
        title: data?.title || null,
        is_published: data?.is_published ?? null,
        status: data?.status ?? null,
        start_datetime: start,
        country: data?.country ?? null,
        city: data?.city ?? null,
      }
    })

    return NextResponse.json({
      ok: true,
      demoMode: process.env.NEXT_PUBLIC_DEMO_MODE === 'true',
      clientProjectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || null,
      serverProjectId: (adminApp as any)?.options?.projectId || null,
      organizerId,
      counts: {
        publishedQueryCount: publishedSnap.size,
        statusQueryCount: statusSnap?.size ?? 0,
      },
      sample: docs,
    })
  } catch (error: any) {
    console.error('Error verifying seeded events:', error)
    return NextResponse.json(
      { error: 'Failed to verify seeded events', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
