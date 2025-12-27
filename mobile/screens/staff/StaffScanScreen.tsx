import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { collectionGroup, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
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

export default function StaffScanScreen() {
  const navigation = useNavigation();
  const uid = auth.currentUser?.uid || null;

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventSummary | null>(null);
  const [showEventSelector, setShowEventSelector] = useState(false);

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

        if (cancelled) return;

        setEvents(loaded);
        setSelectedEvent((prev) => {
          if (prev && loaded.some((e) => e.id === prev.id)) return prev;
          return loaded.length > 0 ? loaded[0] : null;
        });
      } catch (e) {
        if (!cancelled) {
          setEvents([]);
          setSelectedEvent(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [uid]);

  const handleStartScanning = () => {
    if (!selectedEvent) {
      Alert.alert('No Event Selected', 'Please select an event to scan tickets.', [{ text: 'OK' }]);
      return;
    }

    (navigation as any).navigate('TicketScanner', { eventId: selectedEvent.id });
  };

  return (
    <View style={styles.container}>
      {/* Camera section (visual anchor) */}
      <View style={styles.cameraSection}>
        <View style={styles.cameraPlaceholder}>
          <Text style={styles.cameraText}>Ready to Scan</Text>
          <Text style={styles.cameraSubtext}>Select an assigned event below</Text>
        </View>
      </View>

      {/* Header below camera */}
      <View style={styles.header}>
        <Text style={styles.title}>Scan Tickets</Text>
        <Text style={styles.subtitle}>Staff access • assigned events only</Text>
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
        <View style={styles.content}>
          <Text style={styles.selectorLabel}>Select Event</Text>
          <TouchableOpacity style={styles.selectorButton} onPress={() => setShowEventSelector(true)}>
            <View style={styles.selectorContent}>
              {selectedEvent ? (
                <View style={styles.selectorTextCol}>
                  <Text style={styles.selectorTitle}>{selectedEvent.title}</Text>
                  <Text style={styles.selectorSubtitle}>
                    {selectedEvent.venue_name ? selectedEvent.venue_name : 'Venue'}
                    {selectedEvent.city ? ` • ${selectedEvent.city}` : ''}
                  </Text>
                </View>
              ) : (
                <Text style={styles.selectorPlaceholder}>Select an event...</Text>
              )}
              <Ionicons name="chevron-down" size={22} color={COLORS.textSecondary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.startButton, !selectedEvent && styles.startButtonDisabled]}
            onPress={handleStartScanning}
            disabled={!selectedEvent}
          >
            <Ionicons name="camera-outline" size={22} color={COLORS.white} />
            <Text style={styles.startButtonText}>Start Scanning</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={showEventSelector}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEventSelector(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Event</Text>
              <TouchableOpacity onPress={() => setShowEventSelector(false)}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={events}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.eventItem, selectedEvent?.id === item.id && styles.eventItemSelected]}
                  onPress={() => {
                    setSelectedEvent(item);
                    setShowEventSelector(false);
                  }}
                >
                  <View style={styles.eventItemContent}>
                    <Text style={styles.eventItemTitle}>{item.title}</Text>
                    <Text style={styles.eventItemSubtitle}>
                      {item.venue_name ? item.venue_name : 'Venue'}
                      {item.city ? ` • ${item.city}` : ''}
                    </Text>
                  </View>
                  {selectedEvent?.id === item.id && (
                    <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  cameraSection: {
    height: 120,
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
    paddingTop: 14,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
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
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  selectorLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
  },
  selectorButton: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  selectorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  selectorSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  selectorPlaceholder: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  startButton: {
    marginTop: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  startButtonDisabled: {
    opacity: 0.6,
  },
  startButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  eventItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  eventItemSelected: {
    backgroundColor: COLORS.background,
  },
  eventItemContent: {
    flex: 1,
    paddingRight: 12,
  },
  eventItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  eventItemSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});
