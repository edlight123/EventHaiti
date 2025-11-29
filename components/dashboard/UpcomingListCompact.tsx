import Link from 'next/link'
import { Calendar, MapPin, Ticket, ArrowRight, Clock } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

interface UpcomingEvent {
  id: string
  title: string
  start_datetime: string
  venue_name: string
  city: string
  commune?: string
}

interface UpcomingListCompactProps {
  events: UpcomingEvent[]
}

export function UpcomingListCompact({ events }: UpcomingListCompactProps) {
  const displayEvents = events.slice(0, 3)

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-8 text-center">
        <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-brand-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">No upcoming events</h3>
        <p className="text-sm text-gray-600 mb-6">You haven&apos;t purchased any tickets yet</p>
        <Link
          href="/discover"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-600 to-accent-600 text-white rounded-xl font-semibold hover:shadow-glow transition-all"
        >
          Browse Events
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {displayEvents.map((event) => {
        const eventDate = new Date(event.start_datetime)
        const isOnline = event.venue_name?.toLowerCase().includes('online') || 
                         event.venue_name?.toLowerCase().includes('virtual')
        
        return (
          <div
            key={event.id}
            className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between gap-4">
              {/* Event Info */}
              <div className="flex-1 min-w-0">
                <Link 
                  href={`/events/${event.id}`}
                  className="block group-hover:text-brand-600 transition-colors"
                >
                  <h3 className="font-bold text-gray-900 line-clamp-1 mb-2">
                    {event.title}
                  </h3>
                </Link>

                <div className="space-y-1.5">
                  {/* Date & Time */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 flex-shrink-0 text-brand-600" />
                      <span className="font-medium">
                        {format(eventDate, 'MMM d, yyyy')}
                      </span>
                    </div>
                    <span className="text-gray-400">•</span>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 flex-shrink-0" />
                      <span>{format(eventDate, 'h:mm a')}</span>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 flex-shrink-0 text-accent-600" />
                    <span className="truncate">
                      {isOnline ? 'Online Event' : `${event.city}${event.commune ? `, ${event.commune}` : ''}`}
                    </span>
                  </div>

                  {/* Relative Time */}
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(eventDate, { addSuffix: true })}
                  </p>
                </div>
              </div>

              {/* Ticket Button */}
              <Link
                href="/tickets"
                className="flex-shrink-0 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
              >
                <Ticket className="w-4 h-4" />
                <span className="hidden sm:inline">Ticket</span>
              </Link>
            </div>
          </div>
        )
      })}

      {/* View All Link */}
      {events.length > 3 && (
        <Link
          href="/tickets"
          className="block text-center py-3 text-brand-600 hover:text-brand-700 font-semibold hover:bg-brand-50 rounded-xl transition-colors"
        >
          View all {events.length} events →
        </Link>
      )}
    </div>
  )
}
