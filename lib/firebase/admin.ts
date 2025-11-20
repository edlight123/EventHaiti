import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

let app: App | undefined

// Don't initialize during build time (when VERCEL_ENV is not set or when in build phase)
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build'

if (!isBuildTime && !getApps().length) {
  // Initialize with service account or Application Default Credentials
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      app = initializeApp({
        credential: cert(serviceAccount),
      })
    } catch (error) {
      console.error('Failed to parse Firebase service account:', error)
      app = undefined
    }
  } else {
    // For development - uses Application Default Credentials
    try {
      app = initializeApp()
    } catch (error) {
      console.warn('Firebase Admin not initialized (expected during build):', error)
      app = undefined
    }
  }
} else if (getApps().length > 0) {
  app = getApps()[0]
}

export const adminAuth = app ? getAuth(app) : ({} as any)
export const adminDb = app ? getFirestore(app) : ({} as any)
export const adminStorage = app ? getStorage(app) : ({} as any)
export default app
