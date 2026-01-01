import { cookies, headers } from 'next/headers'
import { adminAuth } from './admin'

export async function getServerSession() {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')?.value

    // Mobile app support: allow Firebase ID token auth.
    // The mobile client can send `Authorization: Bearer <firebase_id_token>`.
    if (!sessionCookie) {
      const headerStore = await headers()
      const authHeader = headerStore.get('authorization') || headerStore.get('Authorization')
      const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : null

      const tokenFromAltHeader =
        headerStore.get('x-firebase-token') ||
        headerStore.get('X-Firebase-Token') ||
        headerStore.get('x-firebase-token'.toLowerCase())

      const token = bearer || (tokenFromAltHeader ? String(tokenFromAltHeader).trim() : null)

      if (!token) {
        return { user: null, error: 'No session cookie' }
      }

      const decodedClaims = await adminAuth.verifyIdToken(token, true)
      const user = await adminAuth.getUser(decodedClaims.uid)

      return {
        user: {
          id: user.uid,
          email: user.email || '',
          user_metadata: {
            full_name: user.displayName || '',
            phone: user.phoneNumber || '',
          },
        },
        error: null,
      }
    }

    // Verify the session cookie
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true)
    const user = await adminAuth.getUser(decodedClaims.uid)

    return {
      user: {
        id: user.uid,
        email: user.email || '',
        user_metadata: {
          full_name: user.displayName || '',
          phone: user.phoneNumber || '',
        },
      },
      error: null,
    }
  } catch (error) {
    console.error('Session verification error:', error)
    return { user: null, error: 'Invalid session' }
  }
}
