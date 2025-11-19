'use client'

// Example: Attendance Check-in Page with Camera QR Scanner
// Shows how to use CameraQRScanner component for event check-ins

import { useState } from 'react'
import { CameraQRScanner } from '@/components/CameraQRScanner'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid'

export default function AttendanceWithCameraExample() {
  const [scanMode, setScanMode] = useState<'upload' | 'camera'>('upload')
  const [scanning, setScanning] = useState(false)
  const [lastScan, setLastScan] = useState<{
    ticketId: string
    status: 'success' | 'error'
    message: string
  } | null>(null)

  const handleQRScan = async (data: string) => {
    console.log('QR Code scanned:', data)
    
    // Prevent multiple scans of the same code
    if (scanning) return
    setScanning(true)

    try {
      // Parse QR code data (should contain ticket ID)
      const ticketId = data.trim()
      
      // Call attendance API to check in
      const response = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setLastScan({
          ticketId,
          status: 'success',
          message: `✓ Checked in: ${result.attendeeName || 'Attendee'}`
        })
        
        // Play success sound (optional)
        playSuccessSound()
      } else {
        setLastScan({
          ticketId,
          status: 'error',
          message: result.error || 'Check-in failed'
        })
        
        // Play error sound (optional)
        playErrorSound()
      }
    } catch (error) {
      console.error('Check-in error:', error)
      setLastScan({
        ticketId: data,
        status: 'error',
        message: 'Network error - please try again'
      })
      playErrorSound()
    } finally {
      // Allow next scan after 2 seconds
      setTimeout(() => {
        setScanning(false)
        setLastScan(null)
      }, 2000)
    }
  }

  const playSuccessSound = () => {
    const audio = new Audio('/sounds/success.mp3')
    audio.play().catch(() => {}) // Ignore errors if sound file missing
  }

  const playErrorSound = () => {
    const audio = new Audio('/sounds/error.mp3')
    audio.play().catch(() => {})
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Event Check-In</h1>
          <p className="mt-2 text-sm text-gray-600">
            Scan QR codes to check in attendees
          </p>
        </div>

        {/* Scan Mode Toggle */}
        <div className="mb-6 flex justify-center gap-4">
          <button
            onClick={() => setScanMode('upload')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              scanMode === 'upload'
                ? 'bg-orange-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            📁 Upload Image
          </button>
          <button
            onClick={() => setScanMode('camera')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              scanMode === 'camera'
                ? 'bg-orange-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            📷 Live Camera
          </button>
        </div>

        {/* Scanner Area */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {scanMode === 'camera' ? (
            <CameraQRScanner
              onScan={handleQRScan}
              onError={(error) => {
                console.error('Camera error:', error)
              }}
              className="mb-6"
            />
          ) : (
            <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-600">
                Upload a screenshot of the QR code
              </p>
              <input
                type="file"
                accept="image/*"
                className="mt-4"
                onChange={(e) => {
                  // Handle file upload QR scanning
                  // This would use a different QR library to parse uploaded images
                  console.log('File selected:', e.target.files?.[0])
                }}
              />
            </div>
          )}

          {/* Scan Result */}
          {lastScan && (
            <div
              className={`mt-6 rounded-lg p-4 ${
                lastScan.status === 'success'
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {lastScan.status === 'success' ? (
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                ) : (
                  <XCircleIcon className="h-6 w-6 text-red-600" />
                )}
                <div>
                  <p
                    className={`font-medium ${
                      lastScan.status === 'success' ? 'text-green-800' : 'text-red-800'
                    }`}
                  >
                    {lastScan.message}
                  </p>
                  <p className="text-sm text-gray-600">
                    Ticket: {lastScan.ticketId.slice(0, 16)}...
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">💡 How to use:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Switch to <strong>Live Camera</strong> mode for real-time scanning</li>
            <li>• Point your camera at the attendee's QR code</li>
            <li>• The system will automatically detect and check them in</li>
            <li>• Green = Success, Red = Error/Already checked in</li>
            <li>• For file uploads, attendees can screenshot their ticket</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
