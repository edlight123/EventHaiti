'use client'

import { useEffect, useState } from 'react'
import MobileBottomNav from './MobileBottomNav'

interface MobileNavWrapperProps {
  user?: {
    id: string
    email: string
    role: 'attendee' | 'organizer'
  } | null
  isAdmin?: boolean
}

export default function MobileNavWrapper({ user, isAdmin = false }: MobileNavWrapperProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <MobileBottomNav 
      isLoggedIn={!!user}
      isOrganizer={user?.role === 'organizer'}
      isAdmin={isAdmin}
    />
  )
}
