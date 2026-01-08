'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/client'

export type OrganizerNavbarUser = {
  id: string
  full_name: string
  email: string
  role: 'organizer'
}

export function useOrganizerClientGuard(options?: {
  loginRedirectPath?: string
  upgradeRedirectPath?: string
}) {
  const router = useRouter()
  const pathname = usePathname()

  const loginRedirectPath = options?.loginRedirectPath ?? pathname ?? '/organizer'
  const upgradeRedirectPath = options?.upgradeRedirectPath ?? pathname ?? '/organizer'

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [navbarUser, setNavbarUser] = useState<OrganizerNavbarUser | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (!authUser) {
        router.replace(`/auth/login?redirect=${encodeURIComponent(loginRedirectPath)}`)
        return
      }

      setFirebaseUser(authUser)

      try {
        const userDocRef = doc(db, 'users', authUser.uid)
        const userDoc = await getDoc(userDocRef)
        const userData = userDoc.exists() ? (userDoc.data() as any) : null
        const userRole = userData?.role || 'attendee'

        if (userRole !== 'organizer') {
          router.replace(`/organizer?redirect=${encodeURIComponent(upgradeRedirectPath)}`)
          return
        }

        setUserProfile(userData)
        setNavbarUser({
          id: authUser.uid,
          full_name: authUser.displayName || userData?.full_name || '',
          email: authUser.email || userData?.email || '',
          role: 'organizer',
        })
      } catch (error) {
        console.error('Error checking organizer role:', error)
        router.replace('/profile')
        return
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [router, loginRedirectPath, upgradeRedirectPath])

  return { firebaseUser, navbarUser, userProfile, loading }
}
