import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform
} from 'react-native';
import { X } from 'lucide-react-native';
import { useFilters } from '../contexts/FiltersContext';
import { 
  CATEGORIES, 
  CITIES, 
  PRICE_FILTERS, 
  DATE_OPTIONS, 
  EVENT_TYPE_OPTIONS,
  DateFilter,
  PriceFilter,
  EventTypeFilter
} from '../types/filters';
import { COLORS } from '../config/brand';

export default function EventFiltersSheet() {
  const {
    draftFilters,
    isModalOpen,
    setDraftFilters,
    closeFiltersModal,
    applyFilters,
    resetFilters,
    countActiveFilters
  } = useFilters();

  const activeCount = countActiveFilters();

  const handleDateChange = (date: DateFilter) => {
    setDraftFilters({ 
      ...draftFilters, 
      date, 
      pickedDate: date === 'pick-date' ? draftFilters.pickedDate : undefined 
    });
  };

  const handleCityChange = (city: string) => {
    setDraftFilters({ 
      ...draftFilters, 
      city: draftFilters.city === city ? '' : city, 
      commune: undefined 
    });
  };

  const handleCategoryToggle = (category: string) => {
    const categories = draftFilters.categories.includes(category)
      ? draftFilters.categories.filter(c => c !== category)
      : [...draftFilters.categories, category];
    setDraftFilters({ ...draftFilters, categories });
  };

  const handlePriceChange = (price: PriceFilter) => {
    setDraftFilters({ ...draftFilters, price });
  };

  const handleEventTypeChange = (eventType: EventTypeFilter) => {
    setDraftFilters({ ...draftFilters, eventType });
  };

  return (
    <Modal
      visible={isModalOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={closeFiltersModal}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Filters</Text>
            {activeCount > 0 && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>{activeCount}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={closeFiltersModal}
          >
            <X size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Scrollable Content */}
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Date Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>DATE</Text>
            <View style={styles.chipsRow}>
              {DATE_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.chip,
                    draftFilters.date === option.value && styles.chipActive
                  ]}
                  onPress={() => handleDateChange(option.value)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      draftFilters.date === option.value && styles.chipTextActive
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Event Type Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>EVENT TYPE</Text>
            <View style={styles.segmentedControl}>
              {EVENT_TYPE_OPTIONS.map((option, index) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.segment,
                    index === 0 && styles.segmentFirst,
                    index === EVENT_TYPE_OPTIONS.length - 1 && styles.segmentLast,
                    draftFilters.eventType === option.value && styles.segmentActive
                  ]}
                  onPress={() => handleEventTypeChange(option.value)}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      draftFilters.eventType === option.value && styles.segmentTextActive
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Price Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PRICE</Text>
            <View style={styles.chipsRow}>
              {PRICE_FILTERS.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.chip,
                    draftFilters.price === option.value && styles.chipActive
                  ]}
                  onPress={() => handlePriceChange(option.value)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      draftFilters.price === option.value && styles.chipTextActive
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Categories Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>CATEGORIES</Text>
            <View style={styles.chipsRow}>
              {CATEGORIES.map(category => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.chip,
                    draftFilters.categories.includes(category) && styles.chipActive
                  ]}
                  onPress={() => handleCategoryToggle(category)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      draftFilters.categories.includes(category) && styles.chipTextActive
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Location Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>LOCATION</Text>
            <View style={styles.chipsRow}>
              {CITIES.map(city => (
                <TouchableOpacity
                  key={city}
                  style={[
                    styles.chip,
                    draftFilters.city === city && styles.chipActive
                  ]}
                  onPress={() => handleCityChange(city)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      draftFilters.city === city && styles.chipTextActive
                    ]}
                  >
                    {city}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Bottom padding for footer */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Footer with Actions */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetFilters}
          >
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.applyButton}
            onPress={applyFilters}
          >
            <Text style={styles.applyButtonText}>
              Apply {activeCount > 0 ? `(${activeCount})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  activeBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  activeBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FFF',
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  chipTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  segmentFirst: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  segmentLast: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  segmentActive: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  segmentTextActive: {
    color: COLORS.text,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: '#FFF',
  },
  resetButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  applyButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});
