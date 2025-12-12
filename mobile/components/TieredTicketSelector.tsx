import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { X, Check, Minus, Plus, Tag } from 'lucide-react-native';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

interface TicketTier {
  id: string;
  name: string;
  description: string | null;
  price: number;
  total_quantity: number;
  sold_quantity: number;
  sales_start: string | null;
  sales_end: string | null;
}

interface GroupDiscount {
  id: string;
  min_quantity: number;
  discount_percentage: number;
  is_active: boolean;
}

interface PromoCodeValidation {
  valid: boolean;
  discount_percentage?: number;
  discount_amount?: number;
  error?: string;
}

interface TieredTicketSelectorProps {
  eventId: string;
  visible: boolean;
  onClose: () => void;
  onPurchase: (tierId: string, finalPrice: number, quantity: number, promoCode?: string) => void;
}

const COLORS = {
  primary: '#000000',
  secondary: '#666666',
  background: '#F5F5F5',
  white: '#FFFFFF',
  border: '#E0E0E0',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
};

export default function TieredTicketSelector({
  eventId,
  visible,
  onClose,
  onPurchase,
}: TieredTicketSelectorProps) {
  const [tiers, setTiers] = useState<TicketTier[]>([]);
  const [groupDiscounts, setGroupDiscounts] = useState<GroupDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [promoCode, setPromoCode] = useState('');
  const [promoValidation, setPromoValidation] = useState<PromoCodeValidation | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchTiers();
      fetchGroupDiscounts();
    }
  }, [visible, eventId]);

  const fetchTiers = async () => {
    try {
      setLoading(true);
      console.log('[TieredTicketSelector] Fetching tiers for event:', eventId);
      
      const tiersQuery = query(
        collection(db, 'ticket_tiers'),
        where('event_id', '==', eventId),
        orderBy('sort_order', 'asc')
      );
      
      const tiersSnapshot = await getDocs(tiersQuery);
      const tiersData = tiersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as TicketTier[];
      
      console.log('[TieredTicketSelector] Fetched tiers:', tiersData.length);
      setTiers(tiersData);
      
      // Auto-select first available tier
      const availableTier = tiersData.find((t: TicketTier) => isTierAvailable(t));
      if (availableTier) {
        setSelectedTierId(availableTier.id);
      }
    } catch (error) {
      console.error('[TieredTicketSelector] Error fetching tiers:', error);
      // Set empty tiers on error so modal still shows
      setTiers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupDiscounts = async () => {
    try {
      console.log('[TieredTicketSelector] Fetching group discounts for event:', eventId);
      
      const discountsQuery = query(
        collection(db, 'group_discounts'),
        where('event_id', '==', eventId),
        where('is_active', '==', true)
      );
      
      const discountsSnapshot = await getDocs(discountsQuery);
      const discountsData = discountsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as GroupDiscount[];
      
      console.log('[TieredTicketSelector] Fetched group discounts:', discountsData.length);
      setGroupDiscounts(discountsData);
    } catch (error) {
      console.error('[TieredTicketSelector] Error fetching group discounts:', error);
    }
  };

  const validatePromoCode = async () => {
    if (!promoCode.trim()) {
      setPromoValidation(null);
      return;
    }

    setValidatingPromo(true);
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(
        `${apiUrl}/api/promo-codes?eventId=${eventId}&code=${encodeURIComponent(promoCode)}`
      );
      const data = await response.json();
      
      setPromoValidation(data);
    } catch (error) {
      console.error('Error validating promo code:', error);
      setPromoValidation({ valid: false, error: 'Failed to validate promo code' });
    } finally {
      setValidatingPromo(false);
    }
  };

  const isTierAvailable = (tier: TicketTier): boolean => {
    const now = new Date();
    
    // Check sales period
    if (tier.sales_start && new Date(tier.sales_start) > now) {
      return false;
    }
    if (tier.sales_end && new Date(tier.sales_end) < now) {
      return false;
    }
    
    // Check availability
    const available = tier.total_quantity - tier.sold_quantity;
    return available > 0;
  };

  const getAvailableQuantity = (tier: TicketTier): number => {
    return tier.total_quantity - tier.sold_quantity;
  };

  const getApplicableGroupDiscount = (): GroupDiscount | null => {
    if (promoValidation?.valid) {
      return null; // Don't apply group discount if promo code is used
    }
    
    const applicable = groupDiscounts
      .filter(d => d.min_quantity <= quantity)
      .sort((a, b) => b.discount_percentage - a.discount_percentage);
    
    return applicable[0] || null;
  };

  const calculateFinalPrice = (): number => {
    const selectedTier = tiers.find(t => t.id === selectedTierId);
    if (!selectedTier) return 0;
    
    let basePrice = selectedTier.price * quantity;
    
    // Apply promo code discount first
    if (promoValidation?.valid) {
      if (promoValidation.discount_percentage) {
        basePrice = basePrice * (1 - promoValidation.discount_percentage / 100);
      } else if (promoValidation.discount_amount) {
        basePrice = Math.max(0, basePrice - promoValidation.discount_amount);
      }
    }
    // Apply group discount if no promo
    else {
      const groupDiscount = getApplicableGroupDiscount();
      if (groupDiscount) {
        basePrice = basePrice * (1 - groupDiscount.discount_percentage / 100);
      }
    }
    
    return Math.round(basePrice * 100) / 100;
  };

  const handleQuantityChange = (delta: number) => {
    const selectedTier = tiers.find(t => t.id === selectedTierId);
    if (!selectedTier) return;
    
    const available = getAvailableQuantity(selectedTier);
    const newQuantity = Math.max(1, Math.min(quantity + delta, available, 10));
    setQuantity(newQuantity);
  };

  const handlePurchase = () => {
    if (!selectedTierId) return;
    
    const finalPrice = calculateFinalPrice();
    onPurchase(selectedTierId, finalPrice, quantity, promoCode || undefined);
    
    // Reset state
    setSelectedTierId(null);
    setQuantity(1);
    setPromoCode('');
    setPromoValidation(null);
  };

  const selectedTier = tiers.find(t => t.id === selectedTierId);
  const groupDiscount = getApplicableGroupDiscount();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Select Tickets</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Tier Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Choose Tier</Text>
              {tiers.map(tier => {
                const available = getAvailableQuantity(tier);
                const isAvailable = isTierAvailable(tier);
                const isSelected = selectedTierId === tier.id;
                
                return (
                  <TouchableOpacity
                    key={tier.id}
                    style={[
                      styles.tierCard,
                      isSelected && styles.tierCardSelected,
                      !isAvailable && styles.tierCardDisabled,
                    ]}
                    onPress={() => isAvailable && setSelectedTierId(tier.id)}
                    disabled={!isAvailable}
                  >
                    <View style={styles.tierHeader}>
                      <View style={styles.tierTitleRow}>
                        <Text style={[
                          styles.tierName,
                          !isAvailable && styles.tierNameDisabled
                        ]}>
                          {tier.name}
                        </Text>
                        {isSelected && (
                          <View style={styles.checkIcon}>
                            <Check size={16} color={COLORS.white} />
                          </View>
                        )}
                      </View>
                      <Text style={styles.tierPrice}>
                        {tier.price === 0 ? 'FREE' : `${tier.price} HTG`}
                      </Text>
                    </View>
                    
                    {tier.description && (
                      <Text style={styles.tierDescription}>{tier.description}</Text>
                    )}
                    
                    <View style={styles.tierFooter}>
                      <Text style={[
                        styles.tierAvailability,
                        available < 10 && styles.tierAvailabilityLow
                      ]}>
                        {isAvailable 
                          ? `${available} tickets available`
                          : 'Sold out'
                        }
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Quantity Selector */}
            {selectedTier && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Quantity</Text>
                <View style={styles.quantityContainer}>
                  <TouchableOpacity
                    style={[styles.quantityButton, quantity === 1 && styles.quantityButtonDisabled]}
                    onPress={() => handleQuantityChange(-1)}
                    disabled={quantity === 1}
                  >
                    <Minus size={20} color={quantity === 1 ? COLORS.border : COLORS.primary} />
                  </TouchableOpacity>
                  
                  <Text style={styles.quantityText}>{quantity}</Text>
                  
                  <TouchableOpacity
                    style={[
                      styles.quantityButton,
                      (quantity >= getAvailableQuantity(selectedTier) || quantity >= 10) && 
                        styles.quantityButtonDisabled
                    ]}
                    onPress={() => handleQuantityChange(1)}
                    disabled={quantity >= getAvailableQuantity(selectedTier) || quantity >= 10}
                  >
                    <Plus size={20} color={
                      (quantity >= getAvailableQuantity(selectedTier) || quantity >= 10)
                        ? COLORS.border 
                        : COLORS.primary
                    } />
                  </TouchableOpacity>
                </View>
                
                {groupDiscount && !promoValidation?.valid && (
                  <Text style={styles.discountNote}>
                    🎉 {groupDiscount.discount_percentage}% group discount applied!
                  </Text>
                )}
              </View>
            )}

            {/* Promo Code */}
            {selectedTier && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Promo Code (Optional)</Text>
                <View style={styles.promoContainer}>
                  <View style={styles.promoInputContainer}>
                    <Tag size={20} color={COLORS.secondary} />
                    <TextInput
                      style={styles.promoInput}
                      placeholder="Enter code"
                      value={promoCode}
                      onChangeText={setPromoCode}
                      autoCapitalize="characters"
                      onSubmitEditing={validatePromoCode}
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.promoApplyButton}
                    onPress={validatePromoCode}
                    disabled={!promoCode.trim() || validatingPromo}
                  >
                    {validatingPromo ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Text style={styles.promoApplyButtonText}>Apply</Text>
                    )}
                  </TouchableOpacity>
                </View>
                
                {promoValidation && (
                  <View style={[
                    styles.promoResult,
                    { backgroundColor: promoValidation.valid ? COLORS.success + '20' : COLORS.error + '20' }
                  ]}>
                    <Text style={[
                      styles.promoResultText,
                      { color: promoValidation.valid ? COLORS.success : COLORS.error }
                    ]}>
                      {promoValidation.valid 
                        ? `✓ ${promoValidation.discount_percentage}% discount applied`
                        : `✗ ${promoValidation.error}`
                      }
                    </Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        )}

        {/* Footer with Purchase Button */}
        {selectedTier && !loading && (
          <View style={styles.footer}>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total</Text>
              <View>
                {(promoValidation?.valid || groupDiscount) && (
                  <Text style={styles.originalPrice}>
                    {selectedTier.price * quantity} HTG
                  </Text>
                )}
                <Text style={styles.totalPrice}>
                  {calculateFinalPrice()} HTG
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.purchaseButton}
              onPress={handlePurchase}
            >
              <Text style={styles.purchaseButtonText}>
                Continue to Payment
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 12,
  },
  tierCard: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: COLORS.white,
  },
  tierCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '05',
  },
  tierCardDisabled: {
    opacity: 0.5,
    backgroundColor: COLORS.background,
  },
  tierHeader: {
    marginBottom: 8,
  },
  tierTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  tierName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  tierNameDisabled: {
    color: COLORS.secondary,
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  tierDescription: {
    fontSize: 14,
    color: COLORS.secondary,
    marginBottom: 8,
  },
  tierFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tierAvailability: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '600',
  },
  tierAvailabilityLow: {
    color: COLORS.warning,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  quantityButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonDisabled: {
    borderColor: COLORS.border,
  },
  quantityText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    minWidth: 40,
    textAlign: 'center',
  },
  discountNote: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 14,
    color: COLORS.success,
    fontWeight: '600',
  },
  promoContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  promoInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  promoInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.primary,
  },
  promoApplyButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 20,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  promoApplyButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  promoResult: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
  },
  promoResultText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    color: COLORS.secondary,
  },
  originalPrice: {
    fontSize: 14,
    color: COLORS.secondary,
    textDecorationLine: 'line-through',
    textAlign: 'right',
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'right',
  },
  purchaseButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  purchaseButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
