#!/usr/bin/env node
/**
 * Backfill Daily Stats Script
 * 
 * Generates platform_stats_daily rollups for past dates
 * Usage: node scripts/backfill-daily-stats.js [days]
 * Example: node scripts/backfill-daily-stats.js 30  (backfill last 30 days)
 */

const admin = require('firebase-admin')

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}')
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  })
}

const db = admin.firestore()

async function backfillDailyStats(daysToBackfill = 7) {
  console.log(`📊 Backfilling daily stats for the last ${daysToBackfill} days...\n`)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 1; i <= daysToBackfill; i++) {
    const targetDate = new Date(today)
    targetDate.setDate(targetDate.getDate() - i)
    
    const nextDate = new Date(targetDate)
    nextDate.setDate(nextDate.getDate() + 1)
    
    const dateStr = targetDate.toISOString().split('T')[0]
    
    console.log(`Processing ${dateStr}...`)

    try {
      // Get confirmed tickets for this day
      const ticketsSnapshot = await db
        .collection('tickets')
        .where('purchased_at', '>=', targetDate)
        .where('purchased_at', '<', nextDate)
        .where('status', '==', 'confirmed')
        .get()

      let gmvConfirmed = 0
      let ticketsConfirmed = 0

      ticketsSnapshot.forEach(doc => {
        const data = doc.data()
        const pricePaid = data.price_paid || data.pricePaid || 0
        gmvConfirmed += pricePaid
        ticketsConfirmed++
      })

      // Get refunds for this day
      const refundsSnapshot = await db
        .collection('tickets')
        .where('updated_at', '>=', targetDate)
        .where('updated_at', '<', nextDate)
        .where('status', '==', 'refunded')
        .get()

      const refundsCount = refundsSnapshot.size
      let refundsAmount = 0

      refundsSnapshot.forEach(doc => {
        const data = doc.data()
        const pricePaid = data.price_paid || data.pricePaid || 0
        refundsAmount += pricePaid
      })

      // Save to platform_stats_daily
      await db
        .collection('platform_stats_daily')
        .doc(dateStr)
        .set({
          date: dateStr,
          gmvConfirmed,
          ticketsConfirmed,
          refundsCount,
          refundsAmount,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })

      console.log(`  ✅ ${dateStr}: ${ticketsConfirmed} tickets, ${gmvConfirmed.toFixed(2)} HTG, ${refundsCount} refunds`)

    } catch (error) {
      console.error(`  ❌ Error processing ${dateStr}:`, error.message)
    }
  }

  console.log('\n✅ Backfill complete!')
}

// Get days from command line args or default to 7
const daysArg = process.argv[2]
const days = daysArg ? parseInt(daysArg, 10) : 7

if (isNaN(days) || days < 1) {
  console.error('❌ Invalid number of days. Please provide a positive number.')
  process.exit(1)
}

backfillDailyStats(days)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
