import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  Alert 
} from 'react-native';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, getDocs as getDocsFirestore } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../config/brand';
import { format } from 'date-fns';

export default function FavoritesScreen({ navigation }: any) {
  const { user } = useAuth();
  const [favoriteEvents, setFavoriteEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFavorites = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get favorite event IDs
      const favoritesRef = collection(db, 'event_favorites');
      const favoritesQuery = query(favoritesRef, where('user_id', '==', user.uid));
      const favoritesSnapshot = await getDocs(favoritesQuery);
      
      if (favoritesSnapshot.empty) {
        setFavoriteEvents([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const eventIds = favoritesSnapshot.docs.map(doc => doc.data().event_id);

      // Get events (batch by 10 for Firestore 'in' query limit)
      const allEvents = [];
      for (let i = 0; i < eventIds.length; i += 10) {
        const batch = eventIds.slice(i, i + 10);
        const eventsQuery = query(
          collection(db, 'events'),
          where('__name__', 'in', batch)
        );
        const eventsSnapshot = await getDocs(eventsQuery);
        eventsSnapshot.docs.forEach(doc => {
          allEvents.push({
            id: doc.id,
            ...doc.data()
          });
        });
      }

      setFavoriteEvents(allEvents);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFavorites();
  };

  const removeFavorite = async (eventId: string) => {
    Alert.alert(
      'Remove Favorite',
      'Remove this event from your favorites?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const favoritesRef = collection(db, 'event_favorites');
              const q = query(
                favoritesRef,
                where('user_id', '==', user?.uid),
                where('event_id', '==', eventId)
              );
              const snapshot = await getDocs(q);
              
              snapshot.docs.forEach(async (docSnapshot) => {
                await deleteDoc(doc(db, 'event_favorites', docSnapshot.id));
              });

              // Update local state
              setFavoriteEvents(prev => prev.filter(event => event.id !== eventId));
              
              Alert.alert('Success', 'Event removed from favorites');
            } catch (error) {
              console.error('Error removing favorite:', error);
              Alert.alert('Error', 'Failed to remove favorite');
            }
          }
        }
      ]
    );
  };

  if (!user) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>❤️</Text>
        <Text style={styles.emptyTitle}>Login Required</Text>
        <Text style={styles.emptyText}>Please login to view your favorite events</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Favorites</Text>
        <Text style={styles.headerSubtitle}>
          {favoriteEvents.length} saved event{favoriteEvents.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {favoriteEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>❤️</Text>
            <Text style={styles.emptyTitle}>No Favorites Yet</Text>
            <Text style={styles.emptyText}>
              Save events you're interested in and they'll appear here
            </Text>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => navigation.navigate('Discover')}
            >
              <Text style={styles.exploreButtonText}>Explore Events</Text>
            </TouchableOpacity>
          </View>
        ) : (
          favoriteEvents.map(event => (
            <View key={event.id} style={styles.eventCard}>
              <TouchableOpacity
                onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
                style={styles.eventContent}
              >
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventDate}>
                  📅 {event.start_datetime && format(event.start_datetime.toDate(), 'MMM dd, yyyy • h:mm a')}
                </Text>
                <Text style={styles.eventLocation}>
                  📍 {event.venue_name}, {event.city}
                </Text>
                {event.ticket_price > 0 && (
                  <Text style={styles.eventPrice}>
                    {event.currency || 'HTG'} {event.ticket_price}
                  </Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeFavorite(event.id)}
              >
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
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
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  eventCard: {
    backgroundColor: COLORS.surface,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventContent: {
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  eventDate: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  eventPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  removeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  exploreButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});