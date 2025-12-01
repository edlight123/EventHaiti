'use client'

import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'
import { MoreVertical, Eye, Edit, Copy, Trash2, AlertCircle, CheckCircle, Users } from 'lucide-react'
import { useState } from 'react'

interface EventData {
  id: string
  title: string
  start_datetime: string
  city: string
  commune?: string
  category: string
  is_published: boolean
  banner_image_url?: string
  tickets_sold?: number
  total_tickets?: number
  revenue?: number
  checked_in?: number
  ticket_tiers?: any[]
  location_name?: string
  join_url?: string
}

interface OrganizerEventCardProps {
  event: EventData
  showNeedsAttention?: boolean
  onDuplicate?: (eventId: string) => void
  onDelete?: (eventId: string) => void
}

export default function OrganizerEventCard({
  event,
  showNeedsAttention = true,
  onDuplicate,
  onDelete
}: OrganizerEventCardProps) {
  const [showActionsMenu, setShowActionsMenu] = useState(false)

  const ticketsSold = event.tickets_sold || 0
  const totalTickets = event.total_tickets || 0
  const salesPercentage = totalTickets > 0 ? (ticketsSold / totalTickets) * 100 : 0
  const isSoldOut = ticketsSold >= totalTickets && totalTickets > 0
  const revenue = event.revenue || 0
  const checkedIn = event.checked_in || 0

  // Needs attention logic
  const missingCover = !event.banner_image_url
  const missingTickets = !event.ticket_tiers || event.ticket_tiers.length === 0
  const isDraft = !event.is_published
  const noSales = ticketsSold === 0 && event.is_published

  const needsAttention = missingCover || missingTickets || noSales

  return (
    <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 group">
      {/* Event Banner/Thumbnail */}
      <div className="relative h-48 bg-gray-200 overflow-hidden">
        {event.banner_image_url ? (
          <Image
            src={event.banner_image_url}
            alt={event.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            priority={false}
          />
        ) : (
          <div className="h-full bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 flex items-center justify-center">
            <div className="text-center">
              <span className="text-5xl opacity-30">📸</span>
              {showNeedsAttention && (
                <p className="text-xs text-gray-500 mt-2 font-medium">No cover image</p>
              )}
            </div>
          </div>
        )}

        {/* Badges Overlay */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          {isSoldOut && (
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
              SOLD OUT
            </div>
          )}
          {showNeedsAttention && needsAttention && (
            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              <span>Needs Attention</span>
            </div>
          )}
        </div>

        {/* Status Pill (Bottom Left) */}
        <div className="absolute bottom-3 left-3">
          <span
            className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-full shadow-md ${
              event.is_published
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                : 'bg-gradient-to-r from-gray-700 to-gray-800 text-white'
            }`}
          >
            {event.is_published ? (
              <>
                <CheckCircle className="w-3 h-3" />
                <span>Published</span>
              </>
            ) : (
              <>
                <Edit className="w-3 h-3" />
                <span>Draft</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5">
        {/* Category Badge */}
        <div className="mb-3">
          <span className="inline-block px-3 py-1 text-xs font-semibold bg-gradient-to-r from-teal-50 to-teal-100 text-teal-700 rounded-full border border-teal-200">
            {event.category}
          </span>
        </div>

        {/* Event Title */}
        <Link
          href={`/organizer/events/${event.id}`}
          className="block mb-3 group/title"
        >
          <h3 className="text-lg font-bold text-gray-900 line-clamp-2 group-hover/title:text-teal-700 transition-colors">
            {event.title}
          </h3>
        </Link>

        {/* Event Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-700">
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center mr-2">
              <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="font-medium text-xs">
              {format(new Date(event.start_datetime), 'MMM d, yyyy • h:mm a')}
            </span>
          </div>

          <div className="flex items-center text-sm text-gray-700">
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center mr-2">
              <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="font-medium text-xs line-clamp-1">
              {event.location_name || event.commune || event.city}
            </span>
          </div>
        </div>

        {/* Ticket Sales Progress */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-medium text-gray-600">Ticket Sales</span>
            <span className="text-xs font-bold text-gray-900">
              {ticketsSold} / {totalTickets}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                salesPercentage >= 100
                  ? 'bg-gradient-to-r from-red-500 to-red-600'
                  : salesPercentage >= 75
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600'
                  : salesPercentage >= 50
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                  : 'bg-gradient-to-r from-teal-500 to-teal-600'
              }`}
              style={{ width: `${Math.min(salesPercentage, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">{salesPercentage.toFixed(0)}% sold</p>
        </div>

        {/* Revenue & Check-ins */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
            <p className="text-xs text-green-700 font-medium mb-0.5">Revenue</p>
            <p className="text-lg font-bold text-green-800">
              ${revenue.toLocaleString()}
            </p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center gap-1 mb-0.5">
              <Users className="w-3 h-3 text-blue-700" />
              <p className="text-xs text-blue-700 font-medium">Check-ins</p>
            </div>
            <p className="text-lg font-bold text-blue-800">{checkedIn}</p>
          </div>
        </div>

        {/* Needs Attention Messages */}
        {showNeedsAttention && needsAttention && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs font-semibold text-yellow-800 mb-1">⚠️ Issues to Fix:</p>
            <ul className="text-xs text-yellow-700 space-y-0.5">
              {missingCover && <li>• Add a cover image</li>}
              {missingTickets && <li>• Add at least one ticket tier</li>}
              {noSales && <li>• No tickets sold yet</li>}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Link
            href={`/organizer/events/${event.id}`}
            className="flex-1 px-4 py-2 rounded-lg text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-all text-center flex items-center justify-center gap-1"
          >
            <Eye className="w-4 h-4" />
            <span>View</span>
          </Link>
          <Link
            href={`/organizer/events/${event.id}/edit`}
            className="flex-1 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 shadow-md hover:shadow-lg transition-all text-center flex items-center justify-center gap-1"
          >
            <Edit className="w-4 h-4" />
            <span>Edit</span>
          </Link>

          {/* More Actions Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="px-3 py-2 rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 transition-all"
              aria-label="More actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showActionsMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowActionsMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-20">
                  {onDuplicate && (
                    <button
                      onClick={() => {
                        onDuplicate(event.id)
                        setShowActionsMenu(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Duplicate</span>
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => {
                        onDelete(event.id)
                        setShowActionsMenu(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
