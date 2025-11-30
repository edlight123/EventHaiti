'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface ScanViewportProps {
  onScan: (result: string) => void
  isProcessing: boolean
}

export function ScanViewport({ onScan, isProcessing }: ScanViewportProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const scanner = new Html5Qrcode('qr-reader')
    scannerRef.current = scanner

    const config = { fps: 10, qrbox: { width: 250, height: 250 } }

    scanner
      .start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          if (!isProcessing) {
            onScan(decodedText)
          }
        },
        () => {
          // Ignore scan errors
        }
      )
      .then(() => {
        setIsInitialized(true)
        setError(null)
      })
      .catch((err) => {
        console.error('Scanner start error:', err)
        setError('Camera access denied or not available')
      })

    return () => {
      if (scanner.isScanning) {
        scanner.stop().catch(console.error)
      }
    }
  }, [])

  // Pause/resume scanning based on processing state
  useEffect(() => {
    if (!scannerRef.current || !isInitialized) return

    if (isProcessing) {
      // Scanner will ignore scans during processing due to callback check
    }
  }, [isProcessing, isInitialized])

  return (
    <div className="relative flex-1 bg-black flex items-center justify-center">
      {/* Scanner Container */}
      <div id="qr-reader" className="w-full max-w-lg" />

      {/* Scanning Frame Overlay */}
      {isInitialized && !error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative">
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-orange-500 rounded-tl-xl" />
            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-orange-500 rounded-tr-xl" />
            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-orange-500 rounded-bl-xl" />
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-orange-500 rounded-br-xl" />
          </div>
        </div>
      )}

      {/* Helper Text */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-white text-sm font-medium bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full inline-block">
          {isProcessing ? 'Processing...' : 'Point camera at ticket QR code'}
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center px-6">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-white font-semibold mb-2">Camera Error</p>
            <p className="text-gray-400 text-sm">{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}
