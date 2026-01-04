import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import * as ImagePicker from 'expo-image-picker'
import { doc, getDoc, setDoc } from 'firebase/firestore'

import { COLORS } from '../../config/brand'
import { db } from '../../config/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import { backendFetch, backendJson } from '../../lib/api/backend'

type VerificationStatus = 'pending' | 'verified' | 'failed'

type HaitiPayoutProfile = {
  status?: 'not_setup' | 'pending_verification' | 'active' | 'on_hold'
  method?: 'bank_transfer' | 'mobile_money'
  allowInstantMoncash?: boolean
  bankDetails?: {
    accountName: string
    accountNumberLast4?: string
    bankName: string
    routingNumber?: string
    swift?: string
    iban?: string
  }
  mobileMoneyDetails?: {
    provider: string
    phoneNumber: string
    accountName: string
    phoneNumberLast4?: string
  }
  verificationStatus?: {
    identity?: VerificationStatus
    bank?: VerificationStatus
    phone?: VerificationStatus
  }
}

export default function OrganizerPayoutSettingsScreen() {
  const navigation = useNavigation<any>()
  const insets = useSafeAreaInsets()
  const { t } = useI18n()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<HaitiPayoutProfile | null>(null)

  const [method, setMethod] = useState<'bank_transfer' | 'mobile_money'>('bank_transfer')

  const [bankForm, setBankForm] = useState({
    accountName: '',
    bankName: '',
    accountNumber: '',
    routingNumber: '',
    swift: '',
  })

  const [mobileMoneyForm, setMobileMoneyForm] = useState({
    provider: 'moncash',
    accountName: '',
    phoneNumber: '',
  })

  const [phoneCode, setPhoneCode] = useState('')
  const [sendingPhoneCode, setSendingPhoneCode] = useState(false)
  const [verifyingPhoneCode, setVerifyingPhoneCode] = useState(false)

  const [bankVerificationType, setBankVerificationType] = useState<'bank_statement' | 'void_check' | 'utility_bill'>(
    'bank_statement'
  )
  const [bankProofAsset, setBankProofAsset] = useState<ImagePicker.ImagePickerAsset | null>(null)
  const [submittingBankProof, setSubmittingBankProof] = useState(false)

  const identityStatus = profile?.verificationStatus?.identity || 'pending'
  const bankStatus = profile?.verificationStatus?.bank || 'pending'
  const phoneStatus = profile?.verificationStatus?.phone || 'pending'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      let next: HaitiPayoutProfile | null = null

      try {
        const res = await backendFetch('/api/organizer/payout-profiles/haiti')
        const raw = await res.text().catch(() => '')
        const data = (() => {
          try {
            return raw ? (JSON.parse(raw) as any) : {}
          } catch {
            return {}
          }
        })()

        if (res.ok) {
          next = (data?.profile || null) as HaitiPayoutProfile | null
        } else {
          const message = String(data?.error || data?.message || `Request failed (${res.status})`)
          throw new Error(message)
        }
      } catch (e: any) {
        const message = String(e?.message || '')
        const isMissingEndpoint =
          message.includes('Request failed (404)') ||
          message.includes('Request failed (405)') ||
          message.includes('/api/organizer/payout-profiles/haiti')

        if (isMissingEndpoint && user?.uid) {
          const snap = await getDoc(doc(db, 'organizers', user.uid, 'payoutProfiles', 'haiti'))
          next = snap.exists() ? ((snap.data() as any) as HaitiPayoutProfile) : null
        } else {
          throw e
        }
      }

      setProfile(next)

      const nextMethod = (next?.method === 'mobile_money' ? 'mobile_money' : 'bank_transfer') as
        | 'bank_transfer'
        | 'mobile_money'
      setMethod(nextMethod)

      setBankForm((prev) => ({
        ...prev,
        accountName: next?.bankDetails?.accountName || prev.accountName,
        bankName: next?.bankDetails?.bankName || prev.bankName,
        routingNumber: next?.bankDetails?.routingNumber || prev.routingNumber,
        swift: next?.bankDetails?.swift || prev.swift,
        // Never prefill account number.
        accountNumber: '',
      }))

      setMobileMoneyForm((prev) => ({
        ...prev,
        provider: next?.mobileMoneyDetails?.provider || prev.provider,
        accountName: next?.mobileMoneyDetails?.accountName || prev.accountName,
        phoneNumber: next?.mobileMoneyDetails?.phoneNumber || prev.phoneNumber,
      }))
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message || 'Failed to load payout settings')
    } finally {
      setLoading(false)
    }
  }, [t, user?.uid])

  useEffect(() => {
    load()
  }, [load])

  const save = useCallback(async () => {
    setSaving(true)
    try {
      const tryBackend = async () => {
        if (method === 'bank_transfer') {
          const res = await backendFetch('/api/organizer/payout-profiles/haiti', {
            method: 'POST',
            body: JSON.stringify({
              method: 'bank_transfer',
              bankDetails: {
                accountName: bankForm.accountName.trim(),
                bankName: bankForm.bankName.trim(),
                accountNumber: bankForm.accountNumber.trim(),
                routingNumber: bankForm.routingNumber.trim() || undefined,
                swift: bankForm.swift.trim() || undefined,
              },
            }),
          })

          if (!res.ok) {
            const raw = await res.text().catch(() => '')
            const data = (() => {
              try {
                return raw ? (JSON.parse(raw) as any) : {}
              } catch {
                return {}
              }
            })()
            throw new Error(String(data?.error || data?.message || `Request failed (${res.status})`))
          }
          return
        }

        const res = await backendFetch('/api/organizer/payout-profiles/haiti', {
          method: 'POST',
          body: JSON.stringify({
            method: 'mobile_money',
            mobileMoneyDetails: {
              provider: mobileMoneyForm.provider,
              accountName: mobileMoneyForm.accountName.trim(),
              phoneNumber: mobileMoneyForm.phoneNumber.trim(),
            },
          }),
        })

        if (!res.ok) {
          const raw = await res.text().catch(() => '')
          const data = (() => {
            try {
              return raw ? (JSON.parse(raw) as any) : {}
            } catch {
              return {}
            }
          })()
          throw new Error(String(data?.error || data?.message || `Request failed (${res.status})`))
        }
      }

      try {
        await tryBackend()
      } catch (e: any) {
        const message = String(e?.message || '')
        const isMissingEndpoint =
          message.includes('Request failed (404)') ||
          message.includes('Request failed (405)') ||
          message.includes('/api/organizer/payout-profiles/haiti')

        if (!isMissingEndpoint) throw e
        if (!user?.uid) throw new Error('Not signed in')

        const now = new Date().toISOString()

        if (method === 'bank_transfer') {
          const rawAccount = bankForm.accountNumber.trim()
          const last4 = rawAccount ? rawAccount.slice(-4) : ''
          const masked = last4 ? `****${last4}` : ''

          await setDoc(
            doc(db, 'organizers', user.uid, 'payoutProfiles', 'haiti'),
            {
              method: 'bank_transfer',
              status: 'pending_verification',
              bankDetails: {
                accountName: bankForm.accountName.trim(),
                bankName: bankForm.bankName.trim(),
                accountNumber: masked,
                routingNumber: bankForm.routingNumber.trim() || null,
                swift: bankForm.swift.trim() || null,
              },
              updatedAt: now,
              createdAt: now,
            },
            { merge: true }
          )
        } else {
          const rawPhone = mobileMoneyForm.phoneNumber.trim()
          const last4 = rawPhone ? rawPhone.slice(-4) : ''
          const masked = last4 ? `****${last4}` : ''

          await setDoc(
            doc(db, 'organizers', user.uid, 'payoutProfiles', 'haiti'),
            {
              method: 'mobile_money',
              status: 'pending_verification',
              mobileMoneyDetails: {
                provider: mobileMoneyForm.provider,
                accountName: mobileMoneyForm.accountName.trim(),
                phoneNumber: masked,
              },
              updatedAt: now,
              createdAt: now,
            },
            { merge: true }
          )
        }
      }

      Alert.alert('Saved', 'Your payout settings were saved.')
      await load()
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message || 'Failed to save payout settings')
    } finally {
      setSaving(false)
    }
  }, [bankForm, load, method, mobileMoneyForm, t, user?.uid])

  const statusLabel = useMemo(() => {
    const s = profile?.status || 'not_setup'
    if (s === 'active') return 'Active'
    if (s === 'pending_verification') return 'Pending verification'
    if (s === 'on_hold') return 'On hold'
    return 'Not set up'
  }, [profile?.status])

  const pickBankProof = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (perm.status !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo library access to upload a bank document.')
      return
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    })

    if (res.canceled) return
    const asset = res.assets?.[0]
    if (asset) setBankProofAsset(asset)
  }, [])

  const submitBankVerification = useCallback(async () => {
    if (!bankProofAsset?.uri) {
      Alert.alert('Missing document', 'Please select a document photo first.')
      return
    }

    setSubmittingBankProof(true)
    try {
      const uri = bankProofAsset.uri
      const name = bankProofAsset.fileName || `bank-proof-${Date.now()}.jpg`
      const type = bankProofAsset.mimeType || 'image/jpeg'

      const form = new FormData()
      form.append('verificationType', bankVerificationType)
      form.append('destinationId', 'bank_primary')
      form.append('proofDocument', { uri, name, type } as any)

      const res = await backendFetch('/api/organizer/submit-bank-verification', {
        method: 'POST',
        body: form as any,
        headers: {},
      })

      const raw = await res.text().catch(() => '')
      const data = (() => {
        try {
          return JSON.parse(raw)
        } catch {
          return {}
        }
      })()

      if (!res.ok) {
        throw new Error(data?.error || data?.message || `Request failed (${res.status})`)
      }

      Alert.alert('Submitted', 'Bank verification submitted. Awaiting admin review.')
      setBankProofAsset(null)
      await load()
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message || 'Failed to submit bank verification')
    } finally {
      setSubmittingBankProof(false)
    }
  }, [bankProofAsset, bankVerificationType, load, t])

  const sendPhoneVerificationCode = useCallback(async () => {
    setSendingPhoneCode(true)
    try {
      const res = await backendJson<any>('/api/organizer/send-phone-verification-code', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const debugCode = res?.debugCode
      if (debugCode) {
        Alert.alert('Code sent (dev)', `Enter this code: ${debugCode}`)
      } else {
        Alert.alert('Code sent', 'Check your phone for the verification code.')
      }
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message || 'Failed to send code')
    } finally {
      setSendingPhoneCode(false)
    }
  }, [t])

  const verifyPhoneCode = useCallback(async () => {
    if (!phoneCode.trim()) {
      Alert.alert('Enter code', 'Please enter the 6-digit code.')
      return
    }

    setVerifyingPhoneCode(true)
    try {
      await backendJson('/api/organizer/submit-phone-verification', {
        method: 'POST',
        body: JSON.stringify({ verificationCode: phoneCode.trim() }),
      })
      Alert.alert('Verified', 'Your phone number has been verified.')
      setPhoneCode('')
      await load()
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message || 'Failed to verify code')
    } finally {
      setVerifyingPhoneCode(false)
    }
  }, [load, phoneCode, t])

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading payout settings…</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payout Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Status</Text>
          <Text style={styles.metaText}>{statusLabel}</Text>

          <View style={{ height: 10 }} />
          <Text style={styles.cardTitle}>Verification</Text>
          <Text style={styles.metaText}>Identity: {identityStatus}</Text>
          <Text style={styles.metaText}>Bank: {bankStatus}</Text>
          <Text style={styles.metaText}>Phone: {phoneStatus}</Text>

          <View style={{ height: 12 }} />
          <TouchableOpacity
            style={[styles.secondaryButton]}
            onPress={() => navigation.navigate('OrganizerVerification')}
          >
            <Text style={styles.secondaryButtonText}>Complete identity verification</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 12 }} />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payout method</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.chip, method === 'bank_transfer' ? styles.chipActive : null]}
              onPress={() => setMethod('bank_transfer')}
            >
              <Text style={[styles.chipText, method === 'bank_transfer' ? styles.chipTextActive : null]}>Bank</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, method === 'mobile_money' ? styles.chipActive : null]}
              onPress={() => setMethod('mobile_money')}
            >
              <Text style={[styles.chipText, method === 'mobile_money' ? styles.chipTextActive : null]}>Mobile money</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 12 }} />

          {method === 'bank_transfer' ? (
            <>
              <Text style={styles.label}>Account holder name</Text>
              <TextInput
                style={styles.input}
                value={bankForm.accountName}
                onChangeText={(v) => setBankForm((s) => ({ ...s, accountName: v }))}
                placeholder="Full legal name"
                placeholderTextColor={COLORS.textSecondary}
              />

              <Text style={styles.label}>Bank name</Text>
              <TextInput
                style={styles.input}
                value={bankForm.bankName}
                onChangeText={(v) => setBankForm((s) => ({ ...s, bankName: v }))}
                placeholder="Your bank"
                placeholderTextColor={COLORS.textSecondary}
              />

              <Text style={styles.label}>Account number</Text>
              <TextInput
                style={styles.input}
                value={bankForm.accountNumber}
                onChangeText={(v) => setBankForm((s) => ({ ...s, accountNumber: v }))}
                placeholder="Account number"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="number-pad"
              />

              <Text style={styles.label}>Routing number (optional)</Text>
              <TextInput
                style={styles.input}
                value={bankForm.routingNumber}
                onChangeText={(v) => setBankForm((s) => ({ ...s, routingNumber: v }))}
                placeholder="Routing number"
                placeholderTextColor={COLORS.textSecondary}
              />

              <Text style={styles.label}>SWIFT (optional)</Text>
              <TextInput
                style={styles.input}
                value={bankForm.swift}
                onChangeText={(v) => setBankForm((s) => ({ ...s, swift: v }))}
                placeholder="SWIFT"
                placeholderTextColor={COLORS.textSecondary}
                autoCapitalize="characters"
              />
            </>
          ) : (
            <>
              <Text style={styles.label}>Provider</Text>
              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.chip, mobileMoneyForm.provider === 'moncash' ? styles.chipActive : null]}
                  onPress={() => setMobileMoneyForm((s) => ({ ...s, provider: 'moncash' }))}
                >
                  <Text style={[styles.chipText, mobileMoneyForm.provider === 'moncash' ? styles.chipTextActive : null]}>MonCash</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, mobileMoneyForm.provider === 'natcash' ? styles.chipActive : null]}
                  onPress={() => setMobileMoneyForm((s) => ({ ...s, provider: 'natcash' }))}
                >
                  <Text style={[styles.chipText, mobileMoneyForm.provider === 'natcash' ? styles.chipTextActive : null]}>NatCash</Text>
                </TouchableOpacity>
              </View>

              <View style={{ height: 12 }} />

              <Text style={styles.label}>Account name</Text>
              <TextInput
                style={styles.input}
                value={mobileMoneyForm.accountName}
                onChangeText={(v) => setMobileMoneyForm((s) => ({ ...s, accountName: v }))}
                placeholder="Full legal name"
                placeholderTextColor={COLORS.textSecondary}
              />

              <Text style={styles.label}>Phone number</Text>
              <TextInput
                style={styles.input}
                value={mobileMoneyForm.phoneNumber}
                onChangeText={(v) => setMobileMoneyForm((s) => ({ ...s, phoneNumber: v }))}
                placeholder="+509..."
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="phone-pad"
              />
            </>
          )}

          <View style={{ height: 14 }} />

          <TouchableOpacity
            style={[styles.primaryButton, saving ? styles.primaryButtonDisabled : null]}
            onPress={save}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.primaryButtonText}>Save</Text>}
          </TouchableOpacity>
        </View>

        {method === 'mobile_money' ? (
          <>
            <View style={{ height: 12 }} />
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Phone verification</Text>
              <Text style={styles.metaText}>Status: {phoneStatus}</Text>

              <View style={{ height: 10 }} />
              <TouchableOpacity
                style={[styles.secondaryButton, sendingPhoneCode ? styles.primaryButtonDisabled : null]}
                onPress={sendPhoneVerificationCode}
                disabled={sendingPhoneCode}
              >
                {sendingPhoneCode ? (
                  <ActivityIndicator color={COLORS.primary} />
                ) : (
                  <Text style={styles.secondaryButtonText}>Send code</Text>
                )}
              </TouchableOpacity>

              <View style={{ height: 10 }} />
              <TextInput
                style={styles.input}
                value={phoneCode}
                onChangeText={setPhoneCode}
                placeholder="6-digit code"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="number-pad"
              />
              <TouchableOpacity
                style={[styles.primaryButton, verifyingPhoneCode ? styles.primaryButtonDisabled : null]}
                onPress={verifyPhoneCode}
                disabled={verifyingPhoneCode}
              >
                {verifyingPhoneCode ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>Verify</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : null}

        {method === 'bank_transfer' ? (
          <>
            <View style={{ height: 12 }} />
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Bank verification</Text>
              <Text style={styles.metaText}>Status: {bankStatus}</Text>
              <Text style={styles.metaHint}>
                Upload a bank statement or void check. This will be reviewed by an admin.
              </Text>

              <View style={{ height: 10 }} />
              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.chip, bankVerificationType === 'bank_statement' ? styles.chipActive : null]}
                  onPress={() => setBankVerificationType('bank_statement')}
                >
                  <Text style={[styles.chipText, bankVerificationType === 'bank_statement' ? styles.chipTextActive : null]}>Statement</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, bankVerificationType === 'void_check' ? styles.chipActive : null]}
                  onPress={() => setBankVerificationType('void_check')}
                >
                  <Text style={[styles.chipText, bankVerificationType === 'void_check' ? styles.chipTextActive : null]}>Void check</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, bankVerificationType === 'utility_bill' ? styles.chipActive : null]}
                  onPress={() => setBankVerificationType('utility_bill')}
                >
                  <Text style={[styles.chipText, bankVerificationType === 'utility_bill' ? styles.chipTextActive : null]}>Utility bill</Text>
                </TouchableOpacity>
              </View>

              <View style={{ height: 10 }} />
              <TouchableOpacity style={styles.secondaryButton} onPress={pickBankProof}>
                <Text style={styles.secondaryButtonText}>
                  {bankProofAsset ? 'Change document' : 'Choose document photo'}
                </Text>
              </TouchableOpacity>

              <View style={{ height: 10 }} />
              <TouchableOpacity
                style={[styles.primaryButton, submittingBankProof ? styles.primaryButtonDisabled : null]}
                onPress={submitBankVerification}
                disabled={submittingBankProof}
              >
                {submittingBankProof ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>Submit for review</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : null}

        <View style={{ height: 20 }} />
        <Text style={styles.metaHint}>
          Note: Withdrawals require identity + payout method verification to be approved.
        </Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  metaText: {
    marginTop: 6,
    color: COLORS.textSecondary,
  },
  metaHint: {
    marginTop: 8,
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.borderLight,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
  },
  chipText: {
    color: COLORS.text,
    fontWeight: '600',
  },
  chipTextActive: {
    color: COLORS.white,
  },
  label: {
    marginTop: 10,
    marginBottom: 6,
    color: COLORS.text,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: COLORS.borderLight,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontWeight: '700',
  },
})
