import { createClient } from '@/lib/supabase/server'
import { UserRole } from '@/types/database'

export async function getCurrentUser() {
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
