import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { deleteAllNotifications } from '@/lib/notifications/helpers'

/**
 * DELETE /api/notifications/clear-all
 * Clear all notifications for the current user
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const deletedCount = await deleteAllNotifications(user.id)

    return NextResponse.json({ 
      success: true,
      deletedCount,
      message: `Cleared ${deletedCount} notification${deletedCount !== 1 ? 's' : ''}`
    })
  } catch (error: any) {
    console.error('Error clearing notifications:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to clear notifications' },
      { status: 500 }
    )
  }
}
