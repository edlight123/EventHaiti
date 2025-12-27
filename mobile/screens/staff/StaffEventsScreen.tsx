import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collectionGroup, getDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { COLORS } from '../../config/brand';

type StaffMemberDoc = {
  uid?: string;
  eventId?: string;
  role?: string;
  permissions?: { checkin?: boolean; viewAttendees?: boolean };
};

type EventSummary = {
  id: string;
  title: string;
  start_datetime?: any;
  venue_name?: string;
  city?: string;
};

export default function StaffEventsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const uid = auth.currentUser?.uid || null;

  // Keep the banner compact while ensuring content is below the iOS notch.
  const bannerBaseHeight = 120;
  const bannerPaddingTop = Platform.OS === 'ios' ? insets.top : 0;
  const bannerExtraHeight = Platform.OS === 'ios' ? Math.max(0, insets.top - 24) : 0;
  const bannerHeight = bannerBaseHeight + bannerExtraHeight;

  const emptyText = useMemo(() => {
    if (!uid) return 'Please sign in.';
    return 'No assigned events yet.';
  }, [uid]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!uid) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const memberQuery = query(collectionGroup(db, 'members'), where('uid', '==', uid));
        const memberSnap = await getDocs(memberQuery);

        const eventIds: string[] = [];
        memberSnap.forEach((d) => {
          const data = d.data() as StaffMemberDoc;
          if (data?.eventId && data?.permissions?.checkin) {
            eventIds.push(String(data.eventId));
          }
        });

        const uniqueEventIds = Array.from(new Set(eventIds));
        const loaded: EventSummary[] = [];

        for (const eventId of uniqueEventIds) {
          const eventSnap = await getDoc(doc(db, 'events', eventId));
          if (!eventSnap.exists()) continue;
          const data = eventSnap.data() as any;
          loaded.push({
            id: eventSnap.id,
            title: data?.title || 'Event',
            start_datetime: data?.start_datetime,
            venue_name: data?.venue_name || '',
            city: data?.city || '',
          });
        }

        if (!cancelled) setEvents(loaded);
      } catch (e) {
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [uid]);

  return (
    <View style={styles.container}>
      {/* Camera section (visual) */}
      <View style={[styles.cameraSection, { height: bannerHeight, paddingTop: bannerPaddingTop }]}>
        <View style={styles.cameraPlaceholder}>
          <Text style={styles.cameraText}>Staff Mode</Text>
          <Text style={styles.cameraSubtext}>Events you can scan for</Text>
        </View>
      </View>

      {/* Header below camera section */}
      <View style={styles.header}>
        <Text style={styles.title}>Assigned Events</Text>
        <Text style={styles.subtitle}>Select an event to open the scanner</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : events.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>{emptyText}</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => (navigation as any).navigate('TicketScanner', { eventId: item.id })}
            >
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardMeta}>
                {item.venue_name ? item.venue_name : 'Venue'}
                {item.city ? ` • ${item.city}` : ''}
              </Text>
              <Text style={styles.cardAction}>Open Scanner</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  cameraSection: {
    backgroundColor: COLORS.primary,
  },
  cameraPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  cameraText: {
    marginTop: 0,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  cameraSubtext: {
    marginTop: 6,
    fontSize: 13,
    color: COLORS.white,
    opacity: 0.95,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  empty: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  cardMeta: {
    marginTop: 6,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  cardAction: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
