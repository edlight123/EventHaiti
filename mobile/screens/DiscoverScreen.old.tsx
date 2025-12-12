import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  TextInput,
  Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar, MapPin, Search, X, SlidersHorizontal } from 'lucide-react-native';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { COLORS } from '../config/brand';
import { format } from 'date-fns';
import FeaturedCarousel from '../components/FeaturedCarousel';
import EventFiltersSheet from '../components/EventFiltersSheet';
import EventStatusBadge, { EventStatusBadgeProps } from '../components/EventStatusBadge';
import { useFilters } from '../contexts/FiltersContext';
import { applyFilters } from '../utils/filterUtils';
import { DEFAULT_FILTERS } from '../types/filters';

const { width } = Dimensions.get('window');

// Filter constants moved to mobile/types/filters.ts

export default function DiscoverScreen({ navigation, route }: any) {
  const { appliedFilters, openFiltersModal, hasActiveFilters, countActiveFilters, setDraftFilters, applyFilters: applyContextFilters, applyFiltersDirectly } = useFilters();
  
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [featuredEvents, setFeaturedEvents] = useState<any[]>([]);
  const [happeningSoonEvents, setHappeningSoonEvents] = useState<any[]>([]);
  const [budgetEvents, setBudgetEvents] = useState<any[]>([]);
  const [onlineEvents, setOnlineEvents] = useState<any[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const activeFiltersCount = countActiveFilters();

  useEffect(() => {
    fetchEvents();
  }, []);

  // Handle category navigation from HomeScreen
  useEffect(() => {
    const category = route?.params?.category;
    
    if (category) {
      console.log('[DiscoverScreen] Applying category filter:', category);
      // Create the filter object with the category
      const categoryFilter: typeof DEFAULT_FILTERS = {
        ...DEFAULT_FILTERS,
        categories: [category]
      };
      // Use applyFiltersDirectly to bypass draft state timing issues
      applyFiltersDirectly(categoryFilter);
    }
  }, [route?.params?.category, route?.params?.timestamp]);

  useEffect(() => {
    organizeEvents();
  }, [allEvents, appliedFilters, searchQuery]);

  const fetchEvents = async () => {
    try {
      // Get all published events ordered by start_datetime
      const q = query(
        collection(db, 'events'),
        where('is_published', '==', true),
        orderBy('start_datetime', 'asc')
      );
      
      const snapshot = await getDocs(q);
      console.log('[DiscoverScreen] Fetched', snapshot.docs.length, 'published events');
      
      const eventsData = snapshot.docs.map(doc => {
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
        
        let endDate = null;
        if (data.end_datetime) {
          if (typeof data.end_datetime.toDate === 'function') {
            endDate = data.end_datetime.toDate();
          } else if (data.end_datetime.seconds) {
            endDate = new Date(data.end_datetime.seconds * 1000);
          } else {
            endDate = new Date(data.end_datetime);
          }
        }
        
        return {
          id: doc.id,
          ...data,
          start_datetime: startDate,
          end_datetime: endDate
        };
      });
      
      // Filter for future events
      const now = new Date();
      const futureEvents = eventsData.filter(event => {
        if (!event.start_datetime) return false;
        return event.start_datetime >= now;
      });
      
      console.log('[DiscoverScreen] Future events:', futureEvents.length, 'out of', eventsData.length, 'total');
      console.log('[DiscoverScreen] Setting allEvents:', futureEvents.length);
      setAllEvents(futureEvents);
    } catch (error) {
      console.error('[DiscoverScreen] Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterBySearch = (events: any[]) => {
    if (!searchQuery.trim()) return events;
    const query = searchQuery.toLowerCase();
    return events.filter(event => 
      event.title?.toLowerCase().includes(query) ||
      event.description?.toLowerCase().includes(query) ||
      event.venue_name?.toLowerCase().includes(query) ||
      event.city?.toLowerCase().includes(query) ||
      event.category?.toLowerCase().includes(query)
    );
  };

  const organizeEvents = () => {
    let events = [...allEvents];
    console.log('[DiscoverScreen] Organizing', events.length, 'events');
    console.log('[DiscoverScreen] Applied filters:', JSON.stringify(appliedFilters));

    // Apply main filters from context
    events = applyFilters(events, appliedFilters);
    console.log('[DiscoverScreen] After filtering:', events.length, 'events');
    
    // Apply search filter separately (not in appliedFilters)
    events = filterBySearch(events);

    const hasAnyFilters = hasActiveFilters() || searchQuery.trim() !== '';

    if (hasAnyFilters) {
      // Show filtered results
      console.log('[DiscoverScreen] Showing filtered results:', events.length);
      setFilteredEvents(events);
      setFeaturedEvents([]);
      setHappeningSoonEvents([]);
      setBudgetEvents([]);
      setOnlineEvents([]);
    } else {
      // Clear filtered results
      setFilteredEvents([]);
      
      // Organize into sections
      const featured = [...events]
        .sort((a, b) => (b.tickets_sold || 0) - (a.tickets_sold || 0))
        .slice(0, 6);
      setFeaturedEvents(featured);
      console.log('[DiscoverScreen] Featured:', featured.length);

      const happeningSoon = events
        .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())
        .slice(0, 8);
      setHappeningSoonEvents(happeningSoon);
      console.log('[DiscoverScreen] Happening Soon:', happeningSoon.length);

      const budget = events.filter(e => !e.ticket_price || e.ticket_price === 0 || e.ticket_price <= 500).slice(0, 8);
      setBudgetEvents(budget);
      console.log('[DiscoverScreen] Budget:', budget.length);

      const online = events.filter(e => e.event_type === 'online' || e.venue_name?.toLowerCase().includes('online')).slice(0, 6);
      setOnlineEvents(online);
      console.log('[DiscoverScreen] Online:', online.length);
    }
  };

  // Old filter functions removed - now using applyFilters from filterUtils

  // Enhanced event card with premium badges and micro-interactions
  const AnimatedEventCard = ({ event, index }: { event: any; index: number }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    // Premium badge logic (matching PWA)
    const remainingTickets = (event.total_tickets || 0) - (event.tickets_sold || 0);
    const isSoldOut = remainingTickets <= 0 && (event.total_tickets || 0) > 0;
    const isVIP = (event.ticket_price || 0) > 100;
    const isTrending = (event.tickets_sold || 0) > 10;
    const isFree = !event.ticket_price || event.ticket_price === 0;
    const isNew = new Date(event.start_datetime).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000;

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }).start();
    };

    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          key={`${event.id}-${index}`}
          style={[
            styles.eventCard,
            (isVIP || isTrending) && styles.eventCardPremium,
          ]}
          onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        >
          {event.banner_image_url && (
            <Image 
              source={{ uri: event.banner_image_url }} 
              style={styles.eventImage}
              resizeMode="cover"
            />
          )}
          
          {/* Premium Status Badges - Top Left */}
          <View style={styles.badgesTopLeft}>
            {event.category && (
              <View style={styles.categoryBadgeOverlay}>
                <Text style={styles.categoryBadgeText}>{event.category}</Text>
              </View>
            )}
            {isVIP && <EventStatusBadge status="VIP" size="small" />}
            {isTrending && <EventStatusBadge status="Trending" size="small" />}
            {isNew && <EventStatusBadge status="New" size="small" />}
          </View>

          {/* Status Badges - Top Right */}
          {isSoldOut && (
            <View style={styles.badgesTopRight}>
              <EventStatusBadge status="Sold Out" size="small" />
            </View>
          )}

          <View style={styles.eventCardContent}>
            <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
            
            <View style={styles.eventDetails}>
              <View style={styles.eventDetailRow}>
                <Calendar size={14} color={COLORS.textSecondary} />
                <Text style={styles.eventDetailText}>
                  {event.start_datetime && format(event.start_datetime, 'MMM dd, yyyy')}
                </Text>
              </View>
              <View style={styles.eventDetailRow}>
                <MapPin size={14} color={COLORS.textSecondary} />
                <Text style={styles.eventDetailText} numberOfLines={1}>
                  {event.venue_name}
                </Text>
              </View>
            </View>
            
            <View style={styles.eventFooter}>
              {!isFree && event.ticket_price > 0 ? (
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
      </Animated.View>
    );
  };

  const renderEventCard = (event: any, index: number) => (
    <AnimatedEventCard event={event} index={index} key={`${event.id}-${index}`} />
  );

  const renderSection = (title: string, subtitle: string, emoji: string, events: any[]) => {
    if (events.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{emoji} {title}</Text>
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContent}
        >
          {events.slice(0, 8).map((event, index) => renderEventCardHorizontal(event, index))}
        </ScrollView>
      </View>
    );
  };

  const renderEventCardHorizontal = (event: any, index: number) => (
    <TouchableOpacity
      key={`${event.id}-${index}`}
      style={styles.carouselCard}
      onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
      activeOpacity={0.9}
    >
      {event.banner_image_url && (
        <Image 
          source={{ uri: event.banner_image_url }} 
          style={styles.carouselImage}
          resizeMode="cover"
        />
      )}
      
      {event.category && (
        <View style={styles.carouselCategoryBadge}>
          <Text style={styles.categoryBadgeText}>{event.category}</Text>
        </View>
      )}

      <View style={styles.carouselCardContent}>
        <Text style={styles.carouselTitle} numberOfLines={2}>{event.title}</Text>
        
        <View style={styles.carouselDetails}>
          <View style={styles.carouselDetailRow}>
            <Calendar size={12} color={COLORS.textSecondary} />
            <Text style={styles.carouselDetailText}>
              {event.start_datetime && format(event.start_datetime, 'MMM dd')}
            </Text>
          </View>
          <View style={styles.carouselDetailRow}>
            <MapPin size={12} color={COLORS.textSecondary} />
            <Text style={styles.carouselDetailText} numberOfLines={1}>
              {event.city}
            </Text>
          </View>
        </View>
        
        <View style={styles.carouselFooter}>
          {event.ticket_price > 0 ? (
            <Text style={styles.carouselPrice}>
              {event.currency || 'HTG'} {event.ticket_price.toLocaleString()}
            </Text>
          ) : (
            <View style={styles.carouselFreeBadge}>
              <Text style={styles.carouselFreeBadgeText}>FREE</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  // Old filter constants removed - now in mobile/types/filters.ts

  // Old renderFiltersModal removed - now using EventFiltersSheet component

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover Events</Text>
        <Text style={styles.headerSubtitle}>Find your next experience</Text>
      </View>

      {/* Search Bar and Filter Button */}
      <View style={styles.searchSection}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events, venues, categories..."
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={openFiltersModal}
        >
          <SlidersHorizontal size={20} color={COLORS.text} />
          {hasActiveFilters() && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>
                {countActiveFilters()}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Active Filters Indicator */}
      {(hasActiveFilters() || searchQuery.trim() !== '') && (
        <View style={styles.activeFiltersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {searchQuery.trim() !== '' && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>Search: {searchQuery}</Text>
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={14} color={COLORS.text} />
                </TouchableOpacity>
              </View>
            )}
            {hasActiveFilters() && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>
                  {countActiveFilters()} {countActiveFilters() === 1 ? 'filter' : 'filters'} applied
                </Text>
                <TouchableOpacity onPress={openFiltersModal}>
                  <SlidersHorizontal size={14} color={COLORS.text} />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      <ScrollView style={styles.content}>
        {/* Featured Carousel (only when no filters) */}
        {!hasActiveFilters() && featuredEvents.length > 0 && (
          <View style={styles.featuredSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>⭐ Featured This Weekend</Text>
              <Text style={styles.sectionSubtitle}>The most popular events</Text>
            </View>
            <FeaturedCarousel 
              events={featuredEvents} 
              onEventPress={(eventId) => navigation.navigate('EventDetail', { eventId })} 
            />
          </View>
        )}

        {/* Content Sections */}
        {hasActiveFilters() || searchQuery.trim() !== '' ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Filtered Results</Text>
              <Text style={styles.sectionSubtitle}>
                {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} found
              </Text>
            </View>
            {filteredEvents.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyTitle}>No events found</Text>
                <Text style={styles.emptyText}>
                  Try adjusting your filters to see more events
                </Text>
              </View>
            ) : (
              filteredEvents.map((event, index) => renderEventCard(event, index))
            )}
          </View>
        ) : (
          <>
            {renderSection('Happening Soon', 'Don\'t miss these upcoming events', '🔥', happeningSoonEvents)}
            {renderSection('Free & Budget Friendly', 'Free events and under 500 HTG', '💰', budgetEvents)}
            {renderSection('Online Events', 'Join from anywhere', '💻', onlineEvents)}
            
            {/* All Events Fallback */}
            {happeningSoonEvents.length === 0 && budgetEvents.length === 0 && onlineEvents.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📅</Text>
                <Text style={styles.emptyTitle}>No events available</Text>
                <Text style={styles.emptyText}>
                  Check back later for upcoming events
                </Text>
              </View>
            )}
          </>
)}
      </ScrollView>

      {/* Filters Modal */}
      <EventFiltersSheet />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.surface,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  
  // Search Section
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    padding: 0,
  },
  filterButton: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  
  // Active Filters
  activeFiltersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 16,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  activeFilterText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  clearAllButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginLeft: 8,
  },
  clearAllText: {
    fontSize: 13,
    color: COLORS.error,
    fontWeight: '600',
  },
  
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: COLORS.background,
  },
  
  // Filter Section
  filterSection: {
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: COLORS.surface,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  
  // Date Chips
  dateChipsContainer: {
    paddingHorizontal: 12,
  },
  dateChipsContent: {
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  dateChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dateChipText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  dateChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  
  // Category Chips
  categoryChipsContainer: {
    paddingHorizontal: 12,
  },
  categoryChipsContent: {
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  
  // Featured Section
  featuredSection: {
    paddingTop: 8,
    backgroundColor: COLORS.background,
  },
  
  // Section
  section: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  
  // Event Card
  eventCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventCardPremium: {
    borderColor: COLORS.primaryLight,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  eventImage: {
    width: '100%',
    height: 180,
    backgroundColor: COLORS.border,
  },
  badgesTopLeft: {
    position: 'absolute',
    top: 12,
    left: 12,
    gap: 6,
    zIndex: 10,
  },
  badgesTopRight: {
    position: 'absolute',
    top: 12,
    right: 12,
    gap: 6,
    alignItems: 'flex-end',
    zIndex: 10,
  },
  categoryBadgeOverlay: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  eventCardContent: {
    padding: 16,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
    lineHeight: 24,
  },
  eventDetails: {
    marginBottom: 12,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  eventDetailText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  eventPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  freeBadge: {
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  freeBadgeText: {
    color: COLORS.success,
    fontSize: 14,
    fontWeight: '700',
  },
  
  // Carousel Cards
  carouselContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  carouselCard: {
    width: 280,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginRight: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  carouselImage: {
    width: '100%',
    height: 160,
    backgroundColor: COLORS.border,
  },
  carouselCategoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  carouselCardContent: {
    padding: 12,
  },
  carouselTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    lineHeight: 20,
  },
  carouselDetails: {
    marginBottom: 8,
  },
  carouselDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  carouselDetailText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 6,
    flex: 1,
  },
  carouselFooter: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  carouselPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  carouselFreeBadge: {
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  carouselFreeBadgeText: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: '700',
  },
  
  // Filters Modal
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  filterGroup: {
    marginBottom: 24,
  },
  filterGroupTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: 12,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  filterOptionText: {
    fontSize: 15,
    color: COLORS.text,
    marginLeft: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: COLORS.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  modalSecondaryButton: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalSecondaryButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  modalPrimaryButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
