/**
 * Migration script to fix ticket tiers created by mobile app
 * Renames display_order to sort_order and adds missing fields
 */

import { adminDb } from '../lib/firebase/admin'

async function fixMobileTicketTiers() {
  try {
    console.log('Starting ticket tier migration...')
    
    // Get all ticket tiers
    const tiersSnapshot = await adminDb.collection('ticket_tiers').get()
    
    console.log(`Found ${tiersSnapshot.docs.length} ticket tiers`)
    
    let fixed = 0
    let skipped = 0
    
    for (const tierDoc of tiersSnapshot.docs) {
      const data = tierDoc.data()
      const updates: any = {}
      
      // Check if it has display_order instead of sort_order
      if (data.display_order !== undefined && data.sort_order === undefined) {
        updates.sort_order = data.display_order
        console.log(`Tier ${tierDoc.id}: Adding sort_order = ${data.display_order}`)
      }
      
      // Add is_active if missing
      if (data.is_active === undefined) {
        updates.is_active = true
        console.log(`Tier ${tierDoc.id}: Adding is_active = true`)
      }
      
      // Add sales_start if missing
      if (data.sales_start === undefined) {
        updates.sales_start = null
        console.log(`Tier ${tierDoc.id}: Adding sales_start = null`)
      }
      
      // Add sales_end if missing
      if (data.sales_end === undefined) {
        updates.sales_end = null
        console.log(`Tier ${tierDoc.id}: Adding sales_end = null`)
      }
      
      // Simplify description if it has price in it
      if (data.description && data.description.includes(' - $')) {
        updates.description = data.name
        console.log(`Tier ${tierDoc.id}: Simplifying description to "${data.name}"`)
      }
      
      if (Object.keys(updates).length > 0) {
        await adminDb.collection('ticket_tiers').doc(tierDoc.id).update(updates)
        fixed++
        console.log(`✓ Fixed tier ${tierDoc.id} (${data.name})`)
      } else {
        skipped++
      }
    }
    
    console.log('\n=== Migration Complete ===')
    console.log(`Fixed: ${fixed} tiers`)
    console.log(`Skipped: ${skipped} tiers (already correct)`)
    console.log(`Total: ${tiersSnapshot.docs.length} tiers`)
    
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

fixMobileTicketTiers()
  .then(() => {
    console.log('\nMigration successful!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Migration error:', error)
    process.exit(1)
  })
