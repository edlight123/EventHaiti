import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../config/brand';
import {
  getEventById,
  getEventTicketBreakdown,
  OrganizerEvent,
} from '../../lib/api/organizer';
import {
  toggleEventPublication,
  cancelEvent,
} from '../../lib/api/events';

type RouteParams = {
  OrganizerEventManagement: {
    eventId: string;
  };
};

export default function OrganizerEventManagementScreen() {
  const route = useRoute<RouteProp<RouteParams, 'OrganizerEventManagement'>>();
  const navigation = useNavigation<any>();
  const { eventId } = route.params;

  const [event, setEvent] = useState<OrganizerEvent | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [ticketData, setTicketData] = useState<{
    ticketsSold: number;
    ticketsCheckedIn: number;
    capacity: number;
    ticketTypes: Array<{ name: string; sold: number; capacity: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEventData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadEventData();
  }, [eventId]);

  // Reload event data when screen comes into focus (e.g., after editing)
  useFocusEffect(
    useCallback(() => {
      loadEventData();
    }, [eventId])
  );

  const loadEventData = async () => {
    try {
      const [eventData, breakdown] = await Promise.all([
        getEventById(eventId),
        getEventTicketBreakdown(eventId),
      ]);

      if (eventData) {
        setEvent(eventData);
        setTicketData(breakdown);
        setIsPaused(!eventData.is_published);
      }
    } catch (error) {
      console.error('Error loading event management data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScanTickets = () => {
    navigation.navigate('TicketScanner', { eventId });
  };

  const handleViewAttendees = () => {
    navigation.navigate('EventAttendees', { eventId });
  };

  const handleEditEvent = () => {
    navigation.navigate('EditEvent', { eventId });
  };

  const handleViewPublicPage = () => {
    navigation.navigate('EventDetail', { eventId });
  };

  const handleToggleSales = async () => {
    const action = isPaused ? 'resume' : 'pause';
    Alert.alert(
      `${action === 'pause' ? 'Pause' : 'Resume'} Ticket Sales`,
      `Are you sure you want to ${action} ticket sales for this event?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'pause' ? 'Pause' : 'Resume',
          style: action === 'pause' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              // isPaused is the inverse of is_published
              // If isPaused=true, we want to set is_published=true (resume)
              // If isPaused=false, we want to set is_published=false (pause)
              const newPublishedState = isPaused; // Resume if paused, pause if not paused
              await toggleEventPublication(eventId, newPublishedState);
              // Reload event data to get the updated status from database
              await loadEventData();
              Alert.alert(
                'Success',
                `Ticket sales ${action === 'pause' ? 'paused' : 'resumed'} successfully`
              );
            } catch (error: any) {
              Alert.alert('Error', error.message || `Failed to ${action} ticket sales`);
            }
          },
        },
      ]
    );
  };

  const handleSendUpdate = () => {
    navigation.navigate('SendEventUpdate', { eventId, eventTitle: event?.title });
  };

  const handleCancelEvent = async () => {
    Alert.alert(
      'Cancel Event',
      'Are you sure you want to cancel this event? This action cannot be undone. All ticket holders will be notified.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel Event',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelEvent(eventId);
              Alert.alert(
                'Event Cancelled',
                'The event has been cancelled successfully.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
              );
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to cancel event');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading event...</Text>
      </View>
    );
  }

  if (!event || !ticketData) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
        <Text style={styles.errorText}>Event not found</Text>
      </View>
    );
  }

  const eventDate = new Date(event.start_datetime);
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = eventDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.primary}
        />
      }
    >
      {/* Header with background image */}
      <View style={styles.header}>
        {event.cover_image_url && (
          <Image 
            source={{ uri: event.cover_image_url }} 
            style={styles.backgroundImage}
            resizeMode="cover"
          />
        )}
        <View style={styles.overlay} />
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{event.title}</Text>
          <View style={styles.headerInfo}>
            <Ionicons name="calendar-outline" size={16} color={COLORS.white} />
            <Text style={styles.headerInfoText}>
              {formattedDate} • {formattedTime}
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <Ionicons name="location-outline" size={16} color={COLORS.white} />
            <Text style={styles.headerInfoText}>{event.location}</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={handleScanTickets}>
            <Ionicons name="qr-code-outline" size={32} color={COLORS.primary} />
            <Text style={styles.actionText}>Scan Tickets</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={handleViewAttendees}>
            <Ionicons name="people-outline" size={32} color={COLORS.primary} />
            <Text style={styles.actionText}>View Attendees</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={handleEditEvent}>
            <Ionicons name="create-outline" size={32} color={COLORS.primary} />
            <Text style={styles.actionText}>Edit Event</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={handleViewPublicPage}>
            <Ionicons name="eye-outline" size={32} color={COLORS.primary} />
            <Text style={styles.actionText}>View Public Page</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Performance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance</Text>
        <View style={styles.performanceCard}>
          <View style={styles.performanceHeader}>
            <Text style={styles.performanceTitle}>Ticket Sales</Text>
            <Text style={styles.performanceValue}>
              {ticketData.ticketsSold} / {ticketData.capacity}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${
                    ticketData.capacity > 0
                      ? (ticketData.ticketsSold / ticketData.capacity) * 100
                      : 0
                  }%`,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {ticketData.capacity > 0
              ? ((ticketData.ticketsSold / ticketData.capacity) * 100).toFixed(1)
              : 0}
            % sold
          </Text>
        </View>

        {/* Ticket Type Breakdown */}
        {ticketData.ticketTypes.length > 0 && (
          <View style={styles.ticketBreakdown}>
            <Text style={styles.breakdownTitle}>By Ticket Type</Text>
            {ticketData.ticketTypes.map((ticketType, index) => (
              <View key={index} style={styles.ticketTypeRow}>
                <View style={styles.ticketTypeInfo}>
                  <Text style={styles.ticketTypeName}>{ticketType.name}</Text>
                  <Text style={styles.ticketTypeStats}>
                    {ticketType.sold} / {ticketType.capacity}
                  </Text>
                </View>
                <View style={styles.miniProgressBar}>
                  <View
                    style={[
                      styles.miniProgressFill,
                      {
                        width: `${
                          ticketType.capacity > 0
                            ? (ticketType.sold / ticketType.capacity) * 100
                            : 0
                        }%`,
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Event Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Event Controls</Text>
        <TouchableOpacity style={styles.controlButton} onPress={handleToggleSales}>
          <Ionicons 
            name={isPaused ? "play-circle-outline" : "pause-circle-outline"} 
            size={24} 
            color={isPaused ? COLORS.success : COLORS.warning} 
          />
          <Text style={styles.controlButtonText}>
            {isPaused ? 'Resume Ticket Sales' : 'Pause Ticket Sales'}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={handleSendUpdate}>
          <Ionicons name="notifications-outline" size={24} color={COLORS.primary} />
          <Text style={styles.controlButtonText}>Send Update to Attendees</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
        {event?.status !== 'cancelled' && (
          <TouchableOpacity style={[styles.controlButton, styles.dangerButton]} onPress={handleCancelEvent}>
            <Ionicons name="close-circle-outline" size={24} color={COLORS.error} />
            <Text style={[styles.controlButtonText, styles.dangerText]}>Cancel Event</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  errorText: {
    marginTop: 12,
    fontSize: 18,
    color: COLORS.error,
    fontWeight: '600',
  },
  header: {
    height: 224,
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  headerContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
    paddingTop: 60,
    position: 'relative',
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  headerInfoText: {
    fontSize: 14,
    color: COLORS.white,
    marginLeft: 6,
    opacity: 0.9,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  actionCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    margin: '1%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 8,
    textAlign: 'center',
  },
  performanceCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  performanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  performanceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  ticketBreakdown: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  ticketTypeRow: {
    marginBottom: 12,
  },
  ticketTypeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  ticketTypeName: {
    fontSize: 14,
    color: COLORS.text,
  },
  ticketTypeStats: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  miniProgressBar: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  controlButtonText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    marginLeft: 12,
  },
  dangerButton: {
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  dangerText: {
    color: COLORS.error,
  },
});
