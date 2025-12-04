import { getCurrentUser } from '@/lib/auth'
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
  
  const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(e => e)

  if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
    redirect('/')
  }

  // Fetch users and counts in parallel using optimized data layer
  const [usersResult, counts] = await Promise.all([
    getAdminUsers({}, 200), // Get first 200 users with pagination support
    getUserCounts(),
  ])

  const allUsers = usersResult.data
  
  // Pre-compute admin status for each user to avoid issues with module-level constants
  const usersWithAdminFlag = allUsers.map((u: any) => ({
    ...u,
    isAdminUser: ADMIN_EMAILS.includes(u.email || '')
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