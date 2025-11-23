'use client'

import { useRef, useState, useEffect } from 'react'

interface Props {
  onCapture: (imageData: string) => void
  onRetake: () => void
}

export default function FaceVerification({ onCapture, onRetake }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)

  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
    }
  }, [])

  useEffect(() => {
    if (countdown === null || countdown <= 0) return

    const timer = setTimeout(() => {
      if (countdown === 1) {
        capturePhoto()
      } else {
        setCountdown(countdown - 1)
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [countdown])

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user', // Front camera for selfie
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true)
        }
      }
      
      setStream(mediaStream)
      setError(null)
    } catch (err) {
      console.error('Camera access error:', err)
      setError('Unable to access camera. Please grant camera permissions.')
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }

  const startCountdown = () => {
    setCountdown(3)
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Flip the image horizontally (mirror effect)
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0)
    
    const imageData = canvas.toDataURL('image/jpeg', 0.9)
    setCapturedImage(imageData)
    setCountdown(null)
  }

  const confirmPhoto = () => {
    if (capturedImage) {
      stopCamera()
      onCapture(capturedImage)
    }
  }

  const retakePhoto = () => {
    setCapturedImage(null)
    setCountdown(null)
    if (!stream) {
      startCamera()
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Face Verification</h2>
      <p className="text-gray-600 mb-6">
        Position your face in the center of the frame. Make sure your face is well-lit and clearly visible.
      </p>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
          <button
            onClick={startCamera}
            className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Try Again
          </button>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
        <p className="text-sm text-blue-800">
          <strong>Tips:</strong> Remove glasses, look directly at the camera, and ensure good lighting
        </p>
      </div>

      <div className="relative bg-gray-900 rounded-lg overflow-hidden mb-6" style={{ aspectRatio: '4/3' }}>
        {!capturedImage ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
            
            {/* Face Oval Overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-64 h-80">
                <svg viewBox="0 0 200 300" className="w-full h-full">
                  <ellipse
                    cx="100"
                    cy="150"
                    rx="80"
                    ry="120"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    opacity="0.6"
                  />
                  <ellipse
                    cx="100"
                    cy="150"
                    rx="80"
                    ry="120"
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="4"
                    strokeDasharray="10,5"
                    opacity="0.8"
                  />
                </svg>
              </div>
            </div>

            {/* Countdown Overlay */}
            {countdown !== null && countdown > 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <div className="text-center">
                  <div className="text-8xl font-bold text-white mb-2">{countdown}</div>
                  <p className="text-white text-lg">Get ready...</p>
                </div>
              </div>
            )}

            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-white text-sm">Starting camera...</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <img src={capturedImage} alt="Face verification" className="w-full h-full object-cover" />
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="flex gap-3">
        <button
          onClick={onRetake}
          className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
        >
          Back
        </button>
        
        {!capturedImage ? (
          <button
            onClick={startCountdown}
            disabled={!cameraReady || countdown !== null}
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {countdown !== null ? 'Capturing...' : 'Take Selfie'}
          </button>
        ) : (
          <>
            <button
              onClick={retakePhoto}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
            >
              Retake
            </button>
            <button
              onClick={confirmPhoto}
              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
            >
              Looks Good
            </button>
          </>
        )}
      </div>
    </div>
  )
}
