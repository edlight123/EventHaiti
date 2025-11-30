'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Calendar, MapPin, Users, DollarSign, Edit, Eye, QrCode, Share2 } from 'lucide-react'

interface NextEventHeroProps {
  event: {
    id: string
    title: string
    banner_image_url?: string
    start_datetime: string
    venue_name?: string
    city?: string
    ticketsSold: number
    capacity: number
    revenue: number
  } | null
}

export function NextEventHero({ event }: NextEventHeroProps) {
  if (!event) {
    return (
      <div className="bg-gradient-to-br from-brand-50 to-accent-50 rounded-2xl border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">No upcoming events</h3>
        <p className="text-gray-600 mb-6">Create your next event to see it here</p>
        <Link
          href="/organizer/events/new"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-600 to-accent-600 text-white rounded-xl font-bold hover:shadow-glow transition-all"
        >
          <Calendar className="w-5 h-5" />
          Create Event
        </Link>
      </div>
    )
  }

  const startDate = new Date(event.start_datetime)
  const now = new Date()
  const daysUntil = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const progress = event.capacity > 0 ? (event.ticketsSold / event.capacity) * 100 : 0

  const getCountdownText = () => {
    if (daysUntil < 0) return 'Event passed'
    if (daysUntil === 0) return 'Today!'
    if (daysUntil === 1) return 'Tomorrow'
    if (daysUntil <= 7) return `In ${daysUntil} days`
    return `In ${Math.ceil(daysUntil / 7)} weeks`
  }

  return (
    <div className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden">
      {/* Banner Section */}
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-brand-600 to-accent-600">
        {event.banner_image_url ? (
          <Image
            src={event.banner_image_url}
            alt={event.title}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl md:text-8xl">🎉</span>
          </div>
        )}
        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
          <p className="text-sm font-bold text-brand-600">{getCountdownText()}</p>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6 md:p-8">
        <div className="mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">{event.title}</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">
                {startDate.toLocaleDateString('en-US', { 
                  weekday: 'short',
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </span>
            </div>
            {(event.venue_name || event.city) && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{event.venue_name || event.city}</span>
              </div>
            )}
          </div>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-blue-600" />
              <p className="text-xs font-medium text-blue-900">Tickets Sold</p>
            </div>
            <p className="text-2xl font-bold text-blue-700">{event.ticketsSold}</p>
            <p className="text-xs text-blue-600">of {event.capacity}</p>
          </div>

          <div className="bg-purple-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-purple-600" />
              <p className="text-xs font-medium text-purple-900">Revenue</p>
            </div>
            <p className="text-2xl font-bold text-purple-700">${(event.revenue / 100).toFixed(0)}</p>
            <p className="text-xs text-purple-600">earned</p>
          </div>

          <div className="bg-teal-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-teal-600" />
              <p className="text-xs font-medium text-teal-900">Capacity</p>
            </div>
            <p className="text-2xl font-bold text-teal-700">{progress.toFixed(0)}%</p>
            <p className="text-xs text-teal-600">filled</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-brand-500 to-accent-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            href={`/organizer/events/${event.id}/edit`}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition-colors text-sm"
          >
            <Edit className="w-4 h-4" />
            <span className="hidden sm:inline">Edit</span>
          </Link>
          
          <Link
            href={`/organizer/events/${event.id}/attendees`}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:border-brand-500 hover:text-brand-600 transition-colors text-sm"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Attendees</span>
          </Link>
          
          <Link
            href={`/organizer/scan/${event.id}`}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:border-purple-500 hover:text-purple-600 transition-colors text-sm"
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline">Check-in</span>
          </Link>
          
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: event.title,
                  url: `${window.location.origin}/events/${event.id}`
                })
              } else {
                navigator.clipboard.writeText(`${window.location.origin}/events/${event.id}`)
              }
            }}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:border-teal-500 hover:text-teal-600 transition-colors text-sm"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </div>
    </div>
  )
}
