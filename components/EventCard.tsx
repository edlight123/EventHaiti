import Link from 'next/link'
import { format } from 'date-fns'

interface Event {
  id: string
  title: string
  description: string
  category: string
  city: string
  start_datetime: string
  ticket_price: number
  currency: string
  total_tickets: number
  tickets_sold: number
  banner_image_url?: string | null
  tags?: string[] | null
  users?: {
    full_name: string
    is_verified: boolean
  }
}

interface EventCardProps {
  event: Event
}

export default function EventCard({ event }: EventCardProps) {
  const remainingTickets = event.total_tickets - event.tickets_sold
  const isSoldOut = remainingTickets <= 0
  const isFree = !event.ticket_price || event.ticket_price === 0

  return (
    <Link href={`/events/${event.id}`} className="group">
      <div className="bg-white rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-100 group-hover:-translate-y-2 group-hover:border-teal-200">
        {event.banner_image_url ? (
          <div className="h-48 bg-gray-200 overflow-hidden relative">
            <img
              src={event.banner_image_url}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            />
            {isSoldOut && (
              <div className="absolute top-3 right-3 bg-gradient-to-r from-red-600 to-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm">
                SOLD OUT
              </div>
            )}
          </div>
        ) : (
          <div className="h-48 bg-gradient-to-br from-teal-100 via-teal-50 to-orange-100 flex items-center justify-center relative group-hover:from-teal-200 group-hover:to-orange-200 transition-all duration-500">
            <span className="text-4xl group-hover:scale-110 transition-transform duration-500">🎉</span>
            {isSoldOut && (
              <div className="absolute top-3 right-3 bg-gradient-to-r from-red-600 to-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm">
                SOLD OUT
              </div>
            )}
          </div>
        )}

        <div className="p-6">
          <div className="flex items-start justify-between mb-3">
            <span className="inline-block px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-teal-50 to-teal-100 text-teal-700 rounded-full border border-teal-200">
              {event.category}
            </span>
            {event.users?.is_verified && (
              <div className="inline-flex items-center gap-0.5 text-blue-600" title="Verified Organizer">
                <svg className="w-5 h-5 drop-shadow-sm" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>

          <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-teal-700 transition-colors duration-300">
            {event.title}
          </h3>

          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {event.description}
          </p>

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {event.tags.slice(0, 3).map(tag => (
                <span
                  key={tag}
                  className="px-2.5 py-1 text-xs bg-gray-50 text-gray-600 rounded-lg border border-gray-200 font-medium"
                >
                  {tag}
                </span>
              ))}
              {event.tags.length > 3 && (
                <span className="px-2.5 py-1 text-xs text-gray-500 font-medium">
                  +{event.tags.length - 3}
                </span>
              )}
            </div>
          )}

          <div className="space-y-3 mb-5">
            <div className="flex items-center text-sm text-gray-700">
              <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="font-medium">{format(new Date(event.start_datetime), 'MMM d, yyyy • h:mm a')}</span>
            </div>

            <div className="flex items-center text-sm text-gray-700">
              <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="font-medium">{event.city}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-500 mb-1 font-medium">From</p>
              {isFree ? (
                <p className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">FREE</p>
              ) : (
                <p className="text-2xl font-bold text-gray-900">
                  {event.ticket_price} <span className="text-sm font-normal text-gray-600">{event.currency}</span>
                </p>
              )}
            </div>
            {!isSoldOut && (
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1 font-medium">Available</p>
                <p className="text-sm font-bold text-teal-700">
                  {remainingTickets} {remainingTickets === 1 ? 'ticket' : 'tickets'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
