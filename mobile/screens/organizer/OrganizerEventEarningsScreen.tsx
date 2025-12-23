import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import { collection, getDocs, limit, query, where } from 'firebase/firestore'

import { COLORS } from '../../config/brand'
import { db } from '../../config/firebase'
import { backendJson } from '../../lib/api/backend'
import { getEventById } from '../../lib/api/organizer'

type RouteParams = {
  OrganizerEventEarnings: {
    eventId: string
  }
}

type BankDestination = {
  id: string
  bankName: string
  accountName: string
  accountNumberLast4: string
  isPrimary: boolean
}

type EventEarnings = {
  availableToWithdraw: number
  currency?: 'HTG' | 'USD'
  settlementStatus?: 'pending' | 'ready' | 'locked' | string
  totalEarned?: number
  withdrawnAmount?: number
}

export default function OrganizerEventEarningsScreen() {
  const route = useRoute<RouteProp<RouteParams, 'OrganizerEventEarnings'>>()
  const navigation = useNavigation<any>()
  const { eventId } = route.params

  const [loading, setLoading] = useState(true)
  const [eventTitle, setEventTitle] = useState<string>('')
  const [earnings, setEarnings] = useState<EventEarnings | null>(null)

  const [showWithdraw, setShowWithdraw] = useState(false)
  const [method, setMethod] = useState<'moncash' | 'bank' | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // MonCash
  const [moncashNumber, setMoncashNumber] = useState('')
  const [prefunding, setPrefunding] = useState<{ enabled: boolean; available: boolean } | null>(null)
  const [allowInstantMoncash, setAllowInstantMoncash] = useState(false)

  // Bank
  const [bankDestinations, setBankDestinations] = useState<BankDestination[] | null>(null)
  const [bankMode, setBankMode] = useState<'on_file' | 'saved' | 'new'>('new')
  const [selectedBankDestinationId, setSelectedBankDestinationId] = useState('')
  const [saveNewBankDestination, setSaveNewBankDestination] = useState(true)
  const [bankDetails, setBankDetails] = useState({
    accountHolder: '',
    bankName: '',
    accountNumber: '',
    routingNumber: '',
    swiftCode: '',
  })

  // OTP step-up
  const [verificationRequired, setVerificationRequired] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [isVerifyingCode, setIsVerifyingCode] = useState(false)
  const [pendingEndpoint, setPendingEndpoint] = useState<string | null>(null)
  const [pendingPayload, setPendingPayload] = useState<any | null>(null)

  const currency = (earnings?.currency || 'HTG') as 'HTG' | 'USD'
  const availableToWithdraw = earnings?.availableToWithdraw || 0

  const instantPreview = useMemo(() => {
    if (!prefunding?.enabled || !prefunding?.available) return null
    if (!allowInstantMoncash) return null
    if (currency !== 'HTG') return null

    const feeCents = Math.round(availableToWithdraw * 0.03)
    const payoutAmountCents = Math.max(0, availableToWithdraw - feeCents)
    return { feeCents, payoutAmountCents }
  }, [allowInstantMoncash, availableToWithdraw, currency, prefunding?.available, prefunding?.enabled])

  const formatCurrency = (cents: number, curr: string) => {
    const symbol = String(curr).toUpperCase() === 'USD' ? '$' : 'G'
    return `${symbol}${(cents / 100).toFixed(2)}`
  }

  const loadEarnings = useCallback(async () => {
    setLoading(true)
    try {
      const event = await getEventById(eventId)
      setEventTitle(event?.title || '')

      const q = query(collection(db, 'event_earnings'), where('eventId', '==', eventId), limit(1))
      const snapshot = await getDocs(q)
      if (snapshot.empty) {
        setEarnings(null)
        return
      }
      const data = snapshot.docs[0].data() as any
      setEarnings({
        availableToWithdraw: Number(data?.availableToWithdraw || 0),
        currency: (String(data?.currency || 'HTG').toUpperCase() === 'USD' ? 'USD' : 'HTG') as any,
        settlementStatus: data?.settlementStatus || 'pending',
        totalEarned: Number(data?.totalEarned || 0),
        withdrawnAmount: Number(data?.withdrawnAmount || 0),
      })
    } catch (e: any) {
      console.error('Error loading earnings:', e)
      Alert.alert('Error', e?.message || 'Failed to load earnings')
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    loadEarnings()
  }, [loadEarnings])

  useFocusEffect(
    useCallback(() => {
      loadEarnings()
    }, [loadEarnings])
  )

  const openWithdraw = async (nextMethod: 'moncash' | 'bank') => {
    setMethod(nextMethod)
    setShowWithdraw(true)
    setVerificationRequired(false)
    setPendingEndpoint(null)
    setPendingPayload(null)
    setVerificationCode('')

    if (nextMethod === 'moncash') {
      try {
        const [pref, cfg] = await Promise.all([
          backendJson<{ enabled: boolean; available: boolean }>('/api/organizer/payout-prefunding-status'),
          backendJson<{ allowInstantMoncash?: boolean }>('/api/organizer/payout-config-summary'),
        ])
        setPrefunding(pref)
        setAllowInstantMoncash(!!cfg?.allowInstantMoncash)
      } catch {
        setPrefunding(null)
        setAllowInstantMoncash(false)
      }
    }

    if (nextMethod === 'bank') {
      try {
        const data = await backendJson<{ destinations: BankDestination[] }>('/api/organizer/payout-destinations/bank')
        const destinations = data?.destinations || []
        setBankDestinations(destinations)

        const primary = destinations.find((d) => d.isPrimary)
        if (primary) {
          setBankMode('on_file')
          setSelectedBankDestinationId(primary.id)
        } else if (destinations.length > 0) {
          setBankMode('saved')
          setSelectedBankDestinationId(destinations[0].id)
        } else {
          setBankMode('new')
          setSelectedBankDestinationId('')
        }
      } catch (e: any) {
        setBankDestinations(null)
        setBankMode('new')
        setSelectedBankDestinationId('')
      }
    }
  }

  const sendOtp = async () => {
    setIsSendingCode(true)
    try {
      await backendJson('/api/organizer/payout-details-change/send-email-code', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      Alert.alert('Code sent', 'Check your email for the verification code.')
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to send code')
    } finally {
      setIsSendingCode(false)
    }
  }

  const verifyOtpThenRetry = async () => {
    if (!verificationCode.trim()) {
      Alert.alert('Enter code', 'Please enter the verification code from your email.')
      return
    }

    setIsVerifyingCode(true)
    try {
      await backendJson('/api/organizer/payout-details-change/verify-email-code', {
        method: 'POST',
        body: JSON.stringify({ code: verificationCode.trim() }),
      })

      setVerificationRequired(false)

      if (pendingEndpoint && pendingPayload) {
        await attemptWithdrawal(pendingEndpoint, pendingPayload)
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Verification failed')
    } finally {
      setIsVerifyingCode(false)
    }
  }

  const attemptWithdrawal = async (endpoint: string, payload: any) => {
    setSubmitting(true)
    try {
      const res = await backendJson<any>(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      // Success
      if (method === 'moncash' && res?.instant) {
        Alert.alert(
          'Instant MonCash sent',
          `Fee: ${formatCurrency(res?.feeCents || 0, currency)}\nYou received: ${formatCurrency(
            res?.payoutAmountCents || 0,
            currency
          )}`
        )
      } else {
        Alert.alert('Request submitted', 'Your withdrawal request was submitted successfully.')
      }

      setShowWithdraw(false)
      setMethod(null)
      await loadEarnings()
    } catch (e: any) {
      const message = e?.message || 'Failed to submit withdrawal'
      const requires = /verify|verification/i.test(message)

      if (requires) {
        setVerificationRequired(true)
        setPendingEndpoint(endpoint)
        setPendingPayload(payload)
        Alert.alert('Verification required', 'For your security, confirm this withdrawal change with a code we email you.')
        return
      }

      Alert.alert('Error', message)
    } finally {
      setSubmitting(false)
    }
  }

  const submit = async () => {
    if (!method) return

    if (!earnings) {
      Alert.alert('Unavailable', 'No earnings found for this event yet.')
      return
    }

    if (earnings?.settlementStatus !== 'ready') {
      Alert.alert('Not ready', 'Earnings are not yet available for withdrawal.')
      return
    }

    if (availableToWithdraw <= 0) {
      Alert.alert('Nothing to withdraw', 'No available balance to withdraw.')
      return
    }

    if (method === 'moncash') {
      if (!moncashNumber.trim()) {
        Alert.alert('Missing phone', 'Enter your MonCash phone number.')
        return
      }
      await attemptWithdrawal('/api/organizer/withdraw-moncash', {
        eventId,
        amount: availableToWithdraw,
        moncashNumber: moncashNumber.trim(),
      })
      return
    }

    // bank
    if (bankMode === 'new') {
      if (!bankDetails.accountHolder.trim() || !bankDetails.bankName.trim() || !bankDetails.accountNumber.trim()) {
        Alert.alert('Missing bank details', 'Account holder, bank name, and account number are required.')
        return
      }

      await attemptWithdrawal('/api/organizer/withdraw-bank', {
        eventId,
        amount: availableToWithdraw,
        bankDetails: {
          accountHolder: bankDetails.accountHolder.trim(),
          bankName: bankDetails.bankName.trim(),
          accountNumber: bankDetails.accountNumber.trim(),
          routingNumber: bankDetails.routingNumber.trim() || undefined,
          swiftCode: bankDetails.swiftCode.trim() || undefined,
        },
        saveDestination: saveNewBankDestination,
      })
      return
    }

    if (!selectedBankDestinationId) {
      Alert.alert('Select account', 'Please select a bank account.')
      return
    }

    await attemptWithdrawal('/api/organizer/withdraw-bank', {
      eventId,
      amount: availableToWithdraw,
      bankDestinationId: selectedBankDestinationId,
    })
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading earnings...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Event Earnings</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {eventTitle || eventId}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16 }}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Available to withdraw</Text>
          <Text style={styles.amountText}>{formatCurrency(availableToWithdraw, currency)}</Text>
          <View style={styles.rowBetween}>
            <Text style={styles.metaText}>Settlement</Text>
            <Text style={styles.metaText}>{String(earnings?.settlementStatus || 'pending')}</Text>
          </View>
        </View>

        <View style={{ height: 12 }} />

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: COLORS.primary }]}
          onPress={() => openWithdraw('moncash')}
          disabled={!earnings || earnings?.settlementStatus !== 'ready' || availableToWithdraw <= 0}
        >
          <Ionicons name="phone-portrait-outline" size={20} color={COLORS.white} />
          <Text style={styles.actionButtonText}>Withdraw via MonCash</Text>
        </TouchableOpacity>

        <View style={{ height: 12 }} />

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: COLORS.text }]}
          onPress={() => openWithdraw('bank')}
          disabled={!earnings || earnings?.settlementStatus !== 'ready' || availableToWithdraw <= 0}
        >
          <Ionicons name="business-outline" size={20} color={COLORS.white} />
          <Text style={styles.actionButtonText}>Withdraw to Bank</Text>
        </TouchableOpacity>

        {!earnings ? (
          <View style={styles.notice}>
            <Ionicons name="alert-circle-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.noticeText}>No earnings record found for this event yet.</Text>
          </View>
        ) : earnings?.settlementStatus !== 'ready' ? (
          <View style={styles.notice}>
            <Ionicons name="lock-closed-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.noticeText}>Earnings are not ready for withdrawal.</Text>
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={showWithdraw} transparent animationType="slide" onRequestClose={() => setShowWithdraw(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Request {method === 'moncash' ? 'MonCash' : 'Bank'} Withdrawal
              </Text>
              <TouchableOpacity onPress={() => setShowWithdraw(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.summaryBox}>
              <View style={styles.rowBetween}>
                <Text style={styles.metaText}>Amount</Text>
                <Text style={styles.metaText}>{formatCurrency(availableToWithdraw, currency)}</Text>
              </View>
              {method === 'moncash' && instantPreview ? (
                <>
                  <View style={styles.rowBetween}>
                    <Text style={styles.metaText}>Instant fee (3%)</Text>
                    <Text style={styles.metaText}>{formatCurrency(instantPreview.feeCents, currency)}</Text>
                  </View>
                  <View style={styles.rowBetween}>
                    <Text style={styles.metaText}>You receive</Text>
                    <Text style={styles.metaText}>{formatCurrency(instantPreview.payoutAmountCents, currency)}</Text>
                  </View>
                </>
              ) : null}
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              {verificationRequired ? (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.sectionTitle}>Verify</Text>
                  <Text style={styles.sectionHelp}>
                    For your security, verify this payout change with a code we email you.
                  </Text>
                  <View style={styles.rowBetween}>
                    <TouchableOpacity style={styles.secondaryButton} onPress={sendOtp} disabled={isSendingCode}>
                      <Text style={styles.secondaryButtonText}>{isSendingCode ? 'Sending...' : 'Send code'}</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                    placeholder="Enter code"
                    keyboardType="number-pad"
                    style={styles.input}
                  />
                  <TouchableOpacity
                    style={[styles.primaryButton, submitting || isVerifyingCode ? styles.buttonDisabled : null]}
                    onPress={verifyOtpThenRetry}
                    disabled={submitting || isVerifyingCode}
                  >
                    <Text style={styles.primaryButtonText}>{isVerifyingCode ? 'Verifying...' : 'Verify & continue'}</Text>
                  </TouchableOpacity>
                </View>
              ) : method === 'moncash' ? (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.sectionTitle}>MonCash</Text>
                  <TextInput
                    value={moncashNumber}
                    onChangeText={setMoncashNumber}
                    placeholder="+509 1234 5678"
                    keyboardType="phone-pad"
                    style={styles.input}
                  />
                  {instantPreview ? (
                    <Text style={styles.sectionHelp}>Instant MonCash is available for this withdrawal.</Text>
                  ) : (
                    <Text style={styles.sectionHelp}>Your withdrawal will be processed within 24 hours.</Text>
                  )}
                </View>
              ) : (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.sectionTitle}>Bank</Text>

                  <View style={styles.radioRow}>
                    <TouchableOpacity
                      style={[styles.radioChip, bankMode === 'on_file' ? styles.radioChipActive : null]}
                      onPress={() => setBankMode('on_file')}
                      disabled={!bankDestinations?.some((d) => d.isPrimary)}
                    >
                      <Text style={styles.radioChipText}>Bank on file</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.radioChip, bankMode === 'saved' ? styles.radioChipActive : null]}
                      onPress={() => setBankMode('saved')}
                      disabled={!bankDestinations || bankDestinations.length === 0}
                    >
                      <Text style={styles.radioChipText}>Saved</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.radioChip, bankMode === 'new' ? styles.radioChipActive : null]}
                      onPress={() => setBankMode('new')}
                    >
                      <Text style={styles.radioChipText}>New bank</Text>
                    </TouchableOpacity>
                  </View>

                  {bankMode !== 'new' ? (
                    <View style={{ marginTop: 10 }}>
                      {(bankDestinations || []).map((d) => (
                        <TouchableOpacity
                          key={d.id}
                          style={[styles.destinationRow, selectedBankDestinationId === d.id ? styles.destinationRowActive : null]}
                          onPress={() => setSelectedBankDestinationId(d.id)}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.destinationTitle}>
                              {d.bankName} ••••{d.accountNumberLast4}{d.isPrimary ? ' (Primary)' : ''}
                            </Text>
                            <Text style={styles.destinationSubtitle}>{d.accountName}</Text>
                          </View>
                          <Ionicons
                            name={selectedBankDestinationId === d.id ? 'checkmark-circle' : 'ellipse-outline'}
                            size={20}
                            color={selectedBankDestinationId === d.id ? COLORS.primary : COLORS.textSecondary}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <View style={{ marginTop: 10 }}>
                      <TextInput
                        value={bankDetails.accountHolder}
                        onChangeText={(v) => setBankDetails((s) => ({ ...s, accountHolder: v }))}
                        placeholder="Account holder"
                        style={styles.input}
                      />
                      <TextInput
                        value={bankDetails.bankName}
                        onChangeText={(v) => setBankDetails((s) => ({ ...s, bankName: v }))}
                        placeholder="Bank name"
                        style={styles.input}
                      />
                      <TextInput
                        value={bankDetails.accountNumber}
                        onChangeText={(v) => setBankDetails((s) => ({ ...s, accountNumber: v }))}
                        placeholder="Account number"
                        style={styles.input}
                      />
                      <TextInput
                        value={bankDetails.routingNumber}
                        onChangeText={(v) => setBankDetails((s) => ({ ...s, routingNumber: v }))}
                        placeholder="Routing number (optional)"
                        style={styles.input}
                      />
                      <TextInput
                        value={bankDetails.swiftCode}
                        onChangeText={(v) => setBankDetails((s) => ({ ...s, swiftCode: v }))}
                        placeholder="SWIFT (optional)"
                        style={styles.input}
                      />

                      <TouchableOpacity
                        style={styles.checkboxRow}
                        onPress={() => setSaveNewBankDestination((v) => !v)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={saveNewBankDestination ? 'checkbox' : 'square-outline'}
                          size={20}
                          color={saveNewBankDestination ? COLORS.primary : COLORS.textSecondary}
                        />
                        <Text style={styles.checkboxText}>Save as second bank account</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <Text style={styles.sectionHelp}>
                    Adding a new bank account may require email verification.
                  </Text>
                </View>
              )}
            </ScrollView>

            {!verificationRequired ? (
              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowWithdraw(false)} disabled={submitting}>
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, submitting ? styles.buttonDisabled : null]}
                  onPress={submit}
                  disabled={submitting}
                >
                  <Text style={styles.primaryButtonText}>{submitting ? 'Submitting...' : 'Confirm'}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    padding: 6,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: COLORS.white,
    opacity: 0.9,
  },
  scroll: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.textSecondary,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
  },
  cardLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  amountText: {
    marginTop: 8,
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.text,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  metaText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  actionButton: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  actionButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 15,
  },
  notice: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noticeText: {
    color: COLORS.textSecondary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  summaryBox: {
    marginTop: 12,
    backgroundColor: '#F5F6F8',
    borderRadius: 12,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  sectionHelp: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E1E4E8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    color: COLORS.text,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#EEF1F4',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  radioRow: {
    flexDirection: 'row',
    gap: 8,
  },
  radioChip: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#EEF1F4',
  },
  radioChipActive: {
    backgroundColor: '#D9F2EF',
  },
  radioChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1E4E8',
    marginBottom: 8,
  },
  destinationRowActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#F2FBFA',
  },
  destinationTitle: {
    fontWeight: '700',
    color: COLORS.text,
  },
  destinationSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  checkboxText: {
    color: COLORS.text,
    fontWeight: '600',
  },
})
