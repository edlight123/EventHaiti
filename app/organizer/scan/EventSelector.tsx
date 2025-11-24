'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import CameraQRScanner from '@/components/CameraQRScanner'

interface EventSelectorProps {
  events: any[]
  organizerId: string
}

export default function EventSelector({ events, organizerId }: EventSelectorProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const selectedEvent = events.find(e => e.id === selectedEventId)

  const handleQRCodeDetected = async (qrData: string) => {
    if (isProcessing || !selectedEventId) return
    
    setIsProcessing(true)
    setScanResult(null)

    try {
      // Call the check-in API
      const response = await fetch('/api/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId: qrData,
          eventId: selectedEventId,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setScanResult({
          success: true,
          message: `✅ Ticket validated! Welcome ${data.attendeeName}`,
          timestamp: new Date().toLocaleTimeString()
        })
        
        // Play success sound (optional)
        if (typeof Audio !== 'undefined') {
          try {
            const audio = new Audio('/success.mp3')
            audio.volume = 0.3
            audio.play().catch(() => {}) // Ignore errors if audio not available
          } catch (e) {}
        }
      } else {
        setScanResult({
          success: false,
          message: `❌ ${data.error || 'Invalid ticket'}`,
          timestamp: new Date().toLocaleTimeString()
        })
      }
    } catch (error) {
      setScanResult({
        success: false,
        message: '❌ Error validating ticket. Please try again.',
        timestamp: new Date().toLocaleTimeString()
      })
    } finally {
      // Allow next scan after 2 seconds
      setTimeout(() => {
        setIsProcessing(false)
      }, 2000)
    }
  }

  if (!selectedEventId) {
    // Separate today's events from others for display
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const todayEvents = events.filter(e => {
      const eventDate = new Date(e.start_datetime)
      return eventDate >= today && eventDate < tomorrow
    })
    
    const otherEvents = events.filter(e => {
      const eventDate = new Date(e.start_datetime)
      return eventDate < today || eventDate >= tomorrow
    })
    
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Select an Event</h2>
        
        {events.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📅</div>
            <p className="text-gray-600 mb-4">You don&apos;t have any events yet.</p>
            <a
              href="/organizer/events/new"
              className="inline-block px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-medium"
            >
              Create Your First Event
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Today's Events */}
            {todayEvents.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-teal-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <span>📍</span>
                  <span>Happening Today</span>
                </h3>
                <div className="space-y-3">
                  {todayEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEventId(event.id)}
                      className="w-full text-left p-4 bg-teal-50 hover:bg-teal-100 rounded-lg border-2 border-teal-200 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{event.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            📅 {format(new Date(event.start_datetime), 'PPP • p')}
                          </p>
                          <p className="text-sm text-gray-600">
                            📍 {event.venue_name}, {event.city}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {event.tickets_sold || 0} tickets sold
                          </p>
                        </div>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-teal-600 text-white">
                          Today
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Other Events */}
            {otherEvents.length > 0 && (
              <div>
                {todayEvents.length > 0 && (
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Other Events
                  </h3>
                )}
                <div className="space-y-3">
                  {otherEvents.map((event) => {
                    const isPast = new Date(event.start_datetime) < new Date()
                    
                    return (
                      <button
                        key={event.id}
                        onClick={() => setSelectedEventId(event.id)}
                        className="w-full text-left p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{event.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">
                              📅 {format(new Date(event.start_datetime), 'PPP • p')}
                            </p>
                            <p className="text-sm text-gray-600">
                              📍 {event.venue_name}, {event.city}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                              {event.tickets_sold || 0} tickets sold
                            </p>
                          </div>
                          {isPast && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                              Past
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Selected Event Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{selectedEvent?.title}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {format(new Date(selectedEvent?.start_datetime), 'PPP • p')}
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedEventId(null)
              setScanResult(null)
            }}
            className="text-sm text-gray-600 hover:text-gray-900 font-medium"
          >
            Change Event
          </button>
        </div>
      </div>

      {/* Scan Result */}
      {scanResult && (
        <div className={`rounded-xl shadow-sm border p-6 ${
          scanResult.success 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start gap-3">
            <div className="text-2xl">
              {scanResult.success ? '✅' : '❌'}
            </div>
            <div className="flex-1">
              <p className={`font-semibold ${
                scanResult.success ? 'text-green-900' : 'text-red-900'
              }`}>
                {scanResult.message}
              </p>
              <p className="text-xs text-gray-600 mt-1">{scanResult.timestamp}</p>
            </div>
          </div>
        </div>
      )}

      {/* Camera Scanner */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Scan QR Code</h3>
        <CameraQRScanner onScan={handleQRCodeDetected} />
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">📱 How to scan tickets</h3>
        <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
          <li>Grant camera permission when prompted</li>
          <li>Ask attendees to show their QR code ticket</li>
          <li>Point your camera at the QR code</li>
          <li>The ticket will be validated automatically</li>
          <li>Green = Valid ticket, Red = Invalid or already used</li>
        </ol>
      </div>
    </div>
  )
}
