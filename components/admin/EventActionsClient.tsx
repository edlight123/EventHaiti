'use client'

import { useState, useTransition } from 'react'
import { EyeOff, Eye } from 'lucide-react'

interface EventActionsClientProps {
  eventId: string
  isPublished: boolean
  togglePublishStatus: (eventId: string, currentStatus: boolean) => Promise<void>
}

export function EventActionsClient({ 
  eventId, 
  isPublished, 
  togglePublishStatus 
}: EventActionsClientProps) {
  const [isPending, startTransition] = useTransition()

  const handleToggle = () => {
    startTransition(async () => {
      await togglePublishStatus(eventId, isPublished)
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`text-sm font-medium ${
        isPublished 
          ? 'text-orange-600 hover:text-orange-900' 
          : 'text-green-600 hover:text-green-900'
      } disabled:opacity-50`}
      title={isPublished ? 'Unpublish event' : 'Publish event'}
    >
      {isPending ? (
        'Loading...'
      ) : isPublished ? (
        <>
          <span className="hidden sm:inline">Unpublish</span>
          <EyeOff className="w-4 h-4 sm:hidden" />
        </>
      ) : (
        <>
          <span className="hidden sm:inline">Publish</span>
          <Eye className="w-4 h-4 sm:hidden" />
        </>
      )}
    </button>
  )
}
