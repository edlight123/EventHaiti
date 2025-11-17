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
    <Link href={`/events/${event.id}`} className="group">
      <div className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 group-hover:-translate-y-1">
        {event.banner_image_url ? (
          <div className="h-48 bg-gray-200 overflow-hidden relative">
            <img
              src={event.banner_image_url}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {isSoldOut && (
              <div className="absolute top-3 right-3 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                SOLD OUT
              </div>
            )}
          </div>
        ) : (
          <div className="h-48 bg-gradient-to-br from-teal-100 to-orange-100 flex items-center justify-center relative group-hover:from-teal-200 group-hover:to-orange-200 transition-colors">
            <span className="text-4xl">🎉</span>
            {isSoldOut && (
              <div className="absolute top-3 right-3 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                SOLD OUT
              </div>
            )}
          </div>
        )}

        <div className="p-5">
          <div className="flex items-start justify-between mb-2">
            <span className="inline-block px-3 py-1 text-xs font-semibold bg-teal-100 text-teal-800 rounded-full">
              {event.category}
            </span>
          </div>

          <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-teal-700 transition-colors">
            {event.title}
          </h3>

          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {event.description}
          </p>

          <div className="space-y-2 mb-4">
            <div className="flex items-center text-sm text-gray-700">
              <svg className="w-4 h-4 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-medium">{format(new Date(event.start_datetime), 'MMM d, yyyy • h:mm a')}</span>
            </div>

            <div className="flex items-center text-sm text-gray-700">
              <svg className="w-4 h-4 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-medium">{event.city}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-500 mb-1">From</p>
              <p className="text-xl font-bold text-gray-900">
                {event.ticket_price} <span className="text-sm font-normal text-gray-600">{event.currency}</span>
              </p>
            </div>
            {!isSoldOut && (
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">Available</p>
                <p className="text-sm font-semibold text-teal-700">
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
