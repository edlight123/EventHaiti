import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import { PurchaseSuccessNotificationPrompt } from '@/components/PurchaseSuccessNotificationPrompt'
import Link from 'next/link'
import type { Database } from '@/types/database'

type Ticket = Database['public']['Tables']['tickets']['Row']

export const revalidate = 0

export default async function PurchaseSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; ticket_id?: string }>
}) {
  const user = await getCurrentUser()
  const params = await searchParams

  let ticket: any = null

  if (params.ticket_id) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('tickets')
      .select(`
        *,
        event:events (
          title,
          start_datetime,
          venue,
          city
        )
      `)
      .eq('id', params.ticket_id)
      .single()

    ticket = data
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} isAdmin={isAdmin(user?.email)} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-green-100 mb-4">
            <svg className="w-8 h-8 md:w-10 md:h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            Purchase Successful!
          </h1>
          <p className="text-base md:text-lg text-gray-600">
            Your ticket has been confirmed
          </p>
        </div>

        {ticket && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-orange-500 to-pink-500 p-4 md:p-6 text-white">
              <h2 className="text-lg md:text-xl lg:text-2xl font-bold mb-1.5 md:mb-2 line-clamp-2">{ticket.event.title}</h2>
              <p className="text-sm md:text-base text-orange-100">
                {new Date(ticket.event.start_datetime).toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            </div>

            <div className="p-4 md:p-6 space-y-3 md:space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <span className="text-[13px] font-medium text-gray-600">Ticket ID</span>
                <span className="font-mono text-sm text-gray-900">{ticket.id.slice(0, 8)}</span>
              </div>

              <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <span className="text-[13px] font-medium text-gray-600">Location</span>
                <span className="text-sm text-gray-900 text-right truncate max-w-[60%]">{ticket.event.venue}, {ticket.event.city}</span>
              </div>

              <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <span className="text-[13px] font-medium text-gray-600">Amount Paid</span>
                <span className="text-base md:text-lg font-bold text-gray-900">${ticket.price_paid.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[13px] font-medium text-gray-600">Status</span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] md:text-xs font-medium bg-green-100 text-green-800">
                  Confirmed
                </span>
              </div>
            </div>

            {/* QR Code Placeholder */}
            <div className="p-4 md:p-6 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-center h-40 md:h-48 bg-white rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <svg className="w-12 h-12 md:w-16 md:h-16 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  <p className="text-sm text-gray-600">Your QR Code</p>
                  <p className="text-[11px] md:text-xs text-gray-500 mt-1">Show this at the entrance</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {!ticket && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 md:p-12 text-center mb-6">
            <p className="text-sm md:text-base text-gray-600">
              A confirmation email has been sent to your inbox with your ticket details.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/tickets"
            className="px-6 md:px-8 py-3 md:py-3.5 rounded-lg bg-orange-600 text-white text-base font-semibold hover:bg-orange-700 transition-colors text-center shadow-md"
          >
            View My Tickets
          </Link>
          <Link
            href="/"
            className="px-6 md:px-8 py-3 md:py-3.5 rounded-lg border border-gray-300 text-gray-700 text-base font-semibold hover:bg-gray-50 transition-colors text-center"
          >
            Find More Events
          </Link>
        </div>

        {/* Next Steps */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold text-blue-900 mb-2.5">What&apos;s Next?</h3>
          <ul className="space-y-2 text-[13px] md:text-sm text-blue-800">
            <li className="flex items-start">
              <svg className="w-4 h-4 md:w-5 md:h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Check your email for ticket confirmation and event details
            </li>
            <li className="flex items-start">
              <svg className="w-4 h-4 md:w-5 md:h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Save your ticket to your phone for easy access at the event
            </li>
            <li className="flex items-start">
              <svg className="w-4 h-4 md:w-5 md:h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Arrive early and present your QR code at the entrance
            </li>
          </ul>
        </div>

        {/* Notification Prompt - ONLY on purchase success, NOT on scan/check-in pages */}
        {user && (
          <PurchaseSuccessNotificationPrompt userId={user.id} />
        )}
      </div>
      
      <MobileNavWrapper user={user} isAdmin={isAdmin(user?.email)} />
    </div>
  )
}
