import { createClient } from '@/lib/supabase/server'
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

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }

  // Get user profile from database
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
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
