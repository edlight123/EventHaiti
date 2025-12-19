import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import AdminVerifyClient from './AdminVerifyClient'
import { adminDb } from '@/lib/firebase/admin'

export const revalidate = 0

function serializeFirestoreValue(value: any): any {
  if (value == null) return value

  // Firestore Timestamp (admin/client SDK) and other objects that expose toDate()
  if (typeof value?.toDate === 'function') {
    try {
      const date = value.toDate()
      if (date instanceof Date) return date.toISOString()
    } catch {
      // fall through
    }
  }

  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(serializeFirestoreValue)

  if (typeof value === 'object') {
    const output: Record<string, any> = {}
    for (const [key, val] of Object.entries(value)) {
      output[key] = serializeFirestoreValue(val)
    }
    return output
  }

  return value
}

export default async function AdminVerifyPage() {
  const user = await getCurrentUser()

  const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@eventhaiti.com').split(',')

  if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
    redirect('/')
  }

  const supabase = await createClient()
  
  // Fetch all verification requests using Firebase Admin SDK to bypass security rules
  let verificationRequests: any[] = []
  try {
    const snapshot = await adminDb.collection('verification_requests').get()
    verificationRequests = snapshot.docs.map((doc: any) => {
      const data = doc.data()

      // Deep-serialize Firestore values (timestamps, nested objects, arrays)
      const serialized = serializeFirestoreValue(data)

      // Normalize key fields while keeping the entire payload intact.
      const normalizedUserId =
        serialized?.userId || serialized?.user_id || serialized?.userID || serialized?.uid || doc.id

      return {
        id: doc.id,
        ...serialized,
        userId: normalizedUserId,
        user_id: serialized?.user_id ?? serialized?.userId ?? null,
        status: serialized?.status || 'pending',
      }
    })
  } catch (error) {
    console.error('Error fetching verification requests:', error)
  }

  // Fetch all users to match with verification requests
  const allUsers = await supabase.from('users').select('*')
  const users = allUsers.data || []

  // Manually join user data with verification requests
  // Note: Handle both old format (user_id field) and new format (userId field/document ID)
  const requestsWithUsers = verificationRequests.map((request: any) => {
    const userId = request.userId || request.user_id || request.id
    const requestUser = users.find((u: any) => u.id === userId)
    return {
      ...request,
      userId, // Normalize to always have userId
      user: requestUser
    }
  })

  // Filter organizers for quick verification toggle (include verification_status field)
  const organizers = users.filter((u: any) => u.role === 'organizer').map((u: any) => ({
    id: u.id,
    full_name: u.full_name,
    email: u.email,
    is_verified: u.is_verified,
    verification_status: u.verification_status || 'none',
    created_at: u.created_at
  }))

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} isAdmin={isAdmin(user?.email)} />
      
      <AdminVerifyClient 
        requestsWithUsers={requestsWithUsers}
        organizers={organizers}
      />
      
      <MobileNavWrapper user={user} />
    </div>
  )
}
