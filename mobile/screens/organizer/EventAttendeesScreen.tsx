import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { COLORS } from '../../config/brand';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

type RouteParams = {
  EventAttendees: {
    eventId: string;
  };
};

interface Attendee {
  id: string;
  attendee_name: string;
  attendee_email: string;
  tier_name: string;
  price_paid: number;
  purchased_at: any;
  checked_in_at: any;
  status: string;
}

export default function EventAttendeesScreen() {
  const route = useRoute<RouteProp<RouteParams, 'EventAttendees'>>();
  const navigation = useNavigation();
  const { eventId } = route.params;

  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [filteredAttendees, setFilteredAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'checked_in' | 'not_checked_in'>('all');

  useEffect(() => {
    loadAttendees();
  }, [eventId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAttendees();
    setRefreshing(false);
  };

  useEffect(() => {
    filterAttendees();
  }, [attendees, searchQuery, filterStatus]);

  const loadAttendees = async () => {
    try {
      const q = query(
        collection(db, 'tickets'),
        where('event_id', '==', eventId),
        where('status', 'in', ['active', 'checked_in', 'confirmed'])
      );

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Attendee[];

      setAttendees(data);
    } catch (error) {
      console.error('Error loading attendees:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAttendees = () => {
    let filtered = [...attendees];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.attendee_name?.toLowerCase().includes(query) ||
          a.attendee_email?.toLowerCase().includes(query)
      );
    }

    // Filter by check-in status
    if (filterStatus === 'checked_in') {
      filtered = filtered.filter((a) => a.checked_in_at);
    } else if (filterStatus === 'not_checked_in') {
      filtered = filtered.filter((a) => !a.checked_in_at);
    }

    setFilteredAttendees(filtered);
  };

  const renderAttendee = ({ item }: { item: Attendee }) => {
    const checkedIn = !!item.checked_in_at;
    const purchaseDate = item.purchased_at?.toDate
      ? item.purchased_at.toDate()
      : new Date(item.purchased_at);

    return (
      <View style={styles.attendeeCard}>
        <View style={styles.attendeeHeader}>
          <View style={styles.attendeeInfo}>
            <Text style={styles.attendeeName}>{item.attendee_name || 'N/A'}</Text>
            <Text style={styles.attendeeEmail}>{item.attendee_email || 'N/A'}</Text>
          </View>
          <View style={[styles.statusBadge, checkedIn && styles.statusBadgeCheckedIn]}>
            <Ionicons
              name={checkedIn ? 'checkmark-circle' : 'time-outline'}
              size={16}
              color={checkedIn ? COLORS.success : COLORS.warning}
            />
            <Text
              style={[styles.statusText, checkedIn && styles.statusTextCheckedIn]}
            >
              {checkedIn ? 'Checked In' : 'Not Checked In'}
            </Text>
          </View>
        </View>

        <View style={styles.attendeeDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="ticket-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.detailText}>{item.tier_name || 'General'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.detailText}>
              ${item.price_paid?.toFixed(2) || '0.00'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.detailText}>
              {purchaseDate.toLocaleDateString()}
            </Text>
          </View>
        </View>

        {checkedIn && item.checked_in_at && (
          <View style={styles.checkedInInfo}>
            <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
            <Text style={styles.checkedInText}>
              Checked in {item.checked_in_at.toDate
                ? item.checked_in_at.toDate().toLocaleString()
                : new Date(item.checked_in_at).toLocaleString()}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading attendees...</Text>
      </View>
    );
  }

  const checkedInCount = attendees.filter((a) => a.checked_in_at).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendees</Text>
        <View style={styles.headerStats}>
          <Text style={styles.headerStatsText}>
            {checkedInCount}/{attendees.length} checked in
          </Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={COLORS.textSecondary}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, filterStatus === 'all' && styles.filterTabActive]}
          onPress={() => setFilterStatus('all')}
        >
          <Text
            style={[
              styles.filterTabText,
              filterStatus === 'all' && styles.filterTabTextActive,
            ]}
          >
            All ({attendees.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filterStatus === 'checked_in' && styles.filterTabActive,
          ]}
          onPress={() => setFilterStatus('checked_in')}
        >
          <Text
            style={[
              styles.filterTabText,
              filterStatus === 'checked_in' && styles.filterTabTextActive,
            ]}
          >
            Checked In ({checkedInCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filterStatus === 'not_checked_in' && styles.filterTabActive,
          ]}
          onPress={() => setFilterStatus('not_checked_in')}
        >
          <Text
            style={[
              styles.filterTabText,
              filterStatus === 'not_checked_in' && styles.filterTabTextActive,
            ]}
          >
            Not Checked In ({attendees.length - checkedInCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Attendees list */}
      <FlatList
        data={filteredAttendees}
        renderItem={renderAttendee}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={COLORS.textSecondary} />
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No attendees found' : 'No attendees yet'}
            </Text>
          </View>
        }
      />
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerStats: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  headerStatsText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: COLORS.text,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  filterTabTextActive: {
    color: COLORS.white,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  attendeeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  attendeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  attendeeInfo: {
    flex: 1,
  },
  attendeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  attendeeEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.warningLight,
  },
  statusBadgeCheckedIn: {
    backgroundColor: COLORS.successLight,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.warning,
    marginLeft: 4,
  },
  statusTextCheckedIn: {
    color: COLORS.success,
  },
  attendeeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  checkedInInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  checkedInText: {
    fontSize: 12,
    color: COLORS.success,
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
});
