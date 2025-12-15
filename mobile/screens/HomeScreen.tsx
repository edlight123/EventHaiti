import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Share,
  Image,
} from 'react-native';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, BRAND } from '../config/brand';
import { Bell } from 'lucide-react-native';
import FeaturedCarousel from '../components/FeaturedCarousel';

import CategoryGrid from '../components/CategoryGrid';
import TrendingSection from '../components/TrendingSection';
import ThisWeekSection from '../components/ThisWeekSection';
import AllEventsPreview from '../components/AllEventsPreview';

export default function HomeScreen({ navigation }: any) {
  const { user, userProfile } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [featuredEvents, setFeaturedEvents] = useState<any[]>([]);
  const [trendingEvents, setTrendingEvents] = useState<any[]>([]);
  const [thisWeekEvents, setThisWeekEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const scrollViewRef = React.useRef<ScrollView>(null);

  const fetchEvents = async () => {
    try {
      // Get all published events
      const q = query(
        collection(db, 'events'),
        where('is_published', '==', true),
        orderBy('start_datetime', 'asc'),
        limit(50)
      );

      const snapshot = await getDocs(q);

      const eventsData = snapshot.docs.map((doc) => {
        const data = doc.data();

        // Convert Firestore Timestamp to Date
        let startDate = null;
        if (data.start_datetime) {
          if (typeof data.start_datetime.toDate === 'function') {
            startDate = data.start_datetime.toDate();
          } else if (data.start_datetime.seconds) {
            startDate = new Date(data.start_datetime.seconds * 1000);
          } else {
            startDate = new Date(data.start_datetime);
          }
        }

        return {
          id: doc.id,
          ...data,
          start_datetime: startDate,
        };
      });

      // Filter out past events
      const now = new Date();
      const futureEvents = eventsData.filter((e) => e.start_datetime >= now);

      setEvents(futureEvents);

      // Featured events (top 5 by tickets sold)
      const featured = [...futureEvents]
        .sort((a: any, b: any) => (b.tickets_sold || 0) - (a.tickets_sold || 0))
        .slice(0, 5);
      setFeaturedEvents(featured);

      // Trending events (tickets_sold > 10)
      const trending = futureEvents
        .filter((e) => (e.tickets_sold || 0) > 10)
        .slice(0, 6);
      setTrendingEvents(trending);

      // This week events
      const oneWeekFromNow = new Date(now);
      oneWeekFromNow.setDate(now.getDate() + 7);
      const thisWeek = futureEvents
        .filter((e) => e.start_datetime <= oneWeekFromNow)
        .slice(0, 6);
      setThisWeekEvents(thisWeek);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleShare = async (event: any) => {
    try {
      await Share.share({
        message: `Check out ${event.title}! ${event.description || ''}`,
        title: event.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Listen for tab press to scroll to top
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', (e: any) => {
      // Check if we're already on this screen
      const state = navigation.getState();
      const currentRoute = state.routes[state.index];
      if (currentRoute.name === 'Home') {
        // Scroll to top
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }
    });

    return unsubscribe;
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  const handleCategoryPress = (category: string) => {
    console.log('[HomeScreen] Category pressed:', category);
    navigation.navigate('Discover', { category, timestamp: Date.now() });
  };

  const handleViewAllTrending = () => {
    navigation.navigate('Discover', { trending: true, timestamp: Date.now() });
  };

  const handleViewAllThisWeek = () => {
    navigation.navigate('Discover', { thisWeek: true, timestamp: Date.now() });
  };

  const handleViewAllEvents = () => {
    navigation.navigate('Discover');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Compact Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require('../assets/event_haiti_logo_white.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.logoText}>EventHaiti</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => navigation.navigate('Notifications', { userId: user?.uid || '' })}
            activeOpacity={0.7}
          >
            <Bell size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading amazing events...</Text>
          </View>
        ) : (
          <>
            {/* Featured Carousel */}
            {featuredEvents.length > 0 && (
              <View style={styles.firstSection}>
                <FeaturedCarousel
                  events={featuredEvents}
                  onEventPress={(eventId) => navigation.navigate('EventDetail', { eventId })}
                />
              </View>
            )}

            {/* Browse by Category */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>
                    <Text style={styles.sectionTitleBase}>Browse by Ca</Text>
                    <Text style={styles.sectionTitleGradient1}>t</Text>
                    <Text style={styles.sectionTitleGradient2}>e</Text>
                    <Text style={styles.sectionTitleGradient3}>g</Text>
                    <Text style={styles.sectionTitleGradient4}>o</Text>
                    <Text style={styles.sectionTitleGradient5}>r</Text>
                    <Text style={styles.sectionTitleGradient6}>y</Text>
                  </Text>
                </View>
                <Text style={styles.sectionSubtitle}>Find events that interest you</Text>
              </View>
              <View style={styles.categoryContainer}>
                <CategoryGrid onCategoryPress={handleCategoryPress} />
              </View>
            </View>

            {/* Trending Now */}
            {trendingEvents.length > 0 && (
              <View style={styles.section}>
                <TrendingSection
                  events={trendingEvents}
                  onEventPress={(eventId) => navigation.navigate('EventDetail', { eventId })}
                  onViewAll={handleViewAllTrending}
                />
              </View>
            )}

            {/* This Week */}
            {thisWeekEvents.length > 0 && (
              <View style={styles.section}>
                <ThisWeekSection
                  events={thisWeekEvents}
                  onEventPress={(eventId) => navigation.navigate('EventDetail', { eventId })}
                  onViewAll={handleViewAllThisWeek}
                />
              </View>
            )}

            {/* All Events Preview */}
            {events.length > 0 && (
              <View style={styles.section}>
                <AllEventsPreview
                  events={events}
                  onEventPress={(eventId) => navigation.navigate('EventDetail', { eventId })}
                  onViewAll={handleViewAllEvents}
                />
              </View>
            )}

            {events.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>📭</Text>
                <Text style={styles.emptyTitle}>No Events Available</Text>
                <Text style={styles.emptySubtitle}>Check back soon for exciting events!</Text>
              </View>
            )}

            {/* Bottom Spacing */}
            <View style={{ height: 32 }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 60,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 8 : 8,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 32,
    height: 32,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '800',
    color: 'white',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  greeting: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  firstSection: {
    marginTop: 16,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  sectionTitleBase: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  sectionTitleGradient1: {
    fontSize: 22,
    fontWeight: '700',
    color: '#3a3a3a',
    letterSpacing: 0.3,
  },
  sectionTitleGradient2: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2d5f5d',
    letterSpacing: 0.3,
  },
  sectionTitleGradient3: {
    fontSize: 22,
    fontWeight: '700',
    color: '#20847e',
    letterSpacing: 0.3,
  },
  sectionTitleGradient4: {
    fontSize: 22,
    fontWeight: '700',
    color: '#14a89e',
    letterSpacing: 0.3,
  },
  sectionTitleGradient5: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0d9488',
    letterSpacing: 0.3,
  },
  sectionTitleGradient6: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f766e',
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  categoryContainer: {
  },
  eventCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: 180,
    backgroundColor: COLORS.borderLight,
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    zIndex: 1,
  },
  categoryText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventCardContent: {
    padding: 16,
  },
  eventCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  eventTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 24,
    marginRight: 8,
  },
  shareButton: {
    padding: 4,
  },
  eventDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 6,
    fontWeight: '500',
  },
  eventLocation: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  eventPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  eventFree: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.success,
  },
  ticketsSold: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
