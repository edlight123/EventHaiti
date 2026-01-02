import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../config/brand';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import {
  getOrganizerStats,
  getTodayEvents,
  OrganizerStats,
  TodayEvent,
} from '../../lib/api/organizer';

export default function OrganizerDashboardScreen() {
  const navigation = useNavigation<any>();
  const { userProfile } = useAuth();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [todayEvents, setTodayEvents] = useState<TodayEvent[]>([]);
  const [stats, setStats] = useState<OrganizerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!userProfile?.id) return;

    try {
      const [eventsData, statsData] = await Promise.all([
        getTodayEvents(userProfile.id),
        getOrganizerStats(userProfile.id, '7d'),
      ]);

      setTodayEvents(eventsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading organizer dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userProfile?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reload data when screen comes into focus (e.g., after editing an event)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>{t('organizerDashboard.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      {/* Fixed Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>{t('organizerDashboard.title')}</Text>
        <Text style={styles.headerSubtitle}>
          {t('organizerDashboard.welcomeBack')}, {userProfile?.full_name || t('organizerDashboard.organizerFallback')}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Today's Events */}
        <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('organizerDashboard.todaysEvents')}</Text>
        {todayEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>{t('organizerDashboard.noEventsToday')}</Text>
          </View>
        ) : (
          todayEvents.map((event) => {
            const eventTime = new Date(event.start_datetime).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            });

            return (
              <TouchableOpacity 
                key={event.id} 
                style={styles.eventCard}
                onPress={() => navigation.navigate('OrganizerEventManagement', { eventId: event.id })}
                activeOpacity={0.7}
              >
                <View style={styles.eventHeader}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <TouchableOpacity 
                    style={styles.scanButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      navigation.navigate('TicketScanner', { eventId: event.id });
                    }}
                  >
                    <Ionicons name="qr-code-outline" size={20} color={COLORS.primary} />
                    <Text style={styles.scanButtonText}>{t('tabs.scan')}</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.eventDetails}>
                  <View style={styles.eventDetailRow}>
                    <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.eventDetailText}>{eventTime}</Text>
                  </View>
                  <View style={styles.eventDetailRow}>
                    <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.eventDetailText}>{event.location}</Text>
                  </View>
                </View>

                <View style={styles.eventStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{event.ticketsSold}/{event.capacity}</Text>
                    <Text style={styles.statLabel}>{t('organizerDashboard.ticketsSold')}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{event.ticketsCheckedIn}</Text>
                    <Text style={styles.statLabel}>{t('organizerDashboard.checkedIn')}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* This Week Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('organizerDashboard.thisWeek')}</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="ticket-outline" size={32} color={COLORS.primary} />
            <Text style={styles.statCardValue}>{stats?.ticketsSold || 0}</Text>
            <Text style={styles.statCardLabel}>{t('organizerDashboard.ticketsSold')}</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle-outline" size={32} color={COLORS.success} />
            <Text style={styles.statCardValue}>{stats?.upcomingEvents || 0}</Text>
            <Text style={styles.statCardLabel}>{t('organizerDashboard.upcomingEvents')}</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="cash-outline" size={32} color={COLORS.primary} />
            <Text style={styles.statCardValue}>${(stats?.revenue || 0).toFixed(2)}</Text>
            <Text style={styles.statCardLabel}>{t('organizerDashboard.revenue')}</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="document-text-outline" size={32} color={COLORS.textSecondary} />
            <Text style={styles.statCardValue}>{stats?.draftEvents || 0}</Text>
            <Text style={styles.statCardLabel}>{t('organizerDashboard.drafts')}</Text>
          </View>
        </View>
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flex: 1,
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
  header: {
    padding: 20,
    paddingTop: 16,
    backgroundColor: COLORS.primary,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.white,
    opacity: 0.9,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  eventCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  scanButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  eventDetails: {
    marginBottom: 12,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventDetailText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 6,
  },
  eventStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  statCard: {
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
  statCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 8,
  },
  statCardLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
});
