import { adminDb } from '@/lib/firebase/admin'

/**
 * Get all events for a specific organizer
 */
export async function getOrganizerEvents(organizerId: string) {
  try {
    const eventsSnapshot = await adminDb
      .collection('events')
      .where('organizer_id', '==', organizerId)
      .orderBy('created_at', 'desc')
      .get()

    return eventsSnapshot.docs.map((doc: any) => {
      const data = doc.data()
      return {
        id: doc.id,
        title: data.title,
        description: data.description,
        startDateTime: data.start_datetime?.toDate?.() || new Date(data.start_datetime),
        endDateTime: data.end_datetime?.toDate?.() || new Date(data.end_datetime),
        venueName: data.venue_name || '',
        venueAddress: data.venue_address || '',
        city: data.city || data.commune || '',
        price: data.price || 0,
        maxAttendees: data.max_attendees || 0,
        bannerImage: data.banner_image || data.banner_image_url || '',
        category: data.category || '',
        status: data.status || 'draft',
        isPublished: data.is_published ?? data.status === 'published',
        createdAt: data.created_at?.toDate?.() || new Date(data.created_at || Date.now()),
        organizerId: data.organizer_id
      }
    })
  } catch (error) {
    console.error('Error fetching organizer events:', error)
    return []
  }
}

/**
 * Get tickets sold for organizer's events
 */
export async function getOrganizerTickets(organizerId: string) {
  try {
    // First get all event IDs for this organizer
    const events = await getOrganizerEvents(organizerId)
    const eventIds = events.map((e: any) => e.id)

    if (eventIds.length === 0) {
      return []
    }

    // Firestore 'in' queries limited to 10 items, so batch if needed
    const batchSize = 10
    const batches = []
    
    for (let i = 0; i < eventIds.length; i += batchSize) {
      const batch = eventIds.slice(i, i + batchSize)
      const ticketsSnapshot = await adminDb
        .collection('tickets')
        .where('event_id', 'in', batch)
        .get()
      
      batches.push(ticketsSnapshot)
    }

    const allTickets: any[] = []
    batches.forEach(snapshot => {
      snapshot.docs.forEach((doc: any) => {
        const data = doc.data()
        allTickets.push({
          id: doc.id,
          eventId: data.event_id,
          userId: data.user_id,
          pricePaid: data.price_paid || 0,
          status: data.status || 'active',
          purchasedAt: data.purchased_at?.toDate?.() || data.created_at?.toDate?.() || new Date(),
          checkedIn: data.checked_in || false
        })
      })
    })

    return allTickets
  } catch (error) {
    console.error('Error fetching organizer tickets:', error)
    return []
  }
}

/**
 * Get organizer sales statistics
 */
export async function getOrganizerStats(organizerId: string, range: '7d' | '30d' | 'lifetime' = '7d') {
  try {
    const [events, tickets] = await Promise.all([
      getOrganizerEvents(organizerId),
      getOrganizerTickets(organizerId)
    ])

    const now = new Date()
    const cutoffDate = range === 'lifetime' ? new Date(0) : 
                      range === '30d' ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) :
                      new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Filter tickets by date range
    const filteredTickets = tickets.filter((t: any) => t.purchasedAt >= cutoffDate)

    // Calculate stats
    const totalEvents = events.length
    const upcomingEvents = events.filter((e: any) => e.startDateTime > now).length
    const draftEvents = events.filter((e: any) => !e.isPublished).length
    const ticketsSold = filteredTickets.length
    const revenue = filteredTickets.reduce((sum: number, t: any) => sum + (t.pricePaid || 0), 0)
    const avgTicketsPerEvent = totalEvents > 0 ? ticketsSold / totalEvents : 0

    // Find events with 0 sales starting within 7 days
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const eventsWithTickets = new Set(tickets.map((t: any) => t.eventId))
    const upcomingSoonWithNoSales = events.filter((e: any) =>
      e.isPublished &&
      e.startDateTime > now && 
      e.startDateTime <= sevenDaysFromNow &&
      !eventsWithTickets.has(e.id)
    )

    return {
      totalEvents,
      upcomingEvents,
      draftEvents,
      ticketsSold,
      revenue,
      avgTicketsPerEvent,
      upcomingSoonWithNoSales: upcomingSoonWithNoSales.length,
      events,
      tickets: filteredTickets
    }
  } catch (error) {
    console.error('Error calculating organizer stats:', error)
    return {
      totalEvents: 0,
      upcomingEvents: 0,
      draftEvents: 0,
      ticketsSold: 0,
      revenue: 0,
      avgTicketsPerEvent: 0,
      upcomingSoonWithNoSales: 0,
      events: [],
      tickets: []
    }
  }
}

/**
 * Get next upcoming event for organizer
 */
export async function getNextEvent(organizerId: string) {
  try {
    const events = await getOrganizerEvents(organizerId)
    const now = new Date()
    
    const upcomingEvents = events
      .filter((e: any) => e.startDateTime > now)
      .sort((a: any, b: any) => a.startDateTime.getTime() - b.startDateTime.getTime())

    if (upcomingEvents.length === 0) {
      return null
    }

    const nextEvent = upcomingEvents[0]
    
    // Get tickets for this specific event
    const ticketsSnapshot = await adminDb
      .collection('tickets')
      .where('event_id', '==', nextEvent.id)
      .get()

    const tickets = ticketsSnapshot.docs.map((doc: any) => {
      const data = doc.data()
      return {
        id: doc.id,
        pricePaid: data.price_paid || 0,
        status: data.status || 'active',
        checkedIn: data.checked_in || false
      }
    })

    const ticketsSold = tickets.length
    const revenue = tickets.reduce((sum: number, t: any) => sum + (t.pricePaid || 0), 0)
    const checkedInCount = tickets.filter((t: any) => t.checkedIn).length

    return {
      ...nextEvent,
      ticketsSold,
      revenue,
      checkedInCount,
      capacity: nextEvent.maxAttendees
    }
  } catch (error) {
    console.error('Error fetching next event:', error)
    return null
  }
}

/**
 * Get event with ticket statistics
 */
export async function getEventWithStats(eventId: string) {
  try {
    const eventDoc = await adminDb.collection('events').doc(eventId).get()
    
    if (!eventDoc.exists) {
      return null
    }

    const data = eventDoc.data()!
    
    // Get tickets for this event
    const ticketsSnapshot = await adminDb
      .collection('tickets')
      .where('event_id', '==', eventId)
      .get()

    const tickets = ticketsSnapshot.docs.map((doc: any) => {
      const data = doc.data()
      return {
        id: doc.id,
        pricePaid: data.price_paid || 0,
        status: data.status || 'active',
        checkedIn: data.checked_in || false,
        purchasedAt: data.purchased_at?.toDate?.() || data.created_at?.toDate?.() || new Date()
      }
    })

    const ticketsSold = tickets.length
    const revenue = tickets.reduce((sum: number, t: any) => sum + (t.pricePaid || 0), 0)
    const checkedInCount = tickets.filter((t: any) => t.checkedIn).length

    return {
      id: eventDoc.id,
      title: data.title,
      description: data.description,
      startDateTime: data.start_datetime?.toDate?.() || new Date(data.start_datetime),
      endDateTime: data.end_datetime?.toDate?.() || new Date(data.end_datetime),
      venueName: data.venue_name || '',
      venueAddress: data.venue_address || '',
      city: data.city || data.commune || '',
      price: data.price || 0,
      maxAttendees: data.max_attendees || 0,
      bannerImage: data.banner_image || data.banner_image_url || '',
      category: data.category || '',
      status: data.status || 'draft',
      isPublished: data.is_published ?? data.status === 'published',
      ticketsSold,
      revenue,
      checkedInCount,
      capacity: data.max_attendees || 0
    }
  } catch (error) {
    console.error('Error fetching event with stats:', error)
    return null
  }
}
