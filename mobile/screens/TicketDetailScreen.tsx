import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Share, Platform } from 'react-native';
import { Calendar, MapPin, User as UserIcon, Ticket as TicketIcon, Share2, Send } from 'lucide-react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { COLORS } from '../config/brand';
import { format } from 'date-fns';
import QRCode from 'react-native-qrcode-svg';
import TransferTicketModal from '../components/TransferTicketModal';
import AddToWalletButton from '../components/AddToWalletButton';

export default function TicketDetailScreen({ route }: any) {
  const { ticketId } = route.params;
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showTransferModal, setShowTransferModal] = useState(false);

  useEffect(() => {
    fetchTicketDetails();
  }, [ticketId]);

  const fetchTicketDetails = async () => {
    try {
      const ticketDoc = await getDoc(doc(db, 'tickets', ticketId));
      if (ticketDoc.exists()) {
        const data = ticketDoc.data();
        setTicket({ 
          id: ticketDoc.id, 
          ...data,
          event_date: data.event_date?.toDate ? data.event_date.toDate() : data.event_date ? new Date(data.event_date) : null,
          purchase_date: data.purchase_date?.toDate ? data.purchase_date.toDate() : data.purchase_date ? new Date(data.purchase_date) : null
        });
      }
    } catch (error) {
      console.error('Error fetching ticket:', error);
      Alert.alert('Error', 'Failed to load ticket details');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `My ticket for ${ticket.event_title}\nDate: ${ticket.event_date && format(ticket.event_date, 'EEEE, MMMM dd, yyyy')}\nVenue: ${ticket.venue_name}`,
        title: `Ticket: ${ticket.event_title}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
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
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Header with Title and Actions */}
          <View style={styles.header}>
            <Text style={styles.eventTitle}>{ticket.event_title}</Text>
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Share2 size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {/* Status Badge */}
          <View style={[
            styles.statusBadge,
            ticket.status === 'confirmed' && styles.statusConfirmed,
            ticket.status === 'used' && styles.statusUsed,
          ]}>
            <Text style={styles.statusText}>{ticket.status?.toUpperCase()}</Text>
          </View>

          {/* QR Code Section */}
          <View style={styles.qrSection}>
            <View style={styles.qrContainer}>
              <QRCode
                value={ticket.qr_code || ticketId}
                size={220}
                backgroundColor="white"
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.qrInstruction}>
              Show this QR code at the event entrance
            </Text>
          </View>

          {/* Key Info Cards */}
          <View style={styles.infoCards}>
            <View style={styles.infoCard}>
              <View style={styles.infoCardIcon}>
                <Calendar size={20} color={COLORS.primary} />
              </View>
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardLabel}>Date & Time</Text>
                <Text style={styles.infoCardValue}>
                  {ticket.event_date && format(ticket.event_date, 'MMM dd, yyyy')}
                </Text>
                <Text style={styles.infoCardSubvalue}>
                  {ticket.event_date && format(ticket.event_date, 'h:mm a')}
                </Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoCardIcon}>
                <MapPin size={20} color={COLORS.primary} />
              </View>
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardLabel}>Venue</Text>
                <Text style={styles.infoCardValue}>{ticket.venue_name}</Text>
                <Text style={styles.infoCardSubvalue}>{ticket.city}</Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoCardIcon}>
                <UserIcon size={20} color={COLORS.primary} />
              </View>
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardLabel}>Attendee</Text>
                <Text style={styles.infoCardValue}>{ticket.user_name}</Text>
                <Text style={styles.infoCardSubvalue}>{ticket.user_email}</Text>
              </View>
            </View>
          </View>

          {/* Ticket Details Card */}
          <View style={styles.detailsCard}>
            <View style={styles.detailsHeader}>
              <TicketIcon size={20} color={COLORS.primary} />
              <Text style={styles.detailsTitle}>Ticket Information</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Type</Text>
              <Text style={styles.detailValue}>{ticket.ticket_type}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Quantity</Text>
              <Text style={styles.detailValue}>{ticket.quantity}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Price</Text>
              <Text style={styles.detailValue}>{ticket.currency} {ticket.price}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Ticket ID</Text>
              <Text style={[styles.detailValue, styles.ticketId]} numberOfLines={1}>
                {ticket.id}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Purchase Date</Text>
              <Text style={styles.detailValue}>
                {ticket.purchase_date && format(ticket.purchase_date, 'MMM dd, yyyy')}
              </Text>
            </View>
          </View>

          {/* Add to Wallet Button */}
          {(ticket.status === 'confirmed' || ticket.status === 'active') && (
            <View style={styles.walletSection}>
              <AddToWalletButton
                ticketId={ticket.id}
                qrCodeData={ticket.qr_code || ticket.id}
                eventTitle={ticket.event_title}
                eventDate={ticket.event_date ? format(ticket.event_date, 'MMMM dd, yyyy h:mm a') : ''}
                venueName={ticket.venue_name}
                ticketNumber={1}
                totalTickets={ticket.quantity || 1}
              />
            </View>
          )}

          {/* Transfer Button */}
          {(ticket.status === 'confirmed' || ticket.status === 'active') && (
            <TouchableOpacity
              style={styles.transferButton}
              onPress={() => setShowTransferModal(true)}
            >
              <Send size={20} color="#FFF" />
              <Text style={styles.transferButtonText}>Transfer Ticket</Text>
            </TouchableOpacity>
          )}

          {/* Footer Note */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Keep this ticket safe</Text>
            <Text style={styles.footerSubtext}>
              This QR code is your entry pass to the event
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Transfer Modal */}
      <TransferTicketModal
        visible={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        ticketId={ticketId}
        eventTitle={ticket.event_title}
        transferCount={ticket.transfer_count || 0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    marginRight: 12,
    lineHeight: 30,
  },
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 24,
    backgroundColor: COLORS.border,
  },
  statusConfirmed: {
    backgroundColor: '#10B981',
  },
  statusUsed: {
    backgroundColor: COLORS.textSecondary,
  },
  statusText: {
    color: COLORS.surface,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  qrContainer: {
    backgroundColor: COLORS.surface,
    padding: 24,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qrInstruction: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  infoCards: {
    gap: 16,
    marginBottom: 24,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  infoCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCardValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  infoCardSubvalue: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  detailsCard: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 24,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
    textAlign: 'right',
    maxWidth: '60%',
  },
  ticketId: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  footer: {
    backgroundColor: COLORS.primary + '10',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
    marginBottom: 40,
  },
  footerText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 6,
  },
  footerSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  walletSection: {
    marginBottom: 24,
  },
  transferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  transferButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
});
