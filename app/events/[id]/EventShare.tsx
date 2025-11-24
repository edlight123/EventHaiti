'use client'

import SocialShare from '@/components/SocialShare'

interface EventShareProps {
  eventId: string
  eventTitle: string
}

export default function EventShare({ eventId, eventTitle }: EventShareProps) {
  const eventUrl = typeof window !== 'undefined' ? window.location.href : `https://eventhaiti.com/events/${eventId}`
  
  return <SocialShare eventTitle={eventTitle} eventUrl={eventUrl} />
}
