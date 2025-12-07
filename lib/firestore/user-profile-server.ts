import { adminDb } from '@/lib/firebase/admin'
import type { UserProfile } from './user-profile'

/**
 * Get user profile from Firestore (server-side)
 * Use this in Server Components and API routes
 */
export async function getUserProfileServer(uid: string): Promise<UserProfile | null> {
  try {
    const userDoc = await adminDb.collection('users').doc(uid).get()
    
    if (!userDoc.exists) {
      return null
    }

    const data = userDoc.data()!
    return {
      uid: userDoc.id,
      displayName: data.display_name || data.displayName || '',
      email: data.email || '',
      photoURL: data.photo_url || data.photoURL || '',
      phone: data.phone || '',
      defaultCity: data.default_city || data.defaultCity || '',
      subareaType: data.subarea_type || data.subareaType || 'COMMUNE',
      defaultSubarea: data.default_subarea || data.defaultSubarea || '',
      favoriteCategories: data.favorite_categories || data.favoriteCategories || [],
      language: data.language || 'en',
      notify: {
        reminders: data.notify?.reminders ?? true,
        updates: data.notify?.updates ?? true,
        promos: data.notify?.promos ?? false
      },
      createdAt: (data.created_at?.toDate?.() || data.createdAt?.toDate?.() || new Date()).toISOString(),
      updatedAt: (data.updated_at?.toDate?.() || data.updatedAt?.toDate?.() || new Date()).toISOString()
    }
  } catch (error) {
    console.error('Error fetching user profile (server):', error)
    return null
  }
}

/**
 * Update user role in Firestore (server-side)
 * Use this in Server Actions and API routes
 */
export async function updateUserRole(uid: string, role: 'attendee' | 'organizer'): Promise<{ success: boolean; error?: string }> {
  try {
    await adminDb.collection('users').doc(uid).update({
      role,
      updated_at: new Date()
    })
    
    return { success: true }
  } catch (error) {
    console.error('Error updating user role:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update user role'
    }
  }
}
