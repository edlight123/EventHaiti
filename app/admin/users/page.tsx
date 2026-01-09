import { requireAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import { revalidatePath } from 'next/cache'
import { updateUserRole } from '@/lib/firestore/user-profile-server'
import { getUserById, getUserCounts } from '@/lib/data/users'
import AdminUsersClient from './AdminUsersClient'

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
  revalidatePath('/admin/organizers')
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

  const selectedRaw = searchParams?.selected
  const selectedId = Array.isArray(selectedRaw) ? selectedRaw[0] : selectedRaw

  const [counts, selectedUser] = await Promise.all([
    getUserCounts(),
    selectedId && typeof selectedId === 'string' && selectedId.trim().length
      ? getUserById(selectedId.trim())
      : Promise.resolve(null),
  ])

  const selectedUserSerialized = selectedUser
    ? {
        id: (selectedUser as any).id || selectedId || '',
        email: (selectedUser as any).email || '',
        full_name: (selectedUser as any).full_name || (selectedUser as any).name || '',
        phone_number: (selectedUser as any).phone_number || '',
        role: (selectedUser as any).role || 'attendee',
        is_verified: Boolean((selectedUser as any).is_verified),
        verification_status: (selectedUser as any).verification_status || 'none',
        is_organizer: Boolean((selectedUser as any).is_organizer),
        created_at:
          typeof (selectedUser as any).created_at === 'string'
            ? (selectedUser as any).created_at
            : (selectedUser as any).created_at?.toISOString?.() || null,
        updated_at:
          typeof (selectedUser as any).updated_at === 'string'
            ? (selectedUser as any).updated_at
            : (selectedUser as any).updated_at?.toISOString?.() || null,
      }
    : null

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} isAdmin={true} />

      <AdminUsersClient 
        counts={counts}
        selectedUser={selectedUserSerialized}
        promoteToOrganizer={promoteToOrganizer}
      />

      <MobileNavWrapper user={user} isAdmin={true} />
    </div>
  )
}