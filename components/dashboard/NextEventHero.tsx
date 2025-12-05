'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Calendar, MapPin, Download, Navigation, Video, Clock } from 'lucide-react'
import { format, formatDistanceToNow, differenceInHours, isPast } from 'date-fns'
import { useTranslation } from 'react-i18next'

interface NextEventHeroProps {
  event: {
    id: string
    title: string
    banner_image_url?: string | null
    start_datetime: string
    venue_name: string
    city: string
    commune?: string
  }
  ticketId?: string
  orderId?: string
}

export function NextEventHero({ event, ticketId, orderId }: NextEventHeroProps) {
  const { t } = useTranslation('dashboard')
  const eventDate = new Date(event.start_datetime)
  const now = new Date()
  const hoursUntilEvent = differenceInHours(eventDate, now)
  const isEventSoon = hoursUntilEvent >= 0 && hoursUntilEvent <= 24
  const isPastEvent = isPast(eventDate)
  
  // Check if online event
  const isOnline = event.venue_name?.toLowerCase().includes('online') || 
                   event.venue_name?.toLowerCase().includes('virtual') ||
                   event.city?.toLowerCase() === 'online'

  // Format date in human-friendly way
  const formattedDate = format(eventDate, 'EEEE, MMMM d')
  const formattedTime = format(eventDate, 'h:mm a')
  const relativeTime = formatDistanceToNow(eventDate, { addSuffix: true })

  // Create .ics calendar download
  const handleAddToCalendar = () => {
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${format(eventDate, "yyyyMMdd'T'HHmmss")}
SUMMARY:${event.title}
LOCATION:${event.venue_name}, ${event.city}
DESCRIPTION:Event ticket from EventHaiti
END:VEVENT
END:VCALENDAR`
    
    const blob = new Blob([icsContent], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${event.title.replace(/[^a-z0-9]/gi, '_')}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Google Maps link
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${event.venue_name}, ${event.city}`
  )}`

  return (
    <div className="relative bg-gradient-to-br from-brand-600 via-brand-700 to-accent-600 rounded-3xl overflow-hidden shadow-2xl">
      {/* Background Image Overlay */}
      {event.banner_image_url && (
        <div className="absolute inset-0 opacity-20">
          <Image
            src={event.banner_image_url}
            alt=""
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

      {/* Content */}
      <div className="relative p-6 sm:p-8 md:p-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-semibold mb-4">
          <Clock className="w-4 h-4" />
          {isPastEvent ? t('next_event_hero.recently_attended') : isEventSoon ? t('next_event_hero.happening_soon') : t('next_event_hero.next_event')}
        </div>

        {/* Event Details */}
        <div className="space-y-4 mb-6">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white line-clamp-2">
            {event.title}
          </h2>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
            {/* Date & Time */}
            <div className="flex items-start gap-2 text-white/90">
              <Calendar className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{formattedDate}</p>
                <p className="text-sm text-white/75">{formattedTime} · {relativeTime}</p>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-start gap-2 text-white/90">
              {isOnline ? <Video className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />}
              <div>
                <p className="font-semibold">{isOnline ? t('next_event_hero.online_event') : event.city}</p>
                <p className="text-sm text-white/75 line-clamp-1">{event.venue_name}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Primary CTA: View Ticket */}
          <Link
            href={`/tickets`}
            className="flex-1 sm:flex-none px-6 py-3 bg-white text-brand-700 rounded-xl font-bold hover:bg-white/95 transition-all shadow-lg hover:shadow-xl text-center"
          >
            {t('next_event_hero.view_ticket_qr')}
          </Link>

          {/* Secondary CTAs */}
          <div className="flex gap-3">
            <button
              onClick={handleAddToCalendar}
              className="flex-1 sm:flex-none px-4 py-3 bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white rounded-xl font-semibold hover:bg-white/20 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">{t('next_event_hero.add_to_calendar')}</span>
              <span className="sm:hidden">{t('next_event_hero.calendar_short')}</span>
            </button>

            {/* Directions or Join Link */}
            {isOnline && isEventSoon ? (
              <button
                className="flex-1 sm:flex-none px-4 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-all flex items-center justify-center gap-2"
              >
                <Video className="w-4 h-4" />
                <span className="hidden sm:inline">{t('next_event_hero.join_event')}</span>
                <span className="sm:hidden">{t('next_event_hero.join_short')}</span>
              </button>
            ) : !isOnline ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none px-4 py-3 bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white rounded-xl font-semibold hover:bg-white/20 transition-all flex items-center justify-center gap-2"
              >
                <Navigation className="w-4 h-4" />
                <span className="hidden sm:inline">{t('next_event_hero.directions')}</span>
                <span className="sm:hidden">{t('next_event_hero.map_short')}</span>
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
