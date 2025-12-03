import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { getUserProfile, createUserProfile } from '@/lib/firestore/user-profile'
import { getServerSession } from '@/lib/firebase/server'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import ProfileClient from './ProfileClient'

export const revalidate = 60 // Cache for 1 minute

export default async function ProfilePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login?redirect=/profile')
  }

  // Get Firebase session for user ID
  const { user: firebaseUser } = await getServerSession()
  if (!firebaseUser) {
    redirect('/auth/login?redirect=/profile')
  }

  // Try to get existing profile
  let profile = await getUserProfile(firebaseUser.id)

  // If profile doesn't exist, create it
  if (!profile) {
    await createUserProfile(firebaseUser.id, {
      displayName: user.full_name || '',
      email: user.email || '',
      photoURL: '',
      phone: user.phone_number || '',
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
    profile = await getUserProfile(firebaseUser.id)
  }

  if (!profile) {
    redirect('/auth/login?redirect=/profile')
  }

  const isVerifiedOrganizer = profile.verificationStatus === 'approved'

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} isAdmin={isAdmin(user?.email)} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <ProfileClient 
          initialProfile={profile} 
          userId={firebaseUser.id}
          isVerifiedOrganizer={isVerifiedOrganizer}
        />
      </div>

      <MobileNavWrapper user={user} isAdmin={isAdmin(user?.email)} />
    </div>
  )
}
