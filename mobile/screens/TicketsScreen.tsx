import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator 
} from 'react-native';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../config/brand';
import { format } from 'date-fns';

export default function TicketsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [upcomingTickets, setUpcomingTickets] = useState<any[]>([]);
  const [pastTickets, setPastTickets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTickets = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch tickets
      const q = query(
        collection(db, 'tickets'),
        where('user_id', '==', user.uid)
      );
      
      const snapshot = await getDocs(q);
      const ticketsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          event_id: data.event_id,
          ...data,
          event_date: data.event_date?.toDate ? data.event_date.toDate() : data.event_date ? new Date(data.event_date) : null,
          purchase_date: data.purchase_date?.toDate ? data.purchase_date.toDate() : data.purchase_date ? new Date(data.purchase_date) : null
        } as any;
      });
      
      // Group tickets by event
      const ticketsByEvent = new Map();
      ticketsData.forEach(ticket => {
        if (!ticketsByEvent.has(ticket.event_id)) {
          ticketsByEvent.set(ticket.event_id, []);
        }
        ticketsByEvent.get(ticket.event_id).push(ticket);
      });
      
      // Fetch event details for each event with tickets
      const eventIds = Array.from(ticketsByEvent.keys());
      const eventsData = [];
      
      for (const eventId of eventIds) {
        const eventQuery = query(
          collection(db, 'events'),
          where('__name__', '==', eventId)
        );
        const eventSnapshot = await getDocs(eventQuery);
        
        if (!eventSnapshot.empty) {
          const eventDoc = eventSnapshot.docs[0];
          const eventData = eventDoc.data();
          eventsData.push({
            id: eventDoc.id,
            ...eventData,
            start_datetime: eventData.start_datetime?.toDate ? eventData.start_datetime.toDate() : eventData.start_datetime ? new Date(eventData.start_datetime) : null,
            ticketCount: ticketsByEvent.get(eventId).length
          });
        }
      }
      
      // Separate upcoming and past events
      const now = new Date();
      const upcoming = eventsData.filter(e => 
        e.start_datetime && new Date(e.start_datetime) >= now
      ).sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());
      
      const past = eventsData.filter(e => 
        e.start_datetime && new Date(e.start_datetime) < now
      ).sort((a, b) => new Date(b.start_datetime).getTime() - new Date(a.start_datetime).getTime());
      
      setUpcomingTickets(upcoming);
      setPastTickets(past);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTickets();
  };

  if (!user) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Login Required</Text>
        <Text style={styles.emptyText}>Please login to view your tickets</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const displayedTickets = activeTab === 'upcoming' ? upcomingTickets : pastTickets;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Tickets</Text>
        <Text style={styles.headerSubtitle}>
          {upcomingTickets.length} upcoming • {pastTickets.length} past
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
            Upcoming ({upcomingTickets.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.tabActive]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}>
            Past ({pastTickets.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {displayedTickets.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎫</Text>
            <Text style={styles.emptyTitle}>
              {activeTab === 'upcoming' ? 'No Upcoming Tickets' : 'No Past Tickets'}
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === 'upcoming' 
                ? 'Purchase tickets to events and they\'ll appear here' 
                : 'Your attended events will show up here'}
            </Text>
          </View>
        ) : (
          displayedTickets.map(event => (
            <TouchableOpacity
              key={event.id}
              style={styles.ticketCard}
              onPress={() => navigation.navigate('EventTickets', { eventId: event.id })}
              activeOpacity={0.9}
            >
              <View style={styles.ticketHeader}>
                <View style={styles.ticketTitleContainer}>
                  <Text style={styles.ticketTitle} numberOfLines={2}>{event.title}</Text>
                  <View style={styles.ticketCountBadge}>
                    <Text style={styles.ticketCountText}>
                      {event.ticketCount} {event.ticketCount === 1 ? 'Ticket' : 'Tickets'}
                    </Text>
                  </View>
                </View>
              </View>
              
              <Text style={styles.ticketDate}>
                📅 {event.start_datetime && format(event.start_datetime, 'EEE, MMM d, yyyy • h:mm a')}
              </Text>
              
              <Text style={styles.ticketVenue}>
                📍 {event.venue_name}, {event.city}
              </Text>
              
              <View style={styles.ticketFooter}>
                <Text style={styles.viewTicketsText}>View Tickets →</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: COLORS.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.surface,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 15,
    color: COLORS.surface,
    opacity: 0.95,
    fontWeight: '500',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  ticketCard: {
    backgroundColor: COLORS.surface,
    margin: 16,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  ticketHeader: {
    marginBottom: 14,
  },
  ticketTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  ticketTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 24,
  },
  ticketCountBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ticketCountText: {
    color: '#7C3AED',
    fontSize: 11,
    fontWeight: '600',
  },
  ticketDate: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 6,
  },
  ticketVenue: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  ticketFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  viewTicketsText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
