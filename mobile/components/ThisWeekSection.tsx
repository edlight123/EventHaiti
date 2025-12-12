import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { Calendar, MapPin } from 'lucide-react-native';
import { COLORS } from '../config/brand';
import { format } from 'date-fns';
import EventStatusBadge from './EventStatusBadge';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.7;
const CARD_SPACING = 16;

interface ThisWeekSectionProps {
  events: any[];
  onEventPress: (eventId: string) => void;
  onViewAll: () => void;
}

const ThisWeekEventCard = ({ event, onPress }: { event: any; onPress: () => void }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

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

  const isFree = !event.ticket_price || event.ticket_price === 0;
  const isNew = event.start_datetime && 
    new Date(event.start_datetime).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000;
  
  const remainingTickets = (event.total_tickets || 0) - (event.tickets_sold || 0);
  const isSoldOut = remainingTickets <= 0 && (event.total_tickets || 0) > 0;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {event.banner_image_url && (
          <Image
            source={{ uri: event.banner_image_url }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        )}
        
        <View style={styles.badgesContainer}>
          {isNew && <EventStatusBadge status="New" size="small" />}
          {isSoldOut && <EventStatusBadge status="Sold Out" size="small" />}
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardCategory}>{event.category}</Text>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {event.title}
          </Text>

          <View style={styles.cardDetails}>
            <View style={styles.cardDetailRow}>
              <Calendar size={14} color={COLORS.textSecondary} />
              <Text style={styles.cardDetailText}>
                {event.start_datetime && format(new Date(event.start_datetime), 'EEE, MMM dd • h:mm a')}
              </Text>
            </View>
            <View style={styles.cardDetailRow}>
              <MapPin size={14} color={COLORS.textSecondary} />
              <Text style={styles.cardDetailText} numberOfLines={1}>
                {event.venue_name}
              </Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            {!isFree && event.ticket_price > 0 ? (
              <Text style={styles.cardPrice}>
                {event.currency || 'HTG'} {event.ticket_price.toLocaleString()}
              </Text>
            ) : (
              <Text style={styles.cardFree}>FREE</Text>
            )}
            {event.tickets_sold !== undefined && (
              <Text style={styles.ticketsSold}>
                {event.tickets_sold || 0} sold
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function ThisWeekSection({
  events,
  onEventPress,
  onViewAll,
}: ThisWeekSectionProps) {
  if (events.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>📅 This Week</Text>
          <Text style={styles.subtitle}>Don't miss these upcoming events</Text>
        </View>
        <TouchableOpacity onPress={onViewAll}>
          <Text style={styles.viewAll}>View All →</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        decelerationRate="fast"
      >
        {events.map((event) => (
          <ThisWeekEventCard
            key={event.id}
            event={event}
            onPress={() => onEventPress(event.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  scrollView: {
    marginHorizontal: -16,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: CARD_SPACING,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardImage: {
    width: '100%',
    height: 140,
    backgroundColor: COLORS.borderLight,
  },
  badgesContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    gap: 6,
    zIndex: 10,
  },
  cardContent: {
    padding: 14,
  },
  cardCategory: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
    lineHeight: 22,
  },
  cardDetails: {
    marginBottom: 10,
  },
  cardDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardDetailText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 6,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  cardPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  cardFree: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.success,
  },
  ticketsSold: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
});
