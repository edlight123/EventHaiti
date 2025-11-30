'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'
import { getUserProfile, createUserProfile, updateUserProfile, type UserProfile } from '@/lib/firestore/user-profile'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import { ProfileHeaderCard } from '@/components/profile/ProfileHeaderCard'
import { PreferencesCard } from '@/components/profile/PreferencesCard'
import { NotificationsCard } from '@/components/profile/NotificationsCard'
import { AccountCard } from '@/components/profile/AccountCard'
import { Loader2 } from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.push('/auth/login?redirect=/me/profile')
        return
      }

      setUser(firebaseUser)

      try {
        // Try to get existing profile
        let userProfile = await getUserProfile(firebaseUser.uid)

        // If profile doesn't exist, create it
        if (!userProfile) {
          await createUserProfile(firebaseUser.uid, {
            displayName: firebaseUser.displayName || '',
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || '',
            phone: '',
            defaultCity: '',
            subareaType: 'COMMUNE',
            defaultSubarea: '',
            favoriteCategories: [],
            language: 'en',
            notify: {
              reminders: true,
              updates: true,
              promos: false
            }
          })

          // Fetch the newly created profile
          userProfile = await getUserProfile(firebaseUser.uid)
        }

        setProfile(userProfile)
      } catch (err) {
        console.error('Error loading profile:', err)
        setError('Failed to load profile')
      } finally {
        setIsLoading(false)
      }
    })

    return () => unsubscribe()
  }, [router])

  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return

    try {
      // Optimistic update
      setProfile(prev => prev ? { ...prev, ...updates } : prev)

      // Update in Firestore
      await updateUserProfile(user.uid, updates)

      // Show success toast (you can add a toast library)
      console.log('Profile updated successfully')
    } catch (error) {
      console.error('Failed to update profile:', error)
      // Revert optimistic update on error
      const currentProfile = await getUserProfile(user.uid)
      setProfile(currentProfile)
      throw error
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Profile</h1>
          <p className="text-gray-600 mb-6">{error || 'Something went wrong'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>

        {/* Profile Cards */}
        <div className="space-y-6">
          {/* Profile Header */}
          <ProfileHeaderCard profile={profile} onUpdate={handleUpdateProfile} />

          {/* Preferences */}
          <PreferencesCard profile={profile} onUpdate={handleUpdateProfile} />

          {/* Notifications */}
          <NotificationsCard profile={profile} onUpdate={handleUpdateProfile} />

          {/* Account */}
          <AccountCard />
        </div>
      </div>

      <MobileNavWrapper user={user} />
    </div>
  )
}
