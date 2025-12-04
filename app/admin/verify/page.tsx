import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import AdminVerifyClient from './AdminVerifyClient'
import { adminDb } from '@/lib/firebase/admin'

export const revalidate = 0

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
      
      // Helper to convert Firestore Timestamps to ISO strings
      const convertTimestamp = (val: any) => {
        if (val?.toDate) return val.toDate().toISOString()
        if (val instanceof Date) return val.toISOString()
        return val
      }
      
      // Serialize all fields to plain objects
      return {
        id: doc.id,
        userId: data.userId || null,
        user_id: data.user_id || null,
        status: data.status || 'pending',
        id_front_url: data.id_front_url || null,
        id_back_url: data.id_back_url || null,
        face_photo_url: data.face_photo_url || null,
        reviewed_by: data.reviewed_by || null,
        rejection_reason: data.rejection_reason || null,
        reviewNotes: data.reviewNotes || null,
        created_at: convertTimestamp(data.created_at),
        updated_at: convertTimestamp(data.updated_at),
        reviewed_at: convertTimestamp(data.reviewed_at),
        submittedAt: convertTimestamp(data.submittedAt),
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
