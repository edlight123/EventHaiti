/**
 * Verification System - Firestore & Storage Integration
 * Handles organizer verification requests and document uploads
 */

import { db, storage } from '@/lib/firebase/client'
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore'
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage'

// Types
export type VerificationStatus = 
  | 'not_started' 
  | 'in_progress' 
  | 'pending_review' 
  | 'in_review' 
  | 'approved' 
  | 'changes_requested' 
  | 'rejected'

export type StepStatus = 'incomplete' | 'complete' | 'needs_attention'

export interface VerificationStep {
  id: string
  title: string
  description: string
  status: StepStatus
  required: boolean
  fields: Record<string, any>
  missingFields?: string[]
  errorMessage?: string
}

export interface VerificationFiles {
  governmentId?: {
    front?: string // Storage path
    back?: string
    uploadedAt?: Date
  }
  selfie?: {
    path?: string
    uploadedAt?: Date
  }
  businessDocs?: {
    registration?: string
    taxId?: string
    uploadedAt?: Date
  }
}

export interface VerificationRequest {
  userId: string
  status: VerificationStatus
  steps: {
    organizerInfo: VerificationStep
    governmentId: VerificationStep
    selfie: VerificationStep
    businessDetails: VerificationStep
    payoutSetup: VerificationStep
  }
  files: VerificationFiles
  submittedAt?: Date
  reviewedAt?: Date
  reviewNotes?: string
  reasonCodes?: string[]
  createdAt: Date
  updatedAt: Date
}

// Helper: Get verification request for user
export async function getVerificationRequest(userId: string): Promise<VerificationRequest | null> {
  try {
    const docRef = doc(db, 'verification_requests', userId)
    const docSnap = await getDoc(docRef)
    
    if (!docSnap.exists()) {
      return null
    }
    
    const data = docSnap.data()
    
    // Convert Firestore timestamps to Date objects
    return {
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
      submittedAt: data.submittedAt?.toDate?.() || undefined,
      reviewedAt: data.reviewedAt?.toDate?.() || undefined,
    } as VerificationRequest
  } catch (error) {
    console.error('Error fetching verification request:', error)
    return null
  }
}

// Helper: Initialize new verification request
export async function initializeVerificationRequest(userId: string): Promise<VerificationRequest> {
  const initialRequest: VerificationRequest = {
    userId,
    status: 'in_progress',
    steps: {
      organizerInfo: {
        id: 'organizerInfo',
        title: 'Organizer Information',
        description: 'Basic information about you and your organization',
        status: 'incomplete',
        required: true,
        fields: {},
        missingFields: ['full_name', 'phone', 'organization_name']
      },
      governmentId: {
        id: 'governmentId',
        title: 'Government ID Upload',
        description: 'Upload a valid government-issued ID (front and back)',
        status: 'incomplete',
        required: true,
        fields: {},
        missingFields: ['id_front', 'id_back']
      },
      selfie: {
        id: 'selfie',
        title: 'Identity Verification',
        description: 'Take a selfie holding your ID for verification',
        status: 'incomplete',
        required: true,
        fields: {}
      },
      businessDetails: {
        id: 'businessDetails',
        title: 'Business Details',
        description: 'Optional business registration and tax information',
        status: 'incomplete',
        required: false,
        fields: {}
      },
      payoutSetup: {
        id: 'payoutSetup',
        title: 'Payout Setup',
        description: 'Configure how you receive payments (can be set up later)',
        status: 'incomplete',
        required: false,
        fields: {}
      }
    },
    files: {},
    createdAt: new Date(),
    updatedAt: new Date()
  }
  
  const docRef = doc(db, 'verification_requests', userId)
  await setDoc(docRef, {
    ...initialRequest,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
  
  return initialRequest
}

// Helper: Update verification step
export async function updateVerificationStep(
  userId: string,
  stepId: keyof VerificationRequest['steps'],
  stepData: Partial<VerificationStep>
): Promise<void> {
  try {
    const docRef = doc(db, 'verification_requests', userId)
    const docSnap = await getDoc(docRef)
    
    if (!docSnap.exists()) {
      throw new Error('Verification request not found')
    }
    
    const currentData = docSnap.data() as VerificationRequest
    const updatedSteps = {
      ...currentData.steps,
      [stepId]: {
        ...currentData.steps[stepId],
        ...stepData
      }
    }
    
    await updateDoc(docRef, {
      steps: updatedSteps,
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error updating verification step:', error)
    throw error
  }
}

// Helper: Upload verification document
export async function uploadVerificationDocument(
  userId: string,
  file: File,
  documentType: 'id_front' | 'id_back' | 'selfie' | 'business_registration' | 'tax_id'
): Promise<string> {
  try {
    const timestamp = Date.now()
    const extension = file.name.split('.').pop() || 'jpg'
    const fileName = `${documentType}_${timestamp}.${extension}`
    const storagePath = `verification/${userId}/${fileName}`
    
    const storageRef = ref(storage, storagePath)
    await uploadBytes(storageRef, file)
    
    // Return the storage path (not the download URL for security)
    return storagePath
  } catch (error) {
    console.error('Error uploading verification document:', error)
    throw error
  }
}

// Helper: Get document download URL (admin only in production)
export async function getDocumentDownloadURL(storagePath: string): Promise<string> {
  try {
    const storageRef = ref(storage, storagePath)
    return await getDownloadURL(storageRef)
  } catch (error) {
    console.error('Error getting document download URL:', error)
    throw error
  }
}

// Helper: Delete verification document
export async function deleteVerificationDocument(storagePath: string): Promise<void> {
  try {
    const storageRef = ref(storage, storagePath)
    await deleteObject(storageRef)
  } catch (error) {
    console.error('Error deleting verification document:', error)
    throw error
  }
}

// Helper: Update verification files
export async function updateVerificationFiles(
  userId: string,
  files: Partial<VerificationFiles>
): Promise<void> {
  try {
    const docRef = doc(db, 'verification_requests', userId)
    const docSnap = await getDoc(docRef)
    
    if (!docSnap.exists()) {
      throw new Error('Verification request not found')
    }
    
    const currentData = docSnap.data() as VerificationRequest
    const updatedFiles = {
      ...currentData.files,
      ...files
    }
    
    await updateDoc(docRef, {
      files: updatedFiles,
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error updating verification files:', error)
    throw error
  }
}

// Helper: Submit verification for review
export async function submitVerificationForReview(userId: string): Promise<void> {
  try {
    const docRef = doc(db, 'verification_requests', userId)
    const docSnap = await getDoc(docRef)
    
    if (!docSnap.exists()) {
      throw new Error('Verification request not found')
    }
    
    const currentData = docSnap.data() as VerificationRequest
    
    // Validate all required steps are complete
    const requiredSteps = Object.values(currentData.steps).filter(step => step.required)
    const incompleteSteps = requiredSteps.filter(step => step.status !== 'complete')
    
    if (incompleteSteps.length > 0) {
      throw new Error('Please complete all required steps before submitting')
    }
    
    await updateDoc(docRef, {
      status: 'pending_review',
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error submitting verification:', error)
    throw error
  }
}

// Helper: Calculate overall completion percentage
export function calculateCompletionPercentage(request: VerificationRequest): number {
  const allSteps = Object.values(request.steps)
  const completedSteps = allSteps.filter(step => step.status === 'complete')
  return Math.round((completedSteps.length / allSteps.length) * 100)
}

// Helper: Get blocking issues (for submit button)
export function getBlockingIssues(request: VerificationRequest): string[] {
  const issues: string[] = []
  
  Object.values(request.steps).forEach(step => {
    if (step.required && step.status !== 'complete') {
      issues.push(`${step.title}: ${step.missingFields?.join(', ') || 'Not complete'}`)
    }
  })
  
  return issues
}

// Helper: Check if can submit
export function canSubmitForReview(request: VerificationRequest): boolean {
  const requiredSteps = Object.values(request.steps).filter(step => step.required)
  return requiredSteps.every(step => step.status === 'complete')
}

// Helper: Restart rejected verification (allows resubmission)
export async function restartVerification(userId: string): Promise<void> {
  try {
    const docRef = doc(db, 'verification_requests', userId)
    const docSnap = await getDoc(docRef)
    
    if (!docSnap.exists()) {
      throw new Error('Verification request not found')
    }
    
    const currentData = docSnap.data() as VerificationRequest
    
    // Only allow restart if rejected
    if (currentData.status !== 'rejected') {
      throw new Error('Can only restart rejected verifications')
    }
    
    // Delete old uploaded files to start fresh
    const filesToDelete: string[] = []
    
    if (currentData.files.governmentId?.front) {
      filesToDelete.push(currentData.files.governmentId.front)
    }
    if (currentData.files.governmentId?.back) {
      filesToDelete.push(currentData.files.governmentId.back)
    }
    if (currentData.files.selfie?.path) {
      filesToDelete.push(currentData.files.selfie.path)
    }
    if (currentData.files.businessDocs?.registration) {
      filesToDelete.push(currentData.files.businessDocs.registration)
    }
    if (currentData.files.businessDocs?.taxId) {
      filesToDelete.push(currentData.files.businessDocs.taxId)
    }
    
    // Delete files in parallel (ignore errors for files that don't exist)
    await Promise.allSettled(
      filesToDelete.map(path => deleteVerificationDocument(path))
    )
    
    // Reset all steps to incomplete and clear all data
    const resetSteps = {
      organizerInfo: {
        id: 'organizerInfo',
        title: 'Organizer Information',
        description: 'Basic information about you and your organization',
        status: 'incomplete' as StepStatus,
        required: true,
        fields: {},
        missingFields: ['full_name', 'phone', 'organization_name']
      },
      governmentId: {
        id: 'governmentId',
        title: 'Government ID Upload',
        description: 'Upload a valid government-issued ID (front and back)',
        status: 'incomplete' as StepStatus,
        required: true,
        fields: {},
        missingFields: ['id_front', 'id_back']
      },
      selfie: {
        id: 'selfie',
        title: 'Identity Verification',
        description: 'Take a selfie holding your ID for verification',
        status: 'incomplete' as StepStatus,
        required: true,
        fields: {}
      },
      businessDetails: {
        id: 'businessDetails',
        title: 'Business Details',
        description: 'Optional business registration and tax information',
        status: 'incomplete' as StepStatus,
        required: false,
        fields: {}
      },
      payoutSetup: {
        id: 'payoutSetup',
        title: 'Payout Setup',
        description: 'Configure how you receive payments (can be set up later)',
        status: 'incomplete' as StepStatus,
        required: false,
        fields: {}
      }
    }
    
    // Reset to in_progress with clean state
    await updateDoc(docRef, {
      status: 'in_progress',
      steps: resetSteps,
      files: {},
      reviewNotes: null,
      reasonCodes: null,
      reviewedAt: null,
      submittedAt: null,
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error restarting verification:', error)
    throw error
  }
}
