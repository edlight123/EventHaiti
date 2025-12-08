import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { doc, getDoc, collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../config/brand';
import { format } from 'date-fns';

export default function EventDetailScreen({ route, navigation }: any) {
  const { eventId } = route.params;
  const { user, userProfile } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    fetchEventDetails();
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (eventDoc.exists()) {
        setEvent({ id: eventDoc.id, ...eventDoc.data() });
      }
    } catch (error) {
      console.error('Error fetching event:', error);
      Alert.alert('Error', 'Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseTicket = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to purchase tickets');
      return;
    }

    Alert.alert(
      'Purchase Ticket',
      `Purchase ticket for ${event.title}?\nPrice: ${event.currency || 'HTG'} ${event.ticket_price}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: async () => {
            setPurchasing(true);
            try {
              // Create ticket purchase
              const ticketData = {
                event_id: eventId,
                event_title: event.title,
                user_id: user.uid,
                user_email: userProfile?.email || user.email,
                user_name: userProfile?.full_name || 'Guest',
                ticket_type: 'General Admission',
                quantity: 1,
                price: event.ticket_price || 0,
                currency: event.currency || 'HTG',
                status: 'confirmed',
                purchase_date: Timestamp.now(),
                event_date: event.start_datetime,
                qr_code: `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                venue_name: event.venue_name,
                city: event.city,
              };

              await addDoc(collection(db, 'tickets'), ticketData);

              Alert.alert(
                'Success!',
                'Ticket purchased successfully! Check your Tickets tab.',
                [{ text: 'OK', onPress: () => navigation.navigate('Tickets') }]
              );
            } catch (error) {
              console.error('Error purchasing ticket:', error);
              Alert.alert('Error', 'Failed to purchase ticket. Please try again.');
            } finally {
              setPurchasing(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Event not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {event.cover_image_url && (
        <Image source={{ uri: event.cover_image_url }} style={styles.coverImage} />
      )}

      <View style={styles.content}>
        <Text style={styles.title}>{event.title}</Text>
        
        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>📅 Date & Time</Text>
          <Text style={styles.infoText}>
            {event.start_datetime && format(event.start_datetime.toDate(), 'EEEE, MMMM dd, yyyy')}
          </Text>
          <Text style={styles.infoText}>
            {event.start_datetime && format(event.start_datetime.toDate(), 'h:mm a')}
            {event.end_datetime && ` - ${format(event.end_datetime.toDate(), 'h:mm a')}`}
          </Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>📍 Location</Text>
          <Text style={styles.infoText}>{event.venue_name}</Text>
          <Text style={styles.infoText}>
            {event.address}, {event.city}, {event.state}
          </Text>
        </View>

        {event.organizer_name && (
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>👤 Organizer</Text>
            <Text style={styles.infoText}>{event.organizer_name}</Text>
          </View>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>ℹ️ About</Text>
          <Text style={styles.description}>{event.description}</Text>
        </View>

        {event.category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{event.category}</Text>
          </View>
        )}

        <View style={styles.priceSection}>
          <View>
            <Text style={styles.priceLabel}>Price</Text>
            <Text style={styles.price}>
              {event.ticket_price > 0 
                ? `${event.currency || 'HTG'} ${event.ticket_price}` 
                : 'Free'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.purchaseButton, purchasing && styles.purchaseButtonDisabled]}
          onPress={handlePurchaseTicket}
          disabled={purchasing}
        >
          {purchasing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.purchaseButtonText}>
              {event.ticket_price > 0 ? 'Purchase Ticket' : 'Register Free'}
            </Text>
          )}
        </TouchableOpacity>
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
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverImage: {
    width: '100%',
    height: 250,
    backgroundColor: COLORS.surface,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
  },
  infoSection: {
    marginBottom: 24,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
  },
  categoryBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  categoryText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  priceSection: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  priceLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  purchaseButton: {
    backgroundColor: COLORS.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 40,
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
});
