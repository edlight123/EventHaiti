// Utility functions for uploading verification images to Firebase Storage
import { firebaseDb } from '@/lib/firebase-db/client'

export async function uploadVerificationImage(
  imageDataUrl: string,
  userId: string,
  imageType: 'id_front' | 'id_back' | 'face'
): Promise<{ url: string | null; error: any }> {
  try {
    // Convert base64 to blob
    const base64Data = imageDataUrl.split(',')[1]
    const byteCharacters = atob(base64Data)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: 'image/jpeg' })
    
    // Create File object
    const timestamp = Date.now()
    const fileName = `${userId}_${imageType}_${timestamp}.jpg`
    const file = new File([blob], fileName, { type: 'image/jpeg' })
    
    // Upload directly to Firebase Storage
    const path = `verification/${userId}/${fileName}`
    const { data, error } = await firebaseDb.storage.from('verification-images').upload(path, file)
    
    if (error || !data) {
      throw error || new Error('Upload failed')
    }
    
    return { url: data.publicUrl, error: null }
  } catch (error) {
    console.error('Error uploading verification image:', error)
    return { url: null, error }
  }
}
