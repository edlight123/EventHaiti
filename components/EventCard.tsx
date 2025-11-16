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
}

interface EventCardProps {
  event: Event
}

export default function EventCard({ event }: EventCardProps) {
  const remainingTickets = event.total_tickets - event.tickets_sold
  const isSoldOut = remainingTickets <= 0

  return (
    <Link href={`/events/${event.id}`}>
      <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-200">
        {event.banner_image_url ? (
          <div className="h-48 bg-gray-200 overflow-hidden">
            <img
              src={event.banner_image_url}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="h-48 bg-gradient-to-br from-teal-100 to-orange-100 flex items-center justify-center">
            <span className="text-4xl">🎉</span>
          </div>
        )}

        <div className="p-5">
          <div className="flex items-start justify-between mb-2">
            <span className="inline-block px-3 py-1 text-xs font-medium bg-teal-100 text-teal-800 rounded-full">
              {event.category}
            </span>
            {isSoldOut && (
              <span className="inline-block px-3 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                Sold Out
              </span>
            )}
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
            {event.title}
          </h3>

          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {event.description}
          </p>

          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-600">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {format(new Date(event.start_datetime), 'MMM d, yyyy • h:mm a')}
            </div>

            <div className="flex items-center text-sm text-gray-600">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {event.city}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-lg font-bold text-gray-900">
                {event.ticket_price} {event.currency}
              </span>
              <span className="text-xs text-gray-500">
                {remainingTickets} tickets left
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
