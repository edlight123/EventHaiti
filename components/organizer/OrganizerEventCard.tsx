'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Calendar, Edit, Eye, QrCode, Share2 } from 'lucide-react'
import Badge from '@/components/ui/Badge'

interface OrganizerEventCardProps {
  event: {
    id: string
    title: string
    banner_image_url?: string
    start_datetime: string
    status: 'published' | 'draft'
    ticketsSold: number
    capacity: number
    city?: string
    venue_name?: string
  }
}

export function OrganizerEventCard({ event }: OrganizerEventCardProps) {
  const progress = event.capacity > 0 ? (event.ticketsSold / event.capacity) * 100 : 0
  const startDate = new Date(event.start_datetime)

  return (
    <Link href={`/organizer/events/${event.id}`} className="block bg-white rounded-xl shadow-soft border border-gray-100 overflow-hidden hover:shadow-medium transition-all group">
      {/* Thumbnail */}
      <div className="relative h-48 bg-gradient-to-br from-brand-100 to-accent-100">
        {event.banner_image_url ? (
          <Image
            src={event.banner_image_url}
            alt={event.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl">🎉</span>
          </div>
        )}
        <div className="absolute top-3 right-3">
          <Badge variant={event.status === 'published' ? 'success' : 'neutral'} size="sm">
            {event.status === 'published' ? 'Published' : 'Draft'}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">{event.title}</h3>
        
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <Calendar className="w-4 h-4" />
          <span>
            {startDate.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              year: 'numeric'
            })}
          </span>
          {(event.venue_name || event.city) && (
            <>
              <span>•</span>
              <span className="truncate">{event.venue_name || event.city}</span>
            </>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">Tickets Sold</span>
            <span className="font-semibold text-gray-900">
              {event.ticketsSold} / {event.capacity}
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-accent-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">{progress.toFixed(0)}% capacity</p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-4 gap-2" onClick={(e) => e.stopPropagation()}>
          <Link
            href={`/organizer/events/${event.id}/edit`}
            className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg hover:bg-brand-50 transition-colors group/btn"
            title="Manage"
            onClick={(e) => e.stopPropagation()}
          >
            <Edit className="w-4 h-4 text-gray-600 group-hover/btn:text-brand-600" />
            <span className="text-xs text-gray-600 group-hover/btn:text-brand-600 font-medium">Manage</span>
          </Link>

          <Link
            href={`/events/${event.id}`}
            target="_blank"
            className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg hover:bg-purple-50 transition-colors group/btn"
            title="Promote"
            onClick={(e) => e.stopPropagation()}
          >
            <Share2 className="w-4 h-4 text-gray-600 group-hover/btn:text-purple-600" />
            <span className="text-xs text-gray-600 group-hover/btn:text-purple-600 font-medium">Promote</span>
          </Link>

          <Link
            href={`/organizer/events/${event.id}/attendees`}
            className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg hover:bg-teal-50 transition-colors group/btn"
            title="Attendees"
            onClick={(e) => e.stopPropagation()}
          >
            <Eye className="w-4 h-4 text-gray-600 group-hover/btn:text-teal-600" />
            <span className="text-xs text-gray-600 group-hover/btn:text-teal-600 font-medium">Attendees</span>
          </Link>

          <Link
            href={`/organizer/scan/${event.id}`}
            className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg hover:bg-orange-50 transition-colors group/btn"
            title="Check-in"
            onClick={(e) => e.stopPropagation()}
          >
            <QrCode className="w-4 h-4 text-gray-600 group-hover/btn:text-orange-600" />
            <span className="text-xs text-gray-600 group-hover/btn:text-orange-600 font-medium">Check-in</span>
          </Link>
        </div>
      </div>
    </Link>
  )
}
