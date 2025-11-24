'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface FollowButtonProps {
  organizerId: string
  userId: string | null
  initialIsFollowing?: boolean
}

export default function FollowButton({ organizerId, userId, initialIsFollowing = false }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function toggleFollow() {
    if (!userId) {
      router.push('/auth/login?callbackUrl=' + window.location.pathname)
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/organizers/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizerId })
      })

      if (!response.ok) throw new Error('Failed to toggle follow')

      const data = await response.json()
      setIsFollowing(data.isFollowing)
      router.refresh()
    } catch (error) {
      console.error('Error toggling follow:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggleFollow}
      disabled={loading}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        isFollowing
          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
          : 'bg-teal-600 text-white hover:bg-teal-700'
      } disabled:opacity-50`}
    >
      {loading ? 'Loading...' : isFollowing ? 'Following' : 'Follow'}
    </button>
  )
}
