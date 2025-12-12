import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

export type DateFilter = 'any' | 'today' | 'tomorrow' | 'this-week' | 'this-weekend';

interface DateChipsProps {
  currentDate: DateFilter;
  onDateChange: (date: DateFilter) => void;
}

const COLORS = {
  primary: '#000000',
  secondary: '#666666',
  background: '#F5F5F5',
  white: '#FFFFFF',
  border: '#E0E0E0',
};

const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: 'any', label: 'Any Date' },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'this-week', label: 'This Week' },
  { value: 'this-weekend', label: 'This Weekend' },
];

export function DateChips({ currentDate, onDateChange }: DateChipsProps) {
  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {DATE_OPTIONS.map((option) => {
          const isActive = currentDate === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.chip,
                isActive && styles.chipActive
              ]}
              onPress={() => onDateChange(option.value)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.chipText,
                isActive && styles.chipTextActive
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  chipTextActive: {
    color: COLORS.white,
  },
});
