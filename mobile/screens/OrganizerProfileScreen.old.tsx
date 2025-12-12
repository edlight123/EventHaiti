import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Dimensions,
  RefreshControl
} from 'react-native';
import { Shield, Calendar, Users, Star, ChevronLeft } from 'lucide-react-native';
import { doc, getDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../config/brand';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');

export default function OrganizerProfileScreen({ route, navigation }: any) {
  const { organizerId } = route.params;
  const { user } = useAuth();
  const [organizer, setOrganizer] = useState<any>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [pastEvents, setPastEvents] = useState<any[]>([]);
  const [stats, setStats] = useState({
    followerCount: 0,
    totalEvents: 0,
    totalTicketsSold: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchOrganizerProfile();
  }, [organizerId]);

  const fetchOrganizerProfile = async () => {
    try {
      // Fetch organizer data
      const organizerDoc = await getDoc(doc(db, 'users', organizerId));
      if (!organizerDoc.exists()) {
        navigation.goBack();
        return;
      }

      const organizerData = {
        id: organizerDoc.id,
        ...organizerDoc.data()
      };
      setOrganizer(organizerData);

      // Fetch events by this organizer
      const eventsQuery = query(
        collection(db, 'events'),
        where('organizer_id', '==', organizerId),
        where('is_published', '==', true)
      );
      const eventsSnapshot = await getDocs(eventsQuery);
      
      const now = new Date();
      const upcoming: any[] = [];
      const past: any[] = [];
      let totalSold = 0;

      eventsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const eventData = {
          id: doc.id,
          ...data,
          start_datetime: data.start_datetime?.toDate ? data.start_datetime.toDate() : new Date(data.start_datetime)
        };

        totalSold += data.tickets_sold || 0;

        if (eventData.start_datetime >= now) {
          upcoming.push(eventData);
        } else {
          past.push(eventData);
        }
      });

      // Sort upcoming by date (earliest first), past by date (most recent first)
      upcoming.sort((a, b) => a.start_datetime.getTime() - b.start_datetime.getTime());
      past.sort((a, b) => b.start_datetime.getTime() - a.start_datetime.getTime());

      setUpcomingEvents(upcoming);
      setPastEvents(past);

      // Fetch follower count
      const followersQuery = query(
        collection(db, 'organizer_followers'),
        where('organizer_id', '==', organizerId)
      );
      const followersSnapshot = await getDocs(followersQuery);

      setStats({
        followerCount: followersSnapshot.size,
        totalEvents: eventsSnapshot.size,
        totalTicketsSold: totalSold
      });

    } catch (error) {
      console.error('Error fetching organizer profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrganizerProfile();
  };

  const renderEventCard = (event: any) => (
    <TouchableOpacity
      key={event.id}
      style={styles.eventCard}
      onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
      activeOpacity={0.9}
    >
      {event.banner_image_url ? (
        <Image
          source={{ uri: event.banner_image_url }}
          style={styles.eventImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.eventImage, styles.eventImagePlaceholder]}>
          <Calendar size={32} color={COLORS.primary + '40'} />
        </View>
      )}

      {event.category && (
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{event.category}</Text>
        </View>
      )}

      <View style={styles.eventCardContent}>
        <Text style={styles.eventTitle} numberOfLines={2}>
          {event.title}
        </Text>

        <View style={styles.eventMeta}>
          <Text style={styles.eventDate}>
            {format(event.start_datetime, 'MMM d, yyyy')}
          </Text>
          <Text style={styles.eventLocation} numberOfLines={1}>
            {event.city}
          </Text>
        </View>

        <View style={styles.eventFooter}>
          {event.ticket_price > 0 ? (
            <Text style={styles.eventPrice}>
              {event.currency || 'HTG'} {event.ticket_price.toLocaleString()}
            </Text>
          ) : (
            <View style={styles.freeBadge}>
              <Text style={styles.freeBadgeText}>FREE</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading organizer profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!organizer) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Organizer not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Hero Section */}
        <View style={styles.hero}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ChevronLeft size={24} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.heroContent}>
            {/* Avatar */}
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {organizer.full_name[0].toUpperCase()}
              </Text>
            </View>

            {/* Info */}
            <View style={styles.organizerInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.organizerName} numberOfLines={2}>
                  {organizer.full_name}
                </Text>
                {organizer.is_verified && (
                  <View style={styles.verifiedBadge}>
                    <Shield size={14} color="#FFF" fill="#FFF" />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                )}
              </View>

              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Calendar size={18} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.statNumber}>{stats.totalEvents || 0}</Text>
                  <Text style={styles.statLabel}>Events</Text>
                </View>
                <View style={styles.stat}>
                  <Users size={18} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.statNumber}>{stats.followerCount || 0}</Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </View>
                <View style={styles.stat}>
                  <Star size={18} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.statNumber}>{stats.totalTicketsSold ? stats.totalTicketsSold.toLocaleString() : 0}</Text>
                  <Text style={styles.statLabel}>Tickets Sold</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Upcoming Events */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Upcoming Events</Text>
                <Text style={styles.sectionSubtitle}>
                  {upcomingEvents.length} event{upcomingEvents.length !== 1 ? 's' : ''} coming soon
                </Text>
              </View>
            </View>

            {upcomingEvents.length > 0 ? (
              <View style={styles.eventsGrid}>
                {upcomingEvents.map(renderEventCard)}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Calendar size={48} color={COLORS.textSecondary} />
                <Text style={styles.emptyStateTitle}>No Upcoming Events</Text>
                <Text style={styles.emptyStateText}>
                  This organizer doesn't have any upcoming events at the moment.
                </Text>
              </View>
            )}
          </View>

          {/* Past Events */}
          {pastEvents.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Past Events</Text>
                  <Text style={styles.sectionSubtitle}>
                    Previous events organized by {organizer.full_name}
                  </Text>
                </View>
              </View>

              <View style={styles.eventsGrid}>
                {pastEvents.slice(0, 6).map(renderEventCard)}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  hero: {
    backgroundColor: COLORS.primary,
    paddingTop: 20,
    paddingBottom: 32,
    paddingHorizontal: 16,
    position: 'relative',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.primary,
  },
  organizerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  organizerName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    flex: 1,
    lineHeight: 30,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 20,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statNumber: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  eventsGrid: {
    gap: 16,
  },
  eventCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  eventImage: {
    width: '100%',
    height: 180,
    backgroundColor: COLORS.borderLight,
  },
  eventImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
  },
  eventCardContent: {
    padding: 14,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    lineHeight: 22,
  },
  eventMeta: {
    gap: 4,
    marginBottom: 12,
  },
  eventDate: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  eventLocation: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  eventFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  freeBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  freeBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
