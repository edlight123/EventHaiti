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

    // Get all verification requests for this user - without ordering to avoid index requirement
    const { data: requests, error } = await supabase
      .from('verification_requests')
      .select('*')
      .eq('user_id', user.id)

    // Sort in memory
    const sortedRequests = requests?.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    return NextResponse.json({
      userId: user.id,
      userEmail: user.email,
      userData: userData || null,
      verificationRequests: sortedRequests || [],
      error: error ? error.message : null,
    })
  } catch (err: any) {
    return NextResponse.json({
      error: err.message,
      stack: err.stack,
    }, { status: 500 })
  }
}
