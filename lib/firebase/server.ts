import { cookies } from 'next/headers'
import { adminAuth } from './admin'

export async function getServerSession() {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')?.value

    if (!sessionCookie) {
      return { user: null, error: 'No session cookie' }
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
