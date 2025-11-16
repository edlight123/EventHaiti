import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import BuyTicketButton from './BuyTicketButton'

export const revalidate = 0

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('*, users!events_organizer_id_fkey(full_name)')
    .eq('id', params.id)
    .single()

  if (!event || (!event.is_published && event.organizer_id !== user?.id)) {
    notFound()
  }

  const remainingTickets = event.total_tickets - event.tickets_sold
  const isSoldOut = remainingTickets <= 0

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Banner Image */}
        {event.banner_image_url ? (
          <div className="w-full h-80 rounded-2xl overflow-hidden mb-8">
            <img
              src={event.banner_image_url}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-80 rounded-2xl bg-gradient-to-br from-teal-100 to-orange-100 flex items-center justify-center mb-8">
            <span className="text-8xl">🎉</span>
          </div>
        )}

        {/* Event Details */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="inline-block px-3 py-1 text-sm font-medium bg-teal-100 text-teal-800 rounded-full mb-3">
                {event.category}
              </span>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                {event.title}
              </h1>
            </div>
          </div>

          {/* Date & Time */}
          <div className="flex items-center text-gray-700 mb-4">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div>
              <p className="font-semibold">{format(new Date(event.start_datetime), 'EEEE, MMMM d, yyyy')}</p>
              <p className="text-sm text-gray-600">
                {format(new Date(event.start_datetime), 'h:mm a')} - {format(new Date(event.end_datetime), 'h:mm a')}
              </p>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-start text-gray-700 mb-6">
            <svg className="w-5 h-5 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div>
              <p className="font-semibold">{event.venue_name}</p>
              <p className="text-sm text-gray-600">{event.address}</p>
              <p className="text-sm text-gray-600">{event.commune}, {event.city}</p>
            </div>
          </div>

          {/* Description */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">About this event</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{event.description}</p>
          </div>

          {/* Ticket Info */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Ticket Price</p>
                <p className="text-3xl font-bold text-gray-900">
                  {event.ticket_price} {event.currency}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 mb-1">Available Tickets</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {remainingTickets} / {event.total_tickets}
                </p>
              </div>
            </div>

            {isSoldOut ? (
              <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg text-center font-semibold">
                This event is sold out
              </div>
            ) : user ? (
              <BuyTicketButton eventId={event.id} userId={user.id} />
            ) : (
              <a
                href="/auth/login"
                className="block w-full bg-teal-700 hover:bg-teal-800 text-white text-center font-semibold py-4 px-6 rounded-lg transition-colors"
              >
                Sign in to buy ticket
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
