'use client'

import Link from 'next/link'
import { format } from 'date-fns'

interface TicketCardProps {
  eventId: string
  title: string
  bannerImageUrl?: string
  startDatetime?: string
  venueName?: string
  city?: string
  ticketCount: number
}

export default function TicketCard({ 
  eventId,
  title,
  bannerImageUrl,
  startDatetime,
  venueName,
  city,
  ticketCount 
}: TicketCardProps) {
  const handleClick = (e: React.MouseEvent) => {
    console.log('Link clicked! Event ID:', eventId)
    console.log('Will navigate to:', `/tickets/event/${eventId}`)
  }

  return (
    <Link
      href={`/tickets/event/${eventId}`}
      onClick={handleClick}
      className="block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 overflow-hidden"
    >
      <div className="md:flex">
        {bannerImageUrl ? (
          <div className="md:w-48 h-48 md:h-auto bg-gray-200">
            <img
              src={bannerImageUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="md:w-48 h-48 md:h-auto bg-gradient-to-br from-teal-100 to-orange-100 flex items-center justify-center">
            <span className="text-4xl">🎟️</span>
          </div>
        )}

        <div className="flex-1 p-6">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-xl font-semibold text-gray-900">
              {title}
            </h3>
            <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
              {ticketCount} {ticketCount === 1 ? 'Ticket' : 'Tickets'}
            </span>
          </div>

          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {startDatetime ? format(new Date(startDatetime), 'EEEE, MMM d, yyyy • h:mm a') : 'Date TBA'}
            </div>

            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {venueName || 'Venue TBA'}, {city || 'Location TBA'}
            </div>
          </div>

          <div className="mt-4">
            <span className="text-teal-700 text-sm font-medium">
              View Tickets & QR Codes →
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
