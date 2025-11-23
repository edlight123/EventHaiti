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

    // Get user data directly by ID
    const { data: userById, error: userByIdError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)

    // Also get all users and find
    const allUsers = await supabase.from('users').select('*')
    const userByFind = allUsers.data?.find((u: any) => u.id === user.id)

    return NextResponse.json({
      authUserId: user.id,
      authUserEmail: user.email,
      userByIdQuery: userById || null,
      userByIdError: userByIdError ? userByIdError.message : null,
      userByFind: userByFind || null,
      allUsersCount: allUsers.data?.length || 0,
    })
  } catch (err: any) {
    return NextResponse.json({
      error: err.message,
      stack: err.stack,
    }, { status: 500 })
  }
}
