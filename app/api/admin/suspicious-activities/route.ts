import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/firebase-db/server'

/**
 * Admin endpoint to view suspicious activities
 * Requires admin privileges
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const reviewed = searchParams.get('reviewed')
    const severity = searchParams.get('severity')
    const activityType = searchParams.get('activityType')
    const limit = parseInt(searchParams.get('limit') || '50')

    const supabase = await createClient()

    let query = supabase
      .from('suspicious_activities')
      .select('*, users(name, email)')
      .order('detected_at', { ascending: false })
      .limit(limit)

    if (reviewed !== null) {
      query = query.eq('reviewed', reviewed === 'true')
    }

    if (severity) {
      query = query.eq('severity', severity)
    }

    if (activityType) {
      query = query.eq('activity_type', activityType)
    }

    const { data: activities, error } = await query

    if (error) {
      console.error('Error fetching suspicious activities:', error)
      return NextResponse.json(
        { error: 'Failed to fetch activities' },
        { status: 500 }
      )
    }

    // Get count of unreviewed activities
    const { data: unreviewedActivities } = await supabase
      .from('suspicious_activities')
      .select('id')
      .eq('reviewed', false)

    return NextResponse.json({
      activities,
      unreviewedCount: unreviewedActivities?.length || 0,
      total: activities.length,
    })
  } catch (error) {
    console.error('Error in suspicious activities endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Mark suspicious activity as reviewed
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { activityId, actionTaken } = await req.json()

    if (!activityId) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('suspicious_activities')
      .update({
        reviewed: true,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        action_taken: actionTaken || null,
      })
      .eq('id', activityId)

    if (error) {
      console.error('Error updating suspicious activity:', error)
      return NextResponse.json(
        { error: 'Failed to update activity' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PATCH suspicious activities:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
