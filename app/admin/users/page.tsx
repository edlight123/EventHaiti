import { requireAdmin } from '@/lib/auth'
import { isAdmin as isAdminEmail } from '@/lib/admin'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import { revalidatePath } from 'next/cache'
import { updateUserRole } from '@/lib/firestore/user-profile-server'
import { getAdminUsers, getUserById, getUserCounts } from '@/lib/data/users'
import AdminUsersClient from './AdminUsersClient'

type Cursor = { id: string; createdAtMillis: number }

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url')
}

export const revalidate = 60 // Cache for 1 minute

export const dynamic = 'force-dynamic'

async function promoteToOrganizer(formData: FormData) {
  'use server'
  
  const userId = formData.get('userId') as string
  if (!userId) {
    return
  }

  await updateUserRole(userId, 'organizer')
  revalidatePath('/admin/users')
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: { selected?: string | string[] }
}) {
  const { user, error } = await requireAdmin()

  if (error || !user) {
    redirect('/')
  }

  // If we arrived here from Admin Search, auto-redirect directly to organizer details.
  const selectedRaw = searchParams?.selected
  const selectedId = Array.isArray(selectedRaw) ? selectedRaw[0] : selectedRaw
  if (selectedId && typeof selectedId === 'string' && selectedId.trim().length) {
    const selectedUser = await getUserById(selectedId.trim())
    if (selectedUser && (selectedUser.role === 'organizer' || Boolean((selectedUser as any).is_organizer))) {
      redirect(`/admin/organizers/${selectedId.trim()}`)
    }
  }

  // Fetch users and counts in parallel using optimized data layer
  const [usersResult, counts] = await Promise.all([
    // This page is intended as the organizers directory.
    getAdminUsers({ role: 'organizer' }, 200),
    getUserCounts(),
  ])

  const allUsers = usersResult.data

  // Build a serializable cursor for client-side pagination.
  let initialCursor: string | null = null
  if (usersResult.hasMore && usersResult.lastDoc) {
    const lastData: any = (usersResult.lastDoc as any).data?.() || {}
    const createdAt: any = lastData?.created_at
    const createdAtMillis =
      typeof createdAt?.toMillis === 'function'
        ? createdAt.toMillis()
        : typeof createdAt?.toDate === 'function'
          ? createdAt.toDate().getTime()
          : typeof createdAt === 'string'
            ? Date.parse(createdAt)
            : Number.NaN

    if (Number.isFinite(createdAtMillis)) {
      initialCursor = encodeCursor({ id: usersResult.lastDoc.id, createdAtMillis })
    }
  }
  
  // Serialize all data to ensure no Firestore objects are passed to client
  const serializedUsers = allUsers.map((u: any) => ({
    id: u.id || '',
    email: u.email || '',
    full_name: u.full_name || '',
    phone_number: u.phone_number || '',
    role: u.role || 'attendee',
    is_verified: Boolean(u.is_verified),
    verification_status: u.verification_status || 'none',
    is_organizer: Boolean(u.is_organizer),
    created_at: typeof u.created_at === 'string' ? u.created_at : u.created_at?.toISOString?.() || new Date().toISOString(),
    updated_at: typeof u.updated_at === 'string' ? u.updated_at : u.updated_at?.toISOString?.() || new Date().toISOString(),
  }))
  
  // Pre-compute admin status for each user to avoid issues with module-level constants
  // Note: this is an email-based flag (ADMIN_EMAILS) and is used only for UI labeling.
  // Canonical admin access should be role-based via users.role = admin|super_admin.
  const usersWithAdminFlag = serializedUsers.map((u: any) => ({
    ...u,
    isAdminUser: isAdminEmail(u.email)
  }))

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} isAdmin={true} />

      <AdminUsersClient 
        counts={counts}
        usersWithAdminFlag={usersWithAdminFlag}
        initialHasMore={usersResult.hasMore && Boolean(initialCursor)}
        initialCursor={initialCursor}
        promoteToOrganizer={promoteToOrganizer}
      />

      <MobileNavWrapper user={user} isAdmin={true} />
    </div>
  )
}