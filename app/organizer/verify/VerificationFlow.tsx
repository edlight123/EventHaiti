'use client'

import { useState } from 'react'
import IDCardCapture from './IDCardCapture'
import FaceVerification from './FaceVerification'
import { useRouter } from 'next/navigation'

interface Props {
  userId: string
}

type Step = 'id-front' | 'id-back' | 'face' | 'processing' | 'complete'

export default function VerificationFlow({ userId }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('id-front')
  const [idFrontImage, setIdFrontImage] = useState<string | null>(null)
  const [idBackImage, setIdBackImage] = useState<string | null>(null)
  const [faceImage, setFaceImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleIDFrontCapture = (imageData: string) => {
    setIdFrontImage(imageData)
    setStep('id-back')
    setError(null)
  }

  const handleIDBackCapture = (imageData: string) => {
    setIdBackImage(imageData)
    setStep('face')
    setError(null)
  }

  const handleFaceCapture = async (imageData: string) => {
    setFaceImage(imageData)
    setStep('processing')
    setError(null)

    try {
      // Submit verification request
      const response = await fetch('/api/organizer/submit-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          idFrontImage,
          idBackImage,
          faceImage: imageData,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit verification')
      }

      setStep('complete')
      
      // Redirect after 3 seconds
      setTimeout(() => {
        router.push('/organizer/events')
        router.refresh()
      }, 3000)
    } catch (err) {
      console.error('Verification submission error:', err)
      setError('Failed to submit verification. Please try again.')
      setStep('face')
    }
  }

  const handleRetake = () => {
    if (step === 'id-back') {
      setIdFrontImage(null)
      setStep('id-front')
    } else if (step === 'face') {
      setIdBackImage(null)
      setStep('id-back')
    }
  }

  return (
    <div>
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className={`flex-1 ${step !== 'id-front' ? 'opacity-100' : 'opacity-50'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 ${
              step !== 'id-front' ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              {step !== 'id-front' ? '✓' : '1'}
            </div>
            <p className="text-xs text-center font-medium text-gray-600">ID Front</p>
          </div>
          
          <div className={`flex-1 ${step === 'face' || step === 'processing' || step === 'complete' ? 'opacity-100' : 'opacity-50'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 ${
              step === 'face' || step === 'processing' || step === 'complete' ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              {step === 'face' || step === 'processing' || step === 'complete' ? '✓' : '2'}
            </div>
            <p className="text-xs text-center font-medium text-gray-600">ID Back</p>
          </div>
          
          <div className={`flex-1 ${step === 'processing' || step === 'complete' ? 'opacity-100' : 'opacity-50'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 ${
              step === 'processing' || step === 'complete' ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              {step === 'processing' || step === 'complete' ? '✓' : '3'}
            </div>
            <p className="text-xs text-center font-medium text-gray-600">Face Scan</p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Step Content */}
      {step === 'id-front' && (
        <IDCardCapture
          title="Capture ID Front"
          description="Position your National ID card front side within the frame"
          onCapture={handleIDFrontCapture}
        />
      )}

      {step === 'id-back' && (
        <IDCardCapture
          title="Capture ID Back"
          description="Now flip your ID and capture the back side"
          onCapture={handleIDBackCapture}
          onRetake={handleRetake}
        />
      )}

      {step === 'face' && (
        <FaceVerification
          onCapture={handleFaceCapture}
          onRetake={handleRetake}
        />
      )}

      {step === 'processing' && (
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Processing Verification...</h3>
          <p className="text-gray-600">Please wait while we verify your identity</p>
        </div>
      )}

      {step === 'complete' && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Verification Submitted!</h3>
          <p className="text-gray-600 mb-4">
            Your verification request has been submitted. Our team will review it within 24-48 hours.
          </p>
          <p className="text-sm text-gray-500">
            Redirecting you to the events page...
          </p>
        </div>
      )}
    </div>
  )
}
