import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { COLORS } from '../config/brand';
import { format } from 'date-fns';
import QRCode from 'react-native-qrcode-svg';

export default function TicketDetailScreen({ route }: any) {
  const { ticketId } = route.params;
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTicketDetails();
  }, [ticketId]);

  const fetchTicketDetails = async () => {
    try {
      const ticketDoc = await getDoc(doc(db, 'tickets', ticketId));
      if (ticketDoc.exists()) {
        setTicket({ id: ticketDoc.id, ...ticketDoc.data() });
      }
    } catch (error) {
      console.error('Error fetching ticket:', error);
      Alert.alert('Error', 'Failed to load ticket details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Ticket not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* QR Code Section */}
        <View style={styles.qrSection}>
          <View style={styles.qrContainer}>
            <QRCode
              value={ticket.qr_code || ticketId}
              size={200}
              backgroundColor="white"
              color={COLORS.primary}
            />
          </View>
          <Text style={styles.qrInstruction}>
            Show this QR code at the event entrance
          </Text>
        </View>

        {/* Status Badge */}
        <View style={[
          styles.statusBadge,
          ticket.status === 'confirmed' && styles.statusConfirmed,
          ticket.status === 'used' && styles.statusUsed,
        ]}>
          <Text style={styles.statusText}>{ticket.status?.toUpperCase()}</Text>
        </View>

        {/* Event Details */}
        <Text style={styles.eventTitle}>{ticket.event_title}</Text>
        
        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>📅 Date & Time</Text>
          <Text style={styles.detailText}>
            {ticket.event_date && format(ticket.event_date.toDate(), 'EEEE, MMMM dd, yyyy')}
          </Text>
          <Text style={styles.detailText}>
            {ticket.event_date && format(ticket.event_date.toDate(), 'h:mm a')}
          </Text>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>📍 Venue</Text>
          <Text style={styles.detailText}>{ticket.venue_name}</Text>
          <Text style={styles.detailText}>{ticket.city}</Text>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>🎫 Ticket Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Type:</Text>
            <Text style={styles.infoValue}>{ticket.ticket_type}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Quantity:</Text>
            <Text style={styles.infoValue}>{ticket.quantity}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Price:</Text>
            <Text style={styles.infoValue}>{ticket.currency} {ticket.price}</Text>
          </View>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>👤 Attendee</Text>
          <Text style={styles.detailText}>{ticket.user_name}</Text>
          <Text style={styles.detailText}>{ticket.user_email}</Text>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>🧾 Purchase Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ticket ID:</Text>
            <Text style={styles.infoValue}>{ticket.id}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Purchase Date:</Text>
            <Text style={styles.infoValue}>
              {ticket.purchase_date && format(ticket.purchase_date.toDate(), 'MMM dd, yyyy')}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Keep this ticket safe</Text>
          <Text style={styles.footerSubtext}>
            This QR code is your entry pass to the event
          </Text>
        </View>
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
  content: {
    padding: 20,
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qrContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  qrInstruction: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 20,
    backgroundColor: COLORS.border,
  },
  statusConfirmed: {
    backgroundColor: '#10B981',
  },
  statusUsed: {
    backgroundColor: COLORS.textSecondary,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  detailSection: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  footer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
});
