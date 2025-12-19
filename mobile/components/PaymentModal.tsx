import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Linking,
  Platform,
  TextInput,
} from 'react-native';
import { X, CreditCard, Lock, Smartphone, AlertCircle } from 'lucide-react-native';
import { COLORS } from '../config/brand';

// Check if we're in Expo Go (Stripe won't work)
const isExpoGo = !(Platform as any).constants?.expoConfig;

// Conditionally import Stripe only if not in Expo Go
let StripeProvider: any;
let useStripe: any;
let CardField: any;

if (!isExpoGo) {
  try {
    const stripe = require('@stripe/stripe-react-native');
    StripeProvider = stripe.StripeProvider;
    useStripe = stripe.useStripe;
    CardField = stripe.CardField;
  } catch (error) {
    console.warn('Stripe SDK not available in Expo Go');
  }
}

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!;
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  userId: string;
  quantity: number;
  totalAmount: number;
  currency: string;
  tierId?: string;
  promoCodeId?: string;
  onSuccess: (paymentMethod: string, transactionId: string) => void;
}

function PaymentForm({
  eventId,
  eventTitle,
  userId,
  quantity,
  totalAmount,
  currency,
  tierId,
  promoCodeId,
  onSuccess,
  onClose,
}: Omit<PaymentModalProps, 'visible'>) {
  // Only use Stripe hooks if available
  const stripeHooks = useStripe ? useStripe() : { confirmPayment: null, handleCardAction: null };
  const { confirmPayment, handleCardAction } = stripeHooks;
  
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Default to MonCash if Stripe not available (Expo Go)
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'moncash' | 'natcash'>(
    isExpoGo || !StripeProvider ? 'moncash' : 'stripe'
  );
  const [cardComplete, setCardComplete] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');

  // Stripe Payment
  const handleStripePayment = async () => {
    setProcessing(true);
    setError(null);

    try {
      // Step 1: Create payment intent from your backend
      const response = await fetch(`${API_URL}/api/create-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          quantity,
          tierId,
          promoCodeId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize payment');
      }

      // Step 2: Confirm payment with Stripe
      const { error: confirmError, paymentIntent } = await confirmPayment(data.clientSecret, {
        paymentMethodType: 'Card',
      });

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      if (paymentIntent?.status === 'Succeeded') {
        // Step 3: Create tickets (backend will handle this via webhook, but we can also confirm here)
        onSuccess('stripe', paymentIntent.id);
        Alert.alert('Success', 'Payment successful! Your tickets have been created.');
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // MonCash Payment (Haiti Mobile Money) - MerchantApi
  const handleMonCashPayment = async () => {
    setProcessing(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/moncash-button/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          quantity,
          tierId,
          promoCode: promoCodeId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate MonCash payment');
      }

      if (!data.redirectUrl) {
        throw new Error('Missing MonCash redirect URL');
      }

      await Linking.openURL(data.redirectUrl);
      Alert.alert('Continue in Browser', 'Complete the MonCash payment in your browser. After payment, return to the app and check your Tickets.');
      onClose();
    } catch (err: any) {
      setError(err.message || 'MonCash payment failed');
      setProcessing(false);
    }
  };

  // NatCash Payment (same backend as MonCash MerchantApi)
  const handleNatCashPayment = async () => {
    setProcessing(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/moncash-button/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          quantity,
          tierId,
          promoCode: promoCodeId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate NatCash payment');
      }

      if (!data.redirectUrl) {
        throw new Error('Missing MonCash redirect URL');
      }

      await Linking.openURL(data.redirectUrl);
      Alert.alert('Continue in Browser', 'Complete the NatCash/MonCash payment in your browser. After payment, return to the app and check your Tickets.');
      onClose();
    } catch (err: any) {
      setError(err.message || 'NatCash payment failed');
      setProcessing(false);
    }
  };

  const handlePayment = () => {
    if (paymentMethod === 'stripe') {
      handleStripePayment();
    } else if (paymentMethod === 'moncash') {
      handleMonCashPayment();
    } else if (paymentMethod === 'natcash') {
      handleNatCashPayment();
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Complete Payment</Text>
          <Text style={styles.headerSubtitle}>
            {quantity}x {eventTitle}
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Payment Method Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Payment Method</Text>

          {/* Stripe Card Payment - Only show if Stripe is available */}
          {!isExpoGo && StripeProvider && (
            <TouchableOpacity
              style={[
                styles.methodButton,
                paymentMethod === 'stripe' && styles.methodButtonActive,
              ]}
              onPress={() => setPaymentMethod('stripe')}
            >
              <View style={styles.methodIcon}>
                <CreditCard size={24} color={paymentMethod === 'stripe' ? COLORS.primary : COLORS.textSecondary} />
              </View>
              <View style={styles.methodContent}>
                <Text style={styles.methodTitle}>Credit/Debit Card</Text>
                <Text style={styles.methodSubtitle}>Visa, Mastercard, Amex</Text>
              </View>
            </TouchableOpacity>
          )}
          
          {/* Show message if in Expo Go */}
          {isExpoGo && (
            <View style={styles.expoGoWarning}>
              <AlertCircle size={18} color={COLORS.warning} />
              <Text style={styles.expoGoWarningText}>
                Credit card payments require a development build. Use MonCash or NatCash to test in Expo Go.
              </Text>
            </View>
          )}

          {/* MonCash */}
          <TouchableOpacity
            style={[
              styles.methodButton,
              paymentMethod === 'moncash' && styles.methodButtonActive,
            ]}
            onPress={() => setPaymentMethod('moncash')}
          >
            <View style={styles.methodIcon}>
              <Smartphone size={24} color={paymentMethod === 'moncash' ? COLORS.primary : COLORS.textSecondary} />
            </View>
            <View style={styles.methodContent}>
              <Text style={styles.methodTitle}>MonCash</Text>
              <Text style={styles.methodSubtitle}>Haiti Mobile Money 🇭🇹</Text>
            </View>
          </TouchableOpacity>

          {/* NatCash */}
          <TouchableOpacity
            style={[
              styles.methodButton,
              paymentMethod === 'natcash' && styles.methodButtonActive,
            ]}
            onPress={() => setPaymentMethod('natcash')}
          >
            <View style={styles.methodIcon}>
              <Smartphone size={24} color={paymentMethod === 'natcash' ? COLORS.primary : COLORS.textSecondary} />
            </View>
            <View style={styles.methodContent}>
              <Text style={styles.methodTitle}>NatCash</Text>
              <Text style={styles.methodSubtitle}>Haiti Mobile Money 🇭🇹</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Stripe Card Input */}
        {paymentMethod === 'stripe' && CardField && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Card Details</Text>
            <CardField
              postalCodeEnabled={false}
              placeholder={{
                number: '4242 4242 4242 4242',
              }}
              cardStyle={styles.cardInput}
              style={styles.cardFieldContainer}
              onCardChange={(cardDetails: any) => {
                setCardComplete(cardDetails.complete);
              }}
            />
            <View style={styles.testCardHint}>
              <AlertCircle size={14} color={COLORS.textSecondary} />
              <Text style={styles.testCardHintText}>
                Test card: 4242 4242 4242 4242
              </Text>
            </View>
          </View>
        )}

        {/* Phone Number Input for Mobile Money */}
        {(paymentMethod === 'moncash' || paymentMethod === 'natcash') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {paymentMethod === 'moncash' ? 'MonCash' : 'NatCash'} Phone Number
            </Text>
            <TextInput
              style={styles.phoneInput}
              placeholder="e.g., 50938662809"
              placeholderTextColor={COLORS.textSecondary}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              maxLength={11}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.infoBox}>
              <AlertCircle size={18} color={COLORS.primary} />
              <Text style={styles.infoText}>
                A payment request will be sent to your {paymentMethod === 'moncash' ? 'MonCash' : 'NatCash'} phone.
                Please approve it to complete your purchase.
              </Text>
            </View>
          </View>
        )}

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Total Amount */}
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalAmount}>
            {currency} {totalAmount.toLocaleString()}
          </Text>
        </View>

        {/* Security Badge */}
        <View style={styles.securityBadge}>
          <Lock size={14} color={COLORS.textSecondary} />
          <Text style={styles.securityText}>Secured by Stripe & MonCash</Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onClose}
          disabled={processing}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.payButton,
            (processing || (paymentMethod === 'stripe' && !cardComplete)) && styles.payButtonDisabled,
          ]}
          onPress={handlePayment}
          disabled={processing || (paymentMethod === 'stripe' && !cardComplete)}
        >
          {processing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.payButtonText}>
              Pay {currency} {totalAmount.toLocaleString()}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function PaymentModal(props: PaymentModalProps) {
  // If in Expo Go or Stripe not available, render without StripeProvider
  if (isExpoGo || !StripeProvider) {
    return (
      <Modal
        visible={props.visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={props.onClose}
      >
        <PaymentForm {...props} />
      </Modal>
    );
  }

  if (!STRIPE_PUBLISHABLE_KEY) {
    return (
      <Modal
        visible={props.visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={props.onClose}
      >
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <AlertCircle size={48} color={COLORS.error} />
            <Text style={styles.errorText}>
              Stripe is not configured. Please add EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY to your .env file.
            </Text>
            <TouchableOpacity style={styles.payButton} onPress={props.onClose}>
              <Text style={styles.payButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={props.visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={props.onClose}
    >
      <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
        <PaymentForm {...props} />
      </StripeProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  methodButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0FDFA',
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  methodContent: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  methodSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  cardFieldContainer: {
    height: 50,
    marginBottom: 8,
  },
  cardInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 8,
  },
  phoneInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  testCardHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  testCardHintText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  errorContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
  },
  totalContainer: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    marginBottom: 24,
  },
  securityText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  payButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonDisabled: {
    opacity: 0.5,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  expoGoWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
    marginBottom: 12,
  },
  expoGoWarningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
});
