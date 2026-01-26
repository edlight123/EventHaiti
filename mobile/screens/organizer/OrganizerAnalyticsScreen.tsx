import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../config/brand';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { backendFetch } from '../../lib/api/backend';
import { format, subDays } from 'date-fns';

const { width } = Dimensions.get('window');

interface ChartData {
  date: string;
  sales: number;
  revenue: number;
}

interface EventStats {
  id: string;
  title: string;
  ticketCount: number;
  revenueCents: number;
}

export default function OrganizerAnalyticsScreen({ navigation }: any) {
  const { userProfile } = useAuth();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalEvents: 0,
    publishedEvents: 0,
    totalTicketsSold: 0,
    totalRevenue: 0,
    currency: 'USD',
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [topEvents, setTopEvents] = useState<EventStats[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('7d');

  useEffect(() => {
    loadData();
  }, [userProfile?.id, timeRange]);

  const loadData = async () => {
    if (!userProfile?.id) return;

    try {
      // Fetch analytics from the web API (same endpoint the web uses)
      const response = await backendFetch(`/api/organizer/analytics?range=${timeRange}`);
      
      if (response.ok) {
        const data = await response.json();
        setStats({
          totalEvents: data.totalEvents || 0,
          publishedEvents: data.publishedEvents || 0,
          totalTicketsSold: data.totalTicketsSold || 0,
          totalRevenue: data.totalRevenue || 0,
          currency: data.currency || 'USD',
        });
        setChartData(data.chartData || []);
        setTopEvents(data.topEvents || []);
      } else {
        // Fallback: Load from Firebase directly
        await loadFromFirebase();
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      await loadFromFirebase();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadFromFirebase = async () => {
    try {
      const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');
      const { db } = await import('../../config/firebase');

      // Get organizer events
      const eventsQuery = query(
        collection(db, 'events'),
        where('organizer_id', '==', userProfile?.id)
      );
      const eventsSnapshot = await getDocs(eventsQuery);
      const events = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Get tickets for these events
      let totalTickets = 0;
      let totalRevenueCents = 0;
      const eventStats: EventStats[] = [];

      for (const event of events) {
        const ticketsQuery = query(
          collection(db, 'tickets'),
          where('event_id', '==', event.id)
        );
        const ticketsSnapshot = await getDocs(ticketsQuery);
        const ticketCount = ticketsSnapshot.size;
        let eventRevenue = 0;

        ticketsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          eventRevenue += (data.price_paid || 0) * 100;
        });

        totalTickets += ticketCount;
        totalRevenueCents += eventRevenue;

        if (ticketCount > 0) {
          eventStats.push({
            id: event.id,
            title: (event as any).title || 'Unknown Event',
            ticketCount,
            revenueCents: eventRevenue,
          });
        }
      }

      eventStats.sort((a, b) => b.ticketCount - a.ticketCount);

      setStats({
        totalEvents: events.length,
        publishedEvents: events.filter((e: any) => e.is_published).length,
        totalTicketsSold: totalTickets,
        totalRevenue: totalRevenueCents / 100,
        currency: 'USD',
      });
      setTopEvents(eventStats.slice(0, 5));

      // Chart data: show zeros until real daily aggregation is implemented
      // TODO: Implement daily sales aggregation in Firestore for accurate chart data
      const chart: ChartData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        chart.push({
          date: format(date, 'MMM dd'),
          sales: 0,
          revenue: 0,
        });
      }
      setChartData(chart);
    } catch (error) {
      console.error('Error loading from Firebase:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatMoney = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Simple bar chart rendering
  const maxSales = Math.max(...chartData.map(d => d.sales), 1);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{t('analytics.loading') || 'Loading analytics...'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('analytics.title') || 'Analytics'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          {(['7d', '30d', 'all'] as const).map((range) => (
            <TouchableOpacity
              key={range}
              style={[styles.timeRangeButton, timeRange === range && styles.timeRangeButtonActive]}
              onPress={() => setTimeRange(range)}
            >
              <Text style={[styles.timeRangeText, timeRange === range && styles.timeRangeTextActive]}>
                {range === '7d' ? (t('analytics.7days') || '7 Days') :
                 range === '30d' ? (t('analytics.30days') || '30 Days') :
                 (t('analytics.allTime') || 'All Time')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.statCardPrimary]}>
            <Ionicons name="cash-outline" size={24} color="#FFF" />
            <Text style={styles.statValue}>{formatMoney(stats.totalRevenue)}</Text>
            <Text style={styles.statLabel}>{t('analytics.totalRevenue') || 'Total Revenue'}</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="ticket-outline" size={24} color={COLORS.primary} />
            <Text style={[styles.statValue, { color: COLORS.text }]}>{stats.totalTicketsSold}</Text>
            <Text style={[styles.statLabel, { color: COLORS.textSecondary }]}>{t('analytics.ticketsSold') || 'Tickets Sold'}</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="calendar-outline" size={24} color={COLORS.primary} />
            <Text style={[styles.statValue, { color: COLORS.text }]}>{stats.totalEvents}</Text>
            <Text style={[styles.statLabel, { color: COLORS.textSecondary }]}>{t('analytics.totalEvents') || 'Total Events'}</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="eye-outline" size={24} color={COLORS.primary} />
            <Text style={[styles.statValue, { color: COLORS.text }]}>{stats.publishedEvents}</Text>
            <Text style={[styles.statLabel, { color: COLORS.textSecondary }]}>{t('analytics.published') || 'Published'}</Text>
          </View>
        </View>

        {/* Sales Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{t('analytics.salesOverTime') || 'Sales Over Time'}</Text>
          <View style={styles.chartContainer}>
            {chartData.map((item, index) => (
              <View key={index} style={styles.chartBarContainer}>
                <View style={styles.chartBarWrapper}>
                  <View
                    style={[
                      styles.chartBar,
                      { height: (item.sales / maxSales) * 100 || 4 },
                    ]}
                  />
                </View>
                <Text style={styles.chartLabel}>{item.date.split(' ')[1]}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Top Events */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('analytics.topEvents') || 'Top Performing Events'}</Text>
          {topEvents.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="bar-chart-outline" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>{t('analytics.noData') || 'No ticket sales yet'}</Text>
            </View>
          ) : (
            topEvents.map((event, index) => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventRow}
                onPress={() => navigation.navigate('OrganizerEventManagement', { eventId: event.id })}
              >
                <View style={styles.eventRank}>
                  <Text style={styles.eventRankText}>#{index + 1}</Text>
                </View>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                  <Text style={styles.eventStats}>
                    {event.ticketCount} {t('analytics.tickets') || 'tickets'} • {formatMoney(event.revenueCents / 100)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
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
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: COLORS.primary,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  scrollView: {
    flex: 1,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FFF',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timeRangeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  timeRangeTextActive: {
    color: '#FFF',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
  },
  statCard: {
    width: (width - 40) / 2,
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    alignItems: 'center',
  },
  statCardPrimary: {
    backgroundColor: COLORS.primary,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    textAlign: 'center',
  },
  chartCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 20,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
  },
  chartBarContainer: {
    alignItems: 'center',
    flex: 1,
  },
  chartBarWrapper: {
    height: 100,
    justifyContent: 'flex-end',
  },
  chartBar: {
    width: 24,
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    minHeight: 4,
  },
  chartLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  sectionCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  eventRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  eventRankText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  eventStats: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
