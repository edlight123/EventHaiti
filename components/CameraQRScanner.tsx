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
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    try {
      setError(null)
      setHasPermission(null) // Show loading state
      
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: width },
          height: { ideal: height }
        }
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        
        // Wait for video to be ready
        await new Promise<void>((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play().then(() => {
                console.log('Video playing')
                // Set permission and start scanning immediately
                setHasPermission(true)
                setIsScanning(true)
                resolve()
              }).catch((err) => {
                console.error('Error playing video:', err)
                resolve()
              })
            }
          } else {
            resolve()
          }
        })
        
        // Start the scanning interval
        startScanning()
      }
    } catch (err) {
      console.error('Camera access error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to access camera'
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
    if (!videoRef.current || !canvasRef.current || !isScanning) {
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) {
      return
    }

    // Set canvas size to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Get image data from canvas
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

    // Scan for QR code
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert'
    })

    if (code && code.data) {
      // Found a QR code!
      onScan(code.data)
      
      // Optional: Draw a box around the detected QR code
      drawBox(context, code.location)
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
        <button
          onClick={startCamera}
          className="mt-4 inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (hasPermission === null) {
    return (
      <div className={`rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center ${className}`}>
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-orange-600"></div>
        <p className="mt-4 text-sm text-gray-600">Requesting camera access...</p>
      </div>
    )
  }

  return (
    <div className={`relative rounded-lg overflow-hidden bg-black ${className}`}>
      {/* Video element - show it for debugging */}
      <video
        ref={videoRef}
        className="w-full h-auto rounded-lg"
        playsInline
        muted
        autoPlay
      />
      
      {/* Canvas for QR detection (hidden) */}
      <canvas
        ref={canvasRef}
        className="hidden"
      />

      {/* Scanning indicator */}
      {isScanning && (
        <div className="absolute top-4 right-4 flex items-center gap-2 rounded-full bg-green-500 px-3 py-1 text-sm font-medium text-white shadow-lg">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          Scanning...
        </div>
      )}

      {/* Instructions overlay */}
      <div className="absolute bottom-4 left-4 right-4 rounded-lg bg-black/70 p-3 text-center backdrop-blur-sm">
        <p className="text-sm font-medium text-white">
          Point camera at QR code to scan
        </p>
      </div>
    </div>
  )
}

export default CameraQRScanner
