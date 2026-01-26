import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { COLORS } from '../config/brand';
import { format } from 'date-fns';
import { useI18n } from '../contexts/I18nContext';
import { backendFetch } from '../lib/api/backend';

export default function RefundRequestScreen({ route, navigation }: any) {
  const { ticketId } = route.params;
  const { t } = useI18n();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState('');
  const [selectedReason, setSelectedReason] = useState<string | null>(null);

  const predefinedReasons = [
    { key: 'schedule_conflict', label: t('refund.reasons.scheduleConflict') || 'Schedule conflict' },
    { key: 'cannot_attend', label: t('refund.reasons.cannotAttend') || "Can't attend anymore" },
    { key: 'bought_wrong', label: t('refund.reasons.boughtWrong') || 'Bought wrong tickets' },
    { key: 'financial', label: t('refund.reasons.financial') || 'Financial reasons' },
    { key: 'other', label: t('refund.reasons.other') || 'Other reason' },
  ];

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
        });
      }
    } catch (error) {
      console.error('Error fetching ticket:', error);
      Alert.alert(t('common.error'), t('refund.loadError') || 'Failed to load ticket details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRefund = async () => {
    if (!selectedReason) {
      Alert.alert(t('common.error'), t('refund.selectReason') || 'Please select a reason');
      return;
    }

    const finalReason = selectedReason === 'other' ? reason : selectedReason;
    if (!finalReason.trim()) {
      Alert.alert(t('common.error'), t('refund.enterReason') || 'Please provide a reason');
      return;
    }

    setSubmitting(true);
    try {
      const response = await backendFetch('/api/refunds/request', {
        method: 'POST',
        body: JSON.stringify({
          ticketId,
          reason: finalReason,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit refund request');
      }

      Alert.alert(
        t('common.success'),
        t('refund.submitted') || 'Refund request submitted. The organizer will review your request.',
        [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      console.error('Error submitting refund:', error);
      Alert.alert(t('common.error'), error.message || t('refund.submitError') || 'Failed to submit refund request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!ticket) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>{t('refund.ticketNotFound') || 'Ticket not found'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Check if refund is still allowed (24h before event)
  const eventDate = new Date(ticket.event_date || ticket.start_datetime);
  const now = new Date();
  const refundDeadline = new Date(eventDate);
  refundDeadline.setHours(refundDeadline.getHours() - 24);
  const canRefund = now < refundDeadline;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('refund.title') || 'Request Refund'}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Ticket Info Card */}
        <View style={styles.ticketCard}>
          <Text style={styles.eventTitle}>{ticket.event_title}</Text>
          <View style={styles.ticketRow}>
            <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.ticketInfo}>
              {ticket.event_date && format(new Date(ticket.event_date), 'EEEE, MMMM dd, yyyy')}
            </Text>
          </View>
          <View style={styles.ticketRow}>
            <Ionicons name="ticket-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.ticketInfo}>
              {ticket.tier_name || t('refund.generalAdmission') || 'General Admission'}
            </Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t('refund.amountPaid') || 'Amount Paid'}:</Text>
            <Text style={styles.priceValue}>
              ${(ticket.price_paid || ticket.price || 0).toFixed(2)}
            </Text>
          </View>
        </View>

        {!canRefund ? (
          <View style={styles.warningCard}>
            <Ionicons name="warning" size={24} color={COLORS.error} />
            <Text style={styles.warningText}>
              {t('refund.deadlinePassed') || 'Refund deadline has passed. Refunds must be requested at least 24 hours before the event.'}
            </Text>
          </View>
        ) : (
          <>
            {/* Reason Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('refund.selectReasonTitle') || 'Why do you need a refund?'}</Text>
              {predefinedReasons.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.reasonOption,
                    selectedReason === item.key && styles.reasonOptionSelected,
                  ]}
                  onPress={() => setSelectedReason(item.key)}
                >
                  <View style={[
                    styles.radioCircle,
                    selectedReason === item.key && styles.radioCircleSelected,
                  ]}>
                    {selectedReason === item.key && <View style={styles.radioInner} />}
                  </View>
                  <Text style={[
                    styles.reasonText,
                    selectedReason === item.key && styles.reasonTextSelected,
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Additional Details */}
            {selectedReason === 'other' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('refund.additionalDetails') || 'Additional Details'}</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={t('refund.reasonPlaceholder') || 'Please explain your reason...'}
                  placeholderTextColor={COLORS.textSecondary}
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            )}

            {/* Policy Note */}
            <View style={styles.policyCard}>
              <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
              <Text style={styles.policyText}>
                {t('refund.policyNote') || 'Refund requests are reviewed by the event organizer. You will receive an email notification once your request has been processed.'}
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmitRefund}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="#FFF" />
                  <Text style={styles.submitButtonText}>{t('refund.submit') || 'Submit Request'}</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  ticketCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketInfo: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  priceLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 16,
    backgroundColor: COLORS.error + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.error + '30',
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.error,
    marginLeft: 12,
    lineHeight: 20,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  reasonOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioCircleSelected: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  reasonText: {
    fontSize: 15,
    color: COLORS.text,
  },
  reasonTextSelected: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  textInput: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: COLORS.text,
    minHeight: 120,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  policyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    margin: 16,
    padding: 16,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 12,
  },
  policyText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 12,
    lineHeight: 18,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    marginTop: 8,
    padding: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 8,
  },
});
