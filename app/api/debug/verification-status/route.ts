import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get user data
    const allUsers = await supabase.from('users').select('*')
    const userData = allUsers.data?.find((u: any) => u.id === user.id)

    // Get all verification requests for this user
    const { data: requests, error } = await supabase
      .from('verification_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      userId: user.id,
      userEmail: user.email,
      userData: {
        is_verified: userData?.is_verified,
        verification_status: userData?.verification_status,
      },
      verificationRequests: requests || [],
      error: error ? error.message : null,
    })
  } catch (err: any) {
    return NextResponse.json({
      error: err.message,
      stack: err.stack,
    }, { status: 500 })
  }
}
