import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { validateTicketScan, recordTicketScan, logSuspiciousActivity } from '@/lib/security'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { ticketId } = await req.json()

    if (!ticketId) {
      return NextResponse.json(
        { error: 'Ticket ID is required' },
        { status: 400 }
      )
    }

    // Validate the ticket scan
    const validation = await validateTicketScan(ticketId, user.id)

    if (!validation.valid) {
      return NextResponse.json(
        { 
          success: false, 
          error: validation.reason,
          canRetry: false,
        },
        { status: 400 }
      )
    }

    // Record the scan
    await recordTicketScan(ticketId, user.id)

    return NextResponse.json({
      success: true,
      message: 'Ticket scanned successfully',
      ticket: validation.ticket,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error scanning ticket:', error)
    
    // Log suspicious activity if error occurs
    await logSuspiciousActivity({
      activityType: 'duplicate_tickets',
      description: `Error during ticket scan: ${error}`,
      severity: 'medium',
      metadata: { error: String(error) },
    })

    return NextResponse.json(
      { error: 'Failed to scan ticket' },
      { status: 500 }
    )
  }
}
