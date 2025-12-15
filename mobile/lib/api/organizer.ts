import { db } from '../../config/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
  getDoc,
  doc,
} from 'firebase/firestore';

export interface OrganizerEvent {
  id: string;
  title: string;
  description: string;
  start_datetime: string;
  end_datetime: string;
  location: string;
  city: string;
  cover_image_url?: string;
  organizer_id: string;
  is_published: boolean;
  tickets_sold: number;
  total_tickets: number;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface OrganizerStats {
  totalEvents: number;
  upcomingEvents: number;
  draftEvents: number;
  ticketsSold: number;
  revenue: number;
  avgTicketsPerEvent: number;
  upcomingSoonWithNoSales: number;
}

export interface TodayEvent {
  id: string;
  title: string;
  start_datetime: string;
  location: string;
  ticketsSold: number;
  ticketsCheckedIn: number;
  capacity: number;
}

/**
 * Fetch organizer events from Firestore
 */
export async function getOrganizerEvents(
  organizerId: string,
  pageSize: number = 50
): Promise<OrganizerEvent[]> {
  try {
    const q = query(
      collection(db, 'events'),
      where('organizer_id', '==', organizerId),
      orderBy('created_at', 'desc'),
      limit(pageSize)
    );

    const snapshot = await getDocs(q);

    const events = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        start_datetime:
          data.start_datetime instanceof Timestamp
            ? data.start_datetime.toDate().toISOString()
            : data.start_datetime,
        end_datetime:
          data.end_datetime instanceof Timestamp
            ? data.end_datetime.toDate().toISOString()
            : data.end_datetime,
        created_at:
          data.created_at instanceof Timestamp
            ? data.created_at.toDate().toISOString()
            : data.created_at,
        updated_at:
          data.updated_at instanceof Timestamp
            ? data.updated_at.toDate().toISOString()
            : data.updated_at,
      } as OrganizerEvent;
    });

    // Filter out cancelled events
    return events.filter(event => event.status !== 'cancelled');
  } catch (error) {
    console.error('Error fetching organizer events:', error);
    return [];
  }
}

/**
 * Fetch organizer tickets
 */
async function getOrganizerTickets(organizerId: string): Promise<any[]> {
  try {
    // First get all event IDs for this organizer
    const events = await getOrganizerEvents(organizerId, 500);
    const eventIds = events.map((e) => e.id);

    if (eventIds.length === 0) {
      return [];
    }

    // Firestore 'in' query limit is 10, so batch if needed
    const tickets: any[] = [];
    const batchSize = 10;

    for (let i = 0; i < eventIds.length; i += batchSize) {
      const batch = eventIds.slice(i, i + batchSize);
      const q = query(
        collection(db, 'tickets'),
        where('event_id', 'in', batch)
      );

      const snapshot = await getDocs(q);
      const batchTickets = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          purchased_at:
            data.purchased_at instanceof Timestamp
              ? data.purchased_at.toDate().toISOString()
              : data.purchased_at,
        };
      });
      tickets.push(...batchTickets);
    }

    return tickets;
  } catch (error) {
    console.error('Error fetching organizer tickets:', error);
    return [];
  }
}

/**
 * Calculate organizer statistics
 */
export async function getOrganizerStats(
  organizerId: string,
  range: '7d' | '30d' | 'lifetime' = '7d'
): Promise<OrganizerStats> {
  try {
    const [events, tickets] = await Promise.all([
      getOrganizerEvents(organizerId, 500),
      getOrganizerTickets(organizerId),
    ]);

    const now = new Date();
    const cutoffDate =
      range === 'lifetime'
        ? new Date(0)
        : range === '30d'
        ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Filter tickets by date range
    const filteredTickets = tickets.filter(
      (t: any) => new Date(t.purchased_at) >= cutoffDate
    );

    // Calculate stats
    const totalEvents = events.length;
    const upcomingEvents = events.filter(
      (e) => new Date(e.start_datetime) > now
    ).length;
    const draftEvents = events.filter((e) => !e.is_published).length;
    const ticketsSold = filteredTickets.length;
    const revenue = filteredTickets.reduce(
      (sum: number, t: any) => sum + (t.price_paid || 0),
      0
    );
    const avgTicketsPerEvent =
      totalEvents > 0 ? ticketsSold / totalEvents : 0;

    // Find events with 0 sales starting within 7 days
    const sevenDaysFromNow = new Date(
      now.getTime() + 7 * 24 * 60 * 60 * 1000
    );
    const eventsWithTickets = new Set(tickets.map((t: any) => t.event_id));
    const upcomingSoonWithNoSales = events.filter(
      (e) =>
        e.is_published &&
        new Date(e.start_datetime) > now &&
        new Date(e.start_datetime) <= sevenDaysFromNow &&
        !eventsWithTickets.has(e.id)
    ).length;

    return {
      totalEvents,
      upcomingEvents,
      draftEvents,
      ticketsSold,
      revenue,
      avgTicketsPerEvent,
      upcomingSoonWithNoSales,
    };
  } catch (error) {
    console.error('Error calculating organizer stats:', error);
    return {
      totalEvents: 0,
      upcomingEvents: 0,
      draftEvents: 0,
      ticketsSold: 0,
      revenue: 0,
      avgTicketsPerEvent: 0,
      upcomingSoonWithNoSales: 0,
    };
  }
}

/**
 * Get today's events for organizer
 */
export async function getTodayEvents(
  organizerId: string
): Promise<TodayEvent[]> {
  try {
    const events = await getOrganizerEvents(organizerId, 500);
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    // Filter events happening today (exclude cancelled events)
    const todayEvents = events.filter((e) => {
      const eventDate = new Date(e.start_datetime);
      const isToday = eventDate >= startOfDay && eventDate < endOfDay;
      const isCancelled = e.status === 'cancelled';
      return isToday && !isCancelled;
    });

    // Get ticket data for each event
    const eventsWithTickets = await Promise.all(
      todayEvents.map(async (event) => {
        try {
          const ticketsQuery = query(
            collection(db, 'tickets'),
            where('event_id', '==', event.id)
          );
          const ticketsSnapshot = await getDocs(ticketsQuery);

          const tickets = ticketsSnapshot.docs.map((doc) => doc.data());
          const ticketsSold = tickets.length;
          const ticketsCheckedIn = tickets.filter(
            (t) => t.checked_in
          ).length;

          return {
            id: event.id,
            title: event.title,
            start_datetime: event.start_datetime,
            location: event.location,
            ticketsSold,
            ticketsCheckedIn,
            capacity: event.total_tickets || 0,
          };
        } catch (error) {
          console.error(`Error fetching tickets for event ${event.id}:`, error);
          return {
            id: event.id,
            title: event.title,
            start_datetime: event.start_datetime,
            location: event.location,
            ticketsSold: 0,
            ticketsCheckedIn: 0,
            capacity: event.total_tickets || 0,
          };
        }
      })
    );

    return eventsWithTickets;
  } catch (error) {
    console.error('Error fetching today events:', error);
    return [];
  }
}

/**
 * Get single event details
 */
export async function getEventById(eventId: string): Promise<OrganizerEvent | null> {
  try {
    const eventDoc = await getDoc(doc(db, 'events', eventId));

    if (!eventDoc.exists()) {
      return null;
    }

    const data = eventDoc.data();
    return {
      id: eventDoc.id,
      ...data,
      start_datetime:
        data.start_datetime instanceof Timestamp
          ? data.start_datetime.toDate().toISOString()
          : data.start_datetime,
      end_datetime:
        data.end_datetime instanceof Timestamp
          ? data.end_datetime.toDate().toISOString()
          : data.end_datetime,
      created_at:
        data.created_at instanceof Timestamp
          ? data.created_at.toDate().toISOString()
          : data.created_at,
      updated_at:
        data.updated_at instanceof Timestamp
          ? data.updated_at.toDate().toISOString()
          : data.updated_at,
    } as OrganizerEvent;
  } catch (error) {
    console.error('Error fetching event:', error);
    return null;
  }
}

/**
 * Get ticket breakdown for an event
 */
export async function getEventTicketBreakdown(eventId: string): Promise<{
  ticketsSold: number;
  ticketsCheckedIn: number;
  capacity: number;
  ticketTypes: Array<{
    name: string;
    sold: number;
    capacity: number;
  }>;
}> {
  try {
    const [event, ticketsSnapshot] = await Promise.all([
      getEventById(eventId),
      getDocs(query(collection(db, 'tickets'), where('event_id', '==', eventId))),
    ]);

    if (!event) {
      return {
        ticketsSold: 0,
        ticketsCheckedIn: 0,
        capacity: 0,
        ticketTypes: [],
      };
    }

    const tickets = ticketsSnapshot.docs.map((doc) => doc.data());
    const ticketsSold = tickets.length;
    const ticketsCheckedIn = tickets.filter((t) => t.checked_in).length;

    // Group by ticket tier name
    const tierMap = new Map<string, { sold: number; capacity: number }>();
    tickets.forEach((ticket) => {
      const tierName = ticket.ticket_tier_name || 'General Admission';
      if (!tierMap.has(tierName)) {
        tierMap.set(tierName, { sold: 0, capacity: 0 });
      }
      const tier = tierMap.get(tierName)!;
      tier.sold += 1;
    });

    const ticketTypes = Array.from(tierMap.entries()).map(([name, data]) => ({
      name,
      sold: data.sold,
      capacity: data.capacity || data.sold, // Use sold as capacity if not available
    }));

    return {
      ticketsSold,
      ticketsCheckedIn,
      capacity: event.total_tickets || 0,
      ticketTypes,
    };
  } catch (error) {
    console.error('Error fetching event ticket breakdown:', error);
    return {
      ticketsSold: 0,
      ticketsCheckedIn: 0,
      capacity: 0,
      ticketTypes: [],
    };
  }
}
