import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { getCurrentUser } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'

/**
 * Migration endpoint to fix ticket tiers created by mobile app
 * Requires admin authentication
 */
export async function POST(req: NextRequest) {
  try {
    // Check admin auth
    const user = await getCurrentUser()
    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventId } = await req.json()

    console.log('Starting ticket tier migration...')
    
    let query = adminDb.collection('ticket_tiers')
    
    // If eventId provided, only fix that event's tiers
    if (eventId) {
      console.log(`Migrating tiers for event: ${eventId}`)
      query = query.where('event_id', '==', eventId) as any
    }
    
    const tiersSnapshot = await query.get()
    
    console.log(`Found ${tiersSnapshot.docs.length} ticket tiers`)
    
    let fixed = 0
    let skipped = 0
    const fixedTiers = []
    
    for (const tierDoc of tiersSnapshot.docs) {
      const data = tierDoc.data()
      const updates: any = {}
      
      // Check if it has display_order instead of sort_order
      if (data.display_order !== undefined && data.sort_order === undefined) {
        updates.sort_order = data.display_order
      }
      
      // Add is_active if missing
      if (data.is_active === undefined) {
        updates.is_active = true
      }
      
      // Add sales_start if missing
      if (data.sales_start === undefined) {
        updates.sales_start = null
      }
      
      // Add sales_end if missing
      if (data.sales_end === undefined) {
        updates.sales_end = null
      }
      
      // Simplify description if it has price in it
      if (data.description && data.description.includes(' - $')) {
        updates.description = data.name
      }
      
      if (Object.keys(updates).length > 0) {
        await adminDb.collection('ticket_tiers').doc(tierDoc.id).update(updates)
        fixed++
        fixedTiers.push({
          id: tierDoc.id,
          name: data.name,
          event_id: data.event_id,
          updates
        })
        console.log(`✓ Fixed tier ${tierDoc.id} (${data.name})`)
      } else {
        skipped++
      }
    }
    
    return NextResponse.json({
      success: true,
      total: tiersSnapshot.docs.length,
      fixed,
      skipped,
      fixedTiers
    })
    
  } catch (error: any) {
    console.error('Migration failed:', error)
    return NextResponse.json(
      { error: 'Migration failed', details: error.message },
      { status: 500 }
    )
  }
}
