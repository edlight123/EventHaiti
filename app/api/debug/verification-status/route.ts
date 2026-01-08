import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/firebase-db/server'
import { requireAdmin } from '@/lib/auth'
import { adminError, adminOk } from '@/lib/api/admin-response'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin()
    if (error || !user) {
      return adminError(error || 'Unauthorized', error === 'Not authenticated' ? 401 : 403)
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

    return adminOk({
      userId: user.id,
      userEmail: user.email,
      userData: userData || null,
      verificationRequests: sortedRequests || [],
      error: error ? error.message : null,
    })
  } catch (err: any) {
    return adminError('Internal server error', 500, err?.message || String(err))
  }
}
