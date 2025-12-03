import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { updateUserProfileAdmin } from '@/lib/firestore/user-profile-admin'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const updates = await request.json()

    // Update profile using admin SDK
    await updateUserProfileAdmin(user.id, updates)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update profile' },
      { status: 500 }
    )
  }
}
