'use client'

// Live Camera QR Code Scanner Component
// Uses browser MediaDevices API to scan QR codes in real-time
// Alternative to file upload for ticket check-in

import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'

interface CameraQRScannerProps {
  onScan: (data: string) => void
  onError?: (error: Error) => void
  className?: string
  width?: number
  height?: number
}

export function CameraQRScanner({
  onScan,
  onError,
  className = '',
  width = 640,
  height = 480
}: CameraQRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>('')
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Don't auto-start on iOS - wait for user interaction
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    if (!isIOS) {
      startCamera()
    }
    return () => {
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    try {
      setError(null)
      setHasPermission(null)
      setDebugInfo('Requesting camera...')
      
      console.log('Requesting camera access...')
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
      
      setDebugInfo('Stream obtained')
      console.log('Camera stream obtained')

      const video = videoRef.current
      if (!video) {
        setDebugInfo('No video element')
        return
      }

      video.srcObject = stream
      setDebugInfo('Stream set to video')
      
      // Force play on mobile
      video.setAttribute('autoplay', '')
      video.setAttribute('muted', '')
      video.setAttribute('playsinline', '')
      video.muted = true
      video.playsInline = true
      
      // Wait for the video to actually start
      return new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = async () => {
          setDebugInfo(`Metadata loaded: ${video.videoWidth}x${video.videoHeight}`)
          console.log('Video metadata loaded:', {
            width: video.videoWidth,
            height: video.videoHeight,
            readyState: video.readyState
          })
          
          try {
            await video.play()
            setDebugInfo('Video playing!')
            console.log('Video playing')
            
            // Give it a moment to actually render
            setTimeout(() => {
              setHasPermission(true)
              setIsScanning(true)
              startScanning()
              setDebugInfo('Scanning active')
              resolve()
            }, 500)
          } catch (playError) {
            setDebugInfo(`Play error: ${playError}`)
            console.error('Play error:', playError)
            reject(playError)
          }
        }
        
        video.onerror = (err) => {
          setDebugInfo(`Video error: ${err}`)
          console.error('Video element error:', err)
          reject(new Error('Video element error'))
        }
        
        // Timeout after 10 seconds
        setTimeout(() => {
          if (hasPermission === null) {
            setDebugInfo('Timeout - video did not load')
            reject(new Error('Video initialization timeout'))
          }
        }, 10000)
      })
    } catch (err) {
      console.error('Camera access error:', err)
      let errorMessage = 'Failed to access camera'
      
      if (err instanceof Error) {
        errorMessage = err.message
        // Check for common permission/HTTPS errors
        if (err.name === 'NotAllowedError') {
          errorMessage = 'Camera access denied. Please allow camera permissions in your browser settings.'
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'No camera found on this device.'
        } else if (err.name === 'NotSupportedError' || err.message.includes('secure')) {
          errorMessage = 'Camera requires HTTPS. Please access this page via a secure connection.'
        }
      }
      
      setError(errorMessage)
      setHasPermission(false)
      onError?.(err instanceof Error ? err : new Error(errorMessage))
    }
  }

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }

    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }

    setIsScanning(false)
  }

  const startScanning = () => {
    // Scan for QR codes every 100ms
    scanIntervalRef.current = setInterval(() => {
      scanFrame()
    }, 100)
  }

  const scanFrame = () => {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas || !isScanning) {
      return
    }

    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      return
    }

    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return

    // Set canvas size to match video
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      console.log(`Canvas sized: ${canvas.width}x${canvas.height}`)
    }

    if (canvas.width === 0 || canvas.height === 0) {
      return
    }

    try {
      // Draw video frame
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      // Get image data
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
      
      // Scan for QR code
      const code = jsQR(imageData.data, canvas.width, canvas.height, {
        inversionAttempts: 'attemptBoth'
      })

      if (code?.data) {
        console.log('✓ QR Code found:', code.data)
        
        // Stop scanning
        if (scanIntervalRef.current) {
          clearInterval(scanIntervalRef.current)
          scanIntervalRef.current = null
        }
        setIsScanning(false)
        
        // Call handler
        onScan(code.data)
      }
    } catch (err) {
      console.error('Scan frame error:', err)
    }
  }

  const drawBox = (
    context: CanvasRenderingContext2D,
    location: {
      topLeftCorner: { x: number; y: number }
      topRightCorner: { x: number; y: number }
      bottomRightCorner: { x: number; y: number }
      bottomLeftCorner: { x: number; y: number }
    }
  ) => {
    context.strokeStyle = '#10b981'
    context.lineWidth = 4
    context.beginPath()
    context.moveTo(location.topLeftCorner.x, location.topLeftCorner.y)
    context.lineTo(location.topRightCorner.x, location.topRightCorner.y)
    context.lineTo(location.bottomRightCorner.x, location.bottomRightCorner.y)
    context.lineTo(location.bottomLeftCorner.x, location.bottomLeftCorner.y)
    context.lineTo(location.topLeftCorner.x, location.topLeftCorner.y)
    context.stroke()
  }

  if (hasPermission === false) {
    return (
      <div className={`rounded-lg border-2 border-dashed border-red-300 bg-red-50 p-8 text-center ${className}`}>
        <svg
          className="mx-auto h-12 w-12 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-red-800">Camera Access Denied</h3>
        <p className="mt-1 text-sm text-red-600">
          {error || 'Please allow camera access to scan QR codes'}
        </p>
        {debugInfo && (
          <p className="mt-2 text-xs text-red-500 font-mono">{debugInfo}</p>
        )}
        <button
          onClick={startCamera}
          className="mt-4 inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
        >
          Try Again
        </button>
      </div>
    )
  }

  // Show start button for iOS devices
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  if (isIOS && hasPermission === null) {
    return (
      <div className={`rounded-lg border-2 border-dashed border-orange-300 bg-orange-50 p-8 text-center ${className}`}>
        <svg
          className="mx-auto h-12 w-12 text-orange-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Start Camera</h3>
        <p className="mt-1 text-sm text-gray-600">
          Tap the button below to enable camera scanning
        </p>
        {debugInfo && (
          <p className="mt-2 text-xs text-gray-500 font-mono">{debugInfo}</p>
        )}
        <button
          onClick={startCamera}
          className="mt-4 inline-flex items-center rounded-md bg-orange-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-orange-500"
        >
          📷 Start Camera
        </button>
      </div>
    )
  }

  return (
    <div className={`relative rounded-lg overflow-hidden bg-gray-900 ${className}`}>
      {/* Video element */}
      <video
        ref={videoRef}
        className="w-full h-auto max-h-[600px]"
        playsInline
        muted
        autoPlay
      />
      
      {/* Canvas for QR detection (hidden) */}
      <canvas
        ref={canvasRef}
        className="hidden"
      />

      {/* Loading overlay */}
      {hasPermission === null && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center text-white">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-white"></div>
            <p className="mt-4 text-sm">Requesting camera access...</p>
            {debugInfo && (
              <p className="mt-2 text-xs font-mono opacity-70">{debugInfo}</p>
            )}
          </div>
        </div>
      )}

      {/* Scanning indicator */}
      {isScanning && (
        <>
          <div className="absolute top-4 right-4 flex items-center gap-2 rounded-full bg-green-500 px-3 py-1 text-sm font-medium text-white shadow-lg">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            Scanning...
          </div>
          
          {/* Scanning frame indicator */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-8 border-4 border-white/30 rounded-lg">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg"></div>
            </div>
          </div>
        </>
      )}

      {/* Instructions overlay */}
      {isScanning && (
        <div className="absolute bottom-4 left-4 right-4 space-y-2">
          <div className="rounded-lg bg-black/70 p-3 text-center backdrop-blur-sm">
            <p className="text-sm font-medium text-white">
              Point camera at QR code to scan
            </p>
          </div>
          {debugInfo && (
            <div className="rounded-lg bg-blue-500/80 px-3 py-2 text-center backdrop-blur-sm">
              <p className="text-xs font-mono text-white">{debugInfo}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default CameraQRScanner
