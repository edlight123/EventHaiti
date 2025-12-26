import { getCurrentUser } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import { revalidatePath } from 'next/cache'
import { updateUserRole } from '@/lib/firestore/user-profile-server'
import { getAdminUsers, getUserCounts } from '@/lib/data/users'
import AdminUsersClient from './AdminUsersClient'

export const revalidate = 60 // Cache for 1 minute

async function promoteToOrganizer(formData: FormData) {
  'use server'
  
  const userId = formData.get('userId') as string
  if (!userId) {
    return
  }

  await updateUserRole(userId, 'organizer')
  revalidatePath('/admin/users')
}

export default async function AdminUsersPage() {
  const user = await getCurrentUser()

  if (!user || !isAdmin(user.email)) {
    redirect('/')
  }

  // Fetch users and counts in parallel using optimized data layer
  const [usersResult, counts] = await Promise.all([
    getAdminUsers({}, 200), // Get first 200 users with pagination support
    getUserCounts(),
  ])

  const allUsers = usersResult.data
  
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
  const usersWithAdminFlag = serializedUsers.map((u: any) => ({
    ...u,
    isAdminUser: isAdmin(u.email)
  }))

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} isAdmin={true} />

      <AdminUsersClient 
        counts={counts}
        usersWithAdminFlag={usersWithAdminFlag}
        promoteToOrganizer={promoteToOrganizer}
      />

      <MobileNavWrapper user={user} />
    </div>
  )
}