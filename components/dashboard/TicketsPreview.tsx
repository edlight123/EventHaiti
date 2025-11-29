'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Calendar, MapPin, QrCode, Download, ArrowRight, Ticket } from 'lucide-react'
import { format } from 'date-fns'

interface TicketPreviewItem {
  eventId: string
  eventTitle: string
  eventBanner?: string | null
  eventDate: string
  eventVenue: string
  eventCity: string
  ticketCount: number
  status?: 'active' | 'used' | 'expired'
}

interface TicketsPreviewProps {
  tickets: TicketPreviewItem[]
}

function generateReceipt(ticket: TicketPreviewItem) {
  const receiptContent = `
EventHaiti - Ticket Receipt
${'='.repeat(50)}

EVENT DETAILS
${'-'.repeat(50)}
Event Name: ${ticket.eventTitle}
Date & Time: ${format(new Date(ticket.eventDate), 'MMMM d, yyyy • h:mm a')}
Venue: ${ticket.eventVenue}
Location: ${ticket.eventCity}

TICKET INFORMATION
${'-'.repeat(50)}
Number of Tickets: ${ticket.ticketCount}
Status: ${ticket.status === 'used' ? 'Used' : ticket.status === 'expired' ? 'Expired' : 'Active'}

${'='.repeat(50)}
Thank you for using EventHaiti!
For support, visit eventhaiti.com

Generated: ${format(new Date(), 'MMMM d, yyyy • h:mm a')}
  `.trim()

  const blob = new Blob([receiptContent], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `receipt-${ticket.eventTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function TicketsPreview({ tickets }: TicketsPreviewProps) {
  const displayTickets = tickets.slice(0, 3)

  if (tickets.length === 0) {
    return (
      <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-8 text-center">
        <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Ticket className="w-8 h-8 text-purple-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">No tickets yet</h3>
        <p className="text-sm text-gray-600 mb-6">Purchase tickets to see them here</p>
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
    <div className="space-y-4">
      {displayTickets.map((ticket) => (
        <div
          key={ticket.eventId}
          className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all group"
        >
          <div className="flex flex-col sm:flex-row">
            {/* Event Image */}
            <div className="relative w-full sm:w-32 h-32 sm:h-full bg-gray-100 flex-shrink-0">
              {ticket.eventBanner ? (
                <Image
                  src={ticket.eventBanner}
                  alt={ticket.eventTitle}
                  fill
                  className="object-cover"
                  sizes="128px"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-brand-100 to-accent-100 flex items-center justify-center">
                  <span className="text-3xl">🎫</span>
                </div>
              )}
            </div>

            {/* Event Info */}
            <div className="flex-1 p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 line-clamp-1 mb-1">
                    {ticket.eventTitle}
                  </h3>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span>{format(new Date(ticket.eventDate), 'MMM d, h:mm a')}</span>
                    </div>
                    <div className="hidden sm:block text-gray-300">•</div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{ticket.eventCity}</span>
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <span className={`ml-2 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                  ticket.status === 'used' 
                    ? 'bg-gray-100 text-gray-700'
                    : ticket.status === 'expired'
                    ? 'bg-red-50 text-red-700'
                    : 'bg-green-50 text-green-700'
                }`}>
                  {ticket.status === 'used' ? 'Used' : ticket.status === 'expired' ? 'Expired' : 'Active'}
                </span>
              </div>

              {/* Ticket Count */}
              <p className="text-sm text-gray-500 mb-3">
                {ticket.ticketCount} {ticket.ticketCount === 1 ? 'ticket' : 'tickets'}
              </p>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/tickets"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors text-sm"
                >
                  <QrCode className="w-4 h-4" />
                  View QR
                </Link>
                <button 
                  onClick={() => generateReceipt(ticket)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* View All Link */}
      {tickets.length > 3 && (
        <Link
          href="/tickets"
          className="block text-center py-3 text-brand-600 hover:text-brand-700 font-semibold hover:bg-brand-50 rounded-xl transition-colors"
        >
          View all {tickets.length} tickets →
        </Link>
      )}
    </div>
  )
}
