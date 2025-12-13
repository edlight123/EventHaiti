import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { X, Minus, Plus } from 'lucide-react-native';
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

interface TierQuantity {
  [tierId: string]: number;
}

interface EventbriteStyleTicketSelectorProps {
  eventId: string;
  visible: boolean;
  onClose: () => void;
  onPurchase: (selections: { tierId: string; quantity: number; price: number }[]) => void;
}

const COLORS = {
  primary: '#0D9488',
  secondary: '#666666',
  background: '#F5F5F5',
  white: '#FFFFFF',
  border: '#E0E0E0',
  success: '#10B981',
  error: '#EF4444',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
};

export default function EventbriteStyleTicketSelector({
  eventId,
  visible,
  onClose,
  onPurchase,
}: EventbriteStyleTicketSelectorProps) {
  const [tiers, setTiers] = useState<TicketTier[]>([]);
  const [quantities, setQuantities] = useState<TierQuantity>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      fetchTiers();
    }
  }, [visible, eventId]);

  const fetchTiers = async () => {
    try {
      setLoading(true);
      
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
      
      setTiers(tiersData);
      
      // Initialize quantities to 0
      const initialQuantities: TierQuantity = {};
      tiersData.forEach((tier) => {
        initialQuantities[tier.id] = 0;
      });
      setQuantities(initialQuantities);
    } catch (error) {
      console.error('[EventbriteStyleSelector] Error fetching tiers:', error);
    } finally {
      setLoading(false);
    }
  };

  const isTierAvailable = (tier: TicketTier): boolean => {
    const now = new Date();
    
    if (tier.sales_start && new Date(tier.sales_start) > now) {
      return false;
    }
    
    if (tier.sales_end && new Date(tier.sales_end) < now) {
      return false;
    }
    
    return (tier.total_quantity - (tier.sold_quantity || 0)) > 0;
  };

  const getAvailableQuantity = (tier: TicketTier): number => {
    return tier.total_quantity - (tier.sold_quantity || 0);
  };

  const updateQuantity = (tierId: string, delta: number) => {
    const tier = tiers.find(t => t.id === tierId);
    if (!tier) return;

    const maxAvailable = getAvailableQuantity(tier);
    const newQuantity = Math.max(0, Math.min(maxAvailable, (quantities[tierId] || 0) + delta));
    
    setQuantities(prev => ({
      ...prev,
      [tierId]: newQuantity,
    }));
  };

  const getTotalTickets = (): number => {
    return Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
  };

  const getTotalPrice = (): number => {
    return tiers.reduce((sum, tier) => {
      const qty = quantities[tier.id] || 0;
      return sum + (tier.price * qty);
    }, 0);
  };

  const handlePurchase = () => {
    const selections = tiers
      .filter(tier => quantities[tier.id] > 0)
      .map(tier => ({
        tierId: tier.id,
        quantity: quantities[tier.id],
        price: tier.price,
      }));

    if (selections.length === 0) return;

    onPurchase(selections);
    onClose();
  };

  const totalTickets = getTotalTickets();
  const totalPrice = getTotalPrice();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Select Tickets</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : tiers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No ticket tiers available</Text>
            </View>
          ) : (
            <>
              <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Tier List */}
                <View style={styles.tiersList}>
                  {tiers.map((tier) => {
                    const available = getAvailableQuantity(tier);
                    const isAvailable = isTierAvailable(tier);
                    const quantity = quantities[tier.id] || 0;

                    return (
                      <View
                        key={tier.id}
                        style={[
                          styles.tierCard,
                          quantity > 0 && styles.tierCardSelected,
                        ]}
                      >
                        {/* Tier Info */}
                        <View style={styles.tierInfo}>
                          <Text style={styles.tierName}>{tier.name}</Text>
                          {tier.description && (
                            <Text style={styles.tierDescription}>{tier.description}</Text>
                          )}
                          <View style={styles.tierMeta}>
                            <Text style={styles.tierPrice}>{tier.price.toFixed(2)} HTG</Text>
                            <Text style={[
                              styles.tierAvailability,
                              available === 0 && styles.tierSoldOut
                            ]}>
                              {available > 0 ? `${available} available` : 'Sold out'}
                            </Text>
                          </View>
                        </View>

                        {/* Quantity Selector */}
                        {isAvailable && (
                          <View style={styles.quantitySelector}>
                            <TouchableOpacity
                              onPress={() => updateQuantity(tier.id, -1)}
                              disabled={quantity === 0}
                              style={[
                                styles.quantityButton,
                                quantity === 0 && styles.quantityButtonDisabled,
                              ]}
                            >
                              <Minus size={18} color={quantity === 0 ? COLORS.border : COLORS.textPrimary} />
                            </TouchableOpacity>
                            <Text style={styles.quantityText}>{quantity}</Text>
                            <TouchableOpacity
                              onPress={() => updateQuantity(tier.id, 1)}
                              disabled={quantity >= available}
                              style={[
                                styles.quantityButton,
                                quantity >= available && styles.quantityButtonDisabled,
                              ]}
                            >
                              <Plus size={18} color={quantity >= available ? COLORS.border : COLORS.textPrimary} />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>

                {/* Total Summary */}
                {totalTickets > 0 && (
                  <View style={styles.summary}>
                    <Text style={styles.summaryTitle}>Order Summary</Text>
                    {tiers
                      .filter(tier => quantities[tier.id] > 0)
                      .map(tier => (
                        <View key={tier.id} style={styles.summaryItem}>
                          <Text style={styles.summaryItemText}>
                            {quantities[tier.id]}× {tier.name}
                          </Text>
                          <Text style={styles.summaryItemPrice}>
                            {(tier.price * quantities[tier.id]).toFixed(2)} HTG
                          </Text>
                        </View>
                      ))}
                    <View style={styles.summaryTotal}>
                      <Text style={styles.summaryTotalLabel}>
                        Total ({totalTickets} ticket{totalTickets !== 1 ? 's' : ''})
                      </Text>
                      <Text style={styles.summaryTotalPrice}>{totalPrice.toFixed(2)} HTG</Text>
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Checkout Button */}
              <View style={styles.footer}>
                <TouchableOpacity
                  onPress={handlePurchase}
                  disabled={totalTickets === 0}
                  style={[
                    styles.checkoutButton,
                    totalTickets === 0 && styles.checkoutButtonDisabled,
                  ]}
                >
                  <Text style={styles.checkoutButtonText}>
                    {totalTickets === 0
                      ? 'Select Tickets'
                      : `Checkout - ${totalPrice.toFixed(2)} HTG`}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  tiersList: {
    padding: 20,
    gap: 16,
  },
  tierCard: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tierCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0FDF9',
  },
  tierInfo: {
    flex: 1,
    marginRight: 16,
  },
  tierName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  tierDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  tierMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tierPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  tierAvailability: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  tierSoldOut: {
    color: COLORS.error,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  quantityButtonDisabled: {
    opacity: 0.3,
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    minWidth: 32,
    textAlign: 'center',
  },
  summary: {
    margin: 20,
    marginTop: 8,
    padding: 16,
    backgroundColor: COLORS.background,
    borderRadius: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryItemText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  summaryItemPrice: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  summaryTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 4,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  summaryTotalPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  checkoutButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  checkoutButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  checkoutButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
