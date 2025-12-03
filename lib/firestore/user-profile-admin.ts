/**
 * Server-side user profile operations using Firebase Admin SDK
 * This bypasses Firestore security rules and should only be used on the server
 */

import { adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

export interface UserProfile {
  uid: string
  displayName: string
  email: string
  photoURL?: string
  phone?: string
  defaultCity?: string
  subareaType?: 'COMMUNE' | 'NEIGHBORHOOD'
  defaultSubarea?: string
  favoriteCategories?: string[]
  language?: 'en' | 'fr' | 'ht'
  notify?: {
    reminders: boolean
    updates: boolean
    promos: boolean
  }
  role?: string
  isVerified?: boolean
  verificationStatus?: string
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Get user profile from Firestore (server-side with admin SDK)
 */
export async function getUserProfileAdmin(uid: string): Promise<UserProfile | null> {
  try {
    const userDoc = await adminDb.collection('users').doc(uid).get()
    
    if (!userDoc.exists) {
      return null
    }

    const data = userDoc.data()!
    return {
      uid: userDoc.id,
      displayName: data.full_name || data.display_name || data.displayName || '',
      email: data.email || '',
      photoURL: data.photo_url || data.photoURL || '',
      phone: data.phone_number || data.phone || '',
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
      role: data.role || 'attendee',
      isVerified: data.is_verified || false,
      verificationStatus: data.verification_status || 'none',
      createdAt: data.created_at?.toDate?.() || data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updated_at?.toDate?.() || data.updatedAt?.toDate?.() || new Date()
    }
  } catch (error) {
    console.error('Error fetching user profile (admin):', error)
    return null
  }
}

/**
 * Create user profile in Firestore (server-side with admin SDK)
 */
export async function createUserProfileAdmin(uid: string, profile: Partial<UserProfile>): Promise<void> {
  try {
    const userRef = adminDb.collection('users').doc(uid)
    
    await userRef.set({
      full_name: profile.displayName || '',
      display_name: profile.displayName || '',
      email: profile.email || '',
      photo_url: profile.photoURL || '',
      phone: profile.phone || '',
      phone_number: profile.phone || '',
      default_city: profile.defaultCity || '',
      subarea_type: profile.subareaType || 'COMMUNE',
      default_subarea: profile.defaultSubarea || '',
      favorite_categories: profile.favoriteCategories || [],
      language: profile.language || 'en',
      notify: {
        reminders: profile.notify?.reminders ?? true,
        updates: profile.notify?.updates ?? true,
        promos: profile.notify?.promos ?? false
      },
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp()
    })
  } catch (error) {
    console.error('Error creating user profile (admin):', error)
    throw error
  }
}

/**
 * Update user profile in Firestore (server-side with admin SDK)
 */
export async function updateUserProfileAdmin(uid: string, updates: Partial<UserProfile>): Promise<void> {
  try {
    const userRef = adminDb.collection('users').doc(uid)
    
    const updateData: any = {
      updated_at: FieldValue.serverTimestamp()
    }

    if (updates.displayName !== undefined) {
      updateData.full_name = updates.displayName
      updateData.display_name = updates.displayName
    }
    if (updates.phone !== undefined) {
      updateData.phone_number = updates.phone
      updateData.phone = updates.phone
    }
    if (updates.photoURL !== undefined) updateData.photo_url = updates.photoURL
    if (updates.defaultCity !== undefined) updateData.default_city = updates.defaultCity
    if (updates.subareaType !== undefined) updateData.subarea_type = updates.subareaType
    if (updates.defaultSubarea !== undefined) updateData.default_subarea = updates.defaultSubarea
    if (updates.favoriteCategories !== undefined) updateData.favorite_categories = updates.favoriteCategories
    if (updates.language !== undefined) updateData.language = updates.language
    if (updates.notify !== undefined) updateData.notify = updates.notify

    await userRef.update(updateData)
  } catch (error) {
    console.error('Error updating user profile (admin):', error)
    throw error
  }
}
