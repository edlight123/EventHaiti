import { getServerSession } from '@/lib/firebase/server'
import { adminDb } from '@/lib/firebase/admin'
import { UserRole } from '@/types/database'
import { isDemoMode } from '@/lib/demo'
import { cookies } from 'next/headers'

async function getDemoUser() {
  if (!isDemoMode()) return null
  
  // In demo mode, we can't use localStorage on server side
  // So we'll check for a cookie instead
  const cookieStore = await cookies()
  const demoUserCookie = cookieStore.get('demo_user')
  
  if (!demoUserCookie) return null
  
  try {
    return JSON.parse(demoUserCookie.value)
  } catch {
    return null
  }
}

export async function getCurrentUser() {
  // Check for demo user first
  if (isDemoMode()) {
    const demoUser = await getDemoUser()
    if (demoUser) {
      return {
        id: demoUser.id,
        email: demoUser.email,
        full_name: demoUser.email === 'demo-organizer@eventhaiti.com' ? 'Demo Organizer' : 'Demo Attendee',
        role: demoUser.role as UserRole,
        phone_number: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }
  }

  const { user, error } = await getServerSession()
  
  if (error || !user) {
    return null
  }

  // Get user profile from Firestore
  const userDoc = await adminDb.collection('users').doc(user.id).get()
  
  if (!userDoc.exists) {
    return null
  }

  const userData = userDoc.data()
  
  // Convert Firestore Timestamps to ISO strings to prevent serialization errors
  const created_at = userData?.created_at?.toDate ? userData.created_at.toDate().toISOString() : (userData?.created_at || new Date().toISOString())
  const updated_at = userData?.updated_at?.toDate ? userData.updated_at.toDate().toISOString() : (userData?.updated_at || new Date().toISOString())
  
  return {
    id: userDoc.id,
    email: userData?.email || user.email || '',
    full_name: userData?.full_name || '',
    role: userData?.role || 'attendee',
    phone_number: userData?.phone_number || null,
    is_verified: userData?.is_verified || false,
    verification_status: userData?.verification_status || 'none',
    created_at,
    updated_at
  } as any
}

export async function requireAuth(requiredRole?: UserRole) {
  const user = await getCurrentUser()
  
  if (!user) {
    return { user: null, error: 'Not authenticated' }
  }

  if (requiredRole && user.role !== requiredRole) {
    return { user: null, error: 'Unauthorized' }
  }

  return { user, error: null }
}

export async function isOrganizer() {
  const user = await getCurrentUser()
  return user?.role === 'organizer'
}
