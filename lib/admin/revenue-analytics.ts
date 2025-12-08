/**
 * Admin Revenue Analytics with Multi-Currency Support
 * Provides detailed revenue breakdowns accounting for HTG/USD conversions
 */

import { adminDb } from '@/lib/firebase/admin'

export interface RevenueBreakdown {
  totalRevenueUSD: number
  totalRevenueHTG: number
  totalTickets: number
  
  // By currency
  byCurrency: {
    HTG: {
      revenue: number
      tickets: number
      averagePrice: number
      convertedToUSD: number
    }
    USD: {
      revenue: number
      tickets: number
      averagePrice: number
    }
  }
  
  // By payment method
  byPaymentMethod: {
    stripe: {
      revenueUSD: number
      tickets: number
      averagePrice: number
    }
    moncash: {
      revenueHTG: number
      revenueUSD: number
      tickets: number
      averagePrice: number
    }
    natcash: {
      revenueHTG: number
      revenueUSD: number
      tickets: number
      averagePrice: number
    }
  }
  
  // Exchange rate info
  exchangeRates: {
    averageRate: number
    minRate: number
    maxRate: number
    rateSpread: number
  }
}

export interface PlatformMetrics {
  revenue: RevenueBreakdown
  growth: {
    revenueGrowth7d: number
    ticketsGrowth7d: number
    revenueGrowth30d: number
    ticketsGrowth30d: number
  }
  topOrganizers: Array<{
    organizerId: string
    organizerName: string
    revenueUSD: number
    tickets: number
  }>
  topEvents: Array<{
    eventId: string
    eventTitle: string
    revenueUSD: number
    tickets: number
  }>
}

/**
 * Get comprehensive platform revenue analytics
 */
export async function getPlatformRevenueAnalytics(
  startDate?: Date,
  endDate?: Date
): Promise<RevenueBreakdown> {
  const ticketsRef = adminDb.collection('tickets')
  let query: any = ticketsRef.where('status', '==', 'confirmed')

  if (startDate) {
    query = query.where('created_at', '>=', startDate)
  }
  if (endDate) {
    query = query.where('created_at', '<=', endDate)
  }

  const snapshot = await query.get()
  const tickets = snapshot.docs.map((doc: any) => ({
    id: doc.id,
    ...doc.data()
  }))

  // Initialize breakdown
  const breakdown: RevenueBreakdown = {
    totalRevenueUSD: 0,
    totalRevenueHTG: 0,
    totalTickets: tickets.length,
    byCurrency: {
      HTG: { revenue: 0, tickets: 0, averagePrice: 0, convertedToUSD: 0 },
      USD: { revenue: 0, tickets: 0, averagePrice: 0 }
    },
    byPaymentMethod: {
      stripe: { revenueUSD: 0, tickets: 0, averagePrice: 0 },
      moncash: { revenueHTG: 0, revenueUSD: 0, tickets: 0, averagePrice: 0 },
      natcash: { revenueHTG: 0, revenueUSD: 0, tickets: 0, averagePrice: 0 }
    },
    exchangeRates: {
      averageRate: 0,
      minRate: Number.MAX_VALUE,
      maxRate: 0,
      rateSpread: 0
    }
  }

  const exchangeRates: number[] = []

  for (const ticket of tickets) {
    const price = ticket.price_paid || 0
    const currency = (ticket.currency || 'USD').toUpperCase()
    const originalCurrency = (ticket.original_currency || currency).toUpperCase()
    const exchangeRate = ticket.exchange_rate_used || 1
    const paymentMethod = (ticket.payment_method || 'stripe').toLowerCase()

    // Track exchange rates
    if (exchangeRate !== 1 && originalCurrency === 'HTG') {
      exchangeRates.push(exchangeRate)
    }

    // Calculate USD equivalent
    let priceUSD = price
    let priceHTG = 0

    if (currency === 'HTG') {
      priceHTG = price
      priceUSD = price * (exchangeRate || 0.0076)
    } else if (originalCurrency === 'HTG' && currency === 'USD') {
      priceHTG = price / (exchangeRate || 0.0076)
      priceUSD = price
    } else {
      priceUSD = price
    }

    // Update totals
    breakdown.totalRevenueUSD += priceUSD
    breakdown.totalRevenueHTG += priceHTG

    // Update currency breakdown
    if (originalCurrency === 'HTG') {
      breakdown.byCurrency.HTG.revenue += priceHTG
      breakdown.byCurrency.HTG.tickets++
      breakdown.byCurrency.HTG.convertedToUSD += priceUSD
    } else {
      breakdown.byCurrency.USD.revenue += priceUSD
      breakdown.byCurrency.USD.tickets++
    }

    // Update payment method breakdown
    if (paymentMethod === 'stripe') {
      breakdown.byPaymentMethod.stripe.revenueUSD += priceUSD
      breakdown.byPaymentMethod.stripe.tickets++
    } else if (paymentMethod === 'moncash') {
      breakdown.byPaymentMethod.moncash.revenueHTG += priceHTG
      breakdown.byPaymentMethod.moncash.revenueUSD += priceUSD
      breakdown.byPaymentMethod.moncash.tickets++
    } else if (paymentMethod === 'natcash') {
      breakdown.byPaymentMethod.natcash.revenueHTG += priceHTG
      breakdown.byPaymentMethod.natcash.revenueUSD += priceUSD
      breakdown.byPaymentMethod.natcash.tickets++
    }
  }

  // Calculate averages
  if (breakdown.byCurrency.HTG.tickets > 0) {
    breakdown.byCurrency.HTG.averagePrice = 
      breakdown.byCurrency.HTG.revenue / breakdown.byCurrency.HTG.tickets
  }
  if (breakdown.byCurrency.USD.tickets > 0) {
    breakdown.byCurrency.USD.averagePrice = 
      breakdown.byCurrency.USD.revenue / breakdown.byCurrency.USD.tickets
  }
  if (breakdown.byPaymentMethod.stripe.tickets > 0) {
    breakdown.byPaymentMethod.stripe.averagePrice = 
      breakdown.byPaymentMethod.stripe.revenueUSD / breakdown.byPaymentMethod.stripe.tickets
  }
  if (breakdown.byPaymentMethod.moncash.tickets > 0) {
    breakdown.byPaymentMethod.moncash.averagePrice = 
      breakdown.byPaymentMethod.moncash.revenueHTG / breakdown.byPaymentMethod.moncash.tickets
  }
  if (breakdown.byPaymentMethod.natcash.tickets > 0) {
    breakdown.byPaymentMethod.natcash.averagePrice = 
      breakdown.byPaymentMethod.natcash.revenueHTG / breakdown.byPaymentMethod.natcash.tickets
  }

  // Calculate exchange rate statistics
  if (exchangeRates.length > 0) {
    breakdown.exchangeRates.averageRate = 
      exchangeRates.reduce((sum, rate) => sum + rate, 0) / exchangeRates.length
    breakdown.exchangeRates.minRate = Math.min(...exchangeRates)
    breakdown.exchangeRates.maxRate = Math.max(...exchangeRates)
    breakdown.exchangeRates.rateSpread = 
      breakdown.exchangeRates.maxRate - breakdown.exchangeRates.minRate
  }

  return breakdown
}

/**
 * Get complete platform metrics including growth
 */
export async function getCompletePlatformMetrics(): Promise<PlatformMetrics> {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Get current period data
  const currentRevenue = await getPlatformRevenueAnalytics()
  
  // Get 7-day growth
  const revenue7dAgo = await getPlatformRevenueAnalytics(undefined, sevenDaysAgo)
  const revenueLast7d = await getPlatformRevenueAnalytics(sevenDaysAgo, now)
  
  // Get 30-day growth
  const revenue30dAgo = await getPlatformRevenueAnalytics(undefined, thirtyDaysAgo)
  const revenueLast30d = await getPlatformRevenueAnalytics(thirtyDaysAgo, now)

  const revenueGrowth7d = revenue7dAgo.totalRevenueUSD > 0
    ? ((revenueLast7d.totalRevenueUSD - revenue7dAgo.totalRevenueUSD) / revenue7dAgo.totalRevenueUSD) * 100
    : 0

  const ticketsGrowth7d = revenue7dAgo.totalTickets > 0
    ? ((revenueLast7d.totalTickets - revenue7dAgo.totalTickets) / revenue7dAgo.totalTickets) * 100
    : 0

  const revenueGrowth30d = revenue30dAgo.totalRevenueUSD > 0
    ? ((revenueLast30d.totalRevenueUSD - revenue30dAgo.totalRevenueUSD) / revenue30dAgo.totalRevenueUSD) * 100
    : 0

  const ticketsGrowth30d = revenue30dAgo.totalTickets > 0
    ? ((revenueLast30d.totalTickets - revenue30dAgo.totalTickets) / revenue30dAgo.totalTickets) * 100
    : 0

  // Get top performers
  const { topOrganizers, topEvents } = await getTopPerformers()

  return {
    revenue: currentRevenue,
    growth: {
      revenueGrowth7d,
      ticketsGrowth7d,
      revenueGrowth30d,
      ticketsGrowth30d
    },
    topOrganizers,
    topEvents
  }
}

/**
 * Get top performing organizers and events
 */
async function getTopPerformers() {
  const ticketsSnapshot = await adminDb
    .collection('tickets')
    .where('status', '==', 'confirmed')
    .get()

  const tickets = ticketsSnapshot.docs.map((doc: any) => ({
    id: doc.id,
    ...doc.data()
  }))

  // Group by organizer
  const organizerRevenue = new Map<string, { name: string; revenue: number; tickets: number }>()
  
  // Group by event
  const eventRevenue = new Map<string, { title: string; revenue: number; tickets: number }>()

  for (const ticket of tickets) {
    const price = ticket.price_paid || 0
    const currency = (ticket.currency || 'USD').toUpperCase()
    const exchangeRate = ticket.exchange_rate_used || 1
    
    const priceUSD = currency === 'HTG' ? price * exchangeRate : price

    // Update organizer revenue
    if (ticket.organizer_id) {
      const current = organizerRevenue.get(ticket.organizer_id) || { 
        name: ticket.organizer_name || 'Unknown', 
        revenue: 0, 
        tickets: 0 
      }
      organizerRevenue.set(ticket.organizer_id, {
        name: current.name,
        revenue: current.revenue + priceUSD,
        tickets: current.tickets + 1
      })
    }

    // Update event revenue
    if (ticket.event_id) {
      const current = eventRevenue.get(ticket.event_id) || { 
        title: ticket.event_title || 'Unknown', 
        revenue: 0, 
        tickets: 0 
      }
      eventRevenue.set(ticket.event_id, {
        title: current.title,
        revenue: current.revenue + priceUSD,
        tickets: current.tickets + 1
      })
    }
  }

  // Sort and get top 10
  const topOrganizers = Array.from(organizerRevenue.entries())
    .map(([id, data]) => ({
      organizerId: id,
      organizerName: data.name,
      revenueUSD: data.revenue,
      tickets: data.tickets
    }))
    .sort((a, b) => b.revenueUSD - a.revenueUSD)
    .slice(0, 10)

  const topEvents = Array.from(eventRevenue.entries())
    .map(([id, data]) => ({
      eventId: id,
      eventTitle: data.title,
      revenueUSD: data.revenue,
      tickets: data.tickets
    }))
    .sort((a, b) => b.revenueUSD - a.revenueUSD)
    .slice(0, 10)

  return { topOrganizers, topEvents }
}

/**
 * Get revenue by time period (for charts)
 */
export async function getRevenueByPeriod(
  period: 'daily' | 'weekly' | 'monthly',
  startDate: Date,
  endDate: Date
): Promise<Array<{ date: string; revenueUSD: number; revenueHTG: number; tickets: number }>> {
  const ticketsSnapshot = await adminDb
    .collection('tickets')
    .where('status', '==', 'confirmed')
    .where('created_at', '>=', startDate)
    .where('created_at', '<=', endDate)
    .get()

  const tickets = ticketsSnapshot.docs.map((doc: any) => ({
    id: doc.id,
    ...doc.data()
  }))

  const revenueByDate = new Map<string, { revenueUSD: number; revenueHTG: number; tickets: number }>()

  for (const ticket of tickets) {
    const createdAt = ticket.created_at?.toDate?.() || new Date()
    const price = ticket.price_paid || 0
    const currency = (ticket.currency || 'USD').toUpperCase()
    const exchangeRate = ticket.exchange_rate_used || 1

    const priceUSD = currency === 'HTG' ? price * exchangeRate : price
    const priceHTG = currency === 'USD' ? price / exchangeRate : price

    let dateKey: string
    if (period === 'daily') {
      dateKey = createdAt.toISOString().split('T')[0]
    } else if (period === 'weekly') {
      const weekStart = new Date(createdAt)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      dateKey = weekStart.toISOString().split('T')[0]
    } else {
      dateKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`
    }

    const current = revenueByDate.get(dateKey) || { revenueUSD: 0, revenueHTG: 0, tickets: 0 }
    revenueByDate.set(dateKey, {
      revenueUSD: current.revenueUSD + priceUSD,
      revenueHTG: current.revenueHTG + priceHTG,
      tickets: current.tickets + 1
    })
  }

  return Array.from(revenueByDate.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
