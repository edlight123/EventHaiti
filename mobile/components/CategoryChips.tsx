import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

export const CATEGORIES = [
  'Music',
  'Sports',
  'Arts & Culture',
  'Business',
  'Food & Drink',
  'Education',
  'Technology',
  'Health & Wellness',
  'Party',
  'Religious',
  'Other'
];

const CATEGORY_EMOJIS: Record<string, string> = {
  'Music': '🎵',
  'Sports': '🏆',
  'Arts & Culture': '🎨',
  'Business': '💼',
  'Food & Drink': '🍽️',
  'Education': '🎓',
  'Technology': '💻',
  'Health & Wellness': '💪',
  'Party': '🎉',
  'Religious': '⛪',
  'Other': '✨'
};

interface CategoryChipsProps {
  selectedCategories: string[];
  onCategoryToggle: (category: string) => void;
}

const COLORS = {
  primary: '#000000',
  secondary: '#666666',
  background: '#F5F5F5',
  white: '#FFFFFF',
  border: '#E0E0E0',
};

export function CategoryChips({ selectedCategories, onCategoryToggle }: CategoryChipsProps) {
  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {CATEGORIES.map((category) => {
          const isActive = selectedCategories.includes(category);
          return (
            <TouchableOpacity
              key={category}
              style={[
                styles.chip,
                isActive && styles.chipActive
              ]}
              onPress={() => onCategoryToggle(category)}
              activeOpacity={0.7}
            >
              <Text style={styles.emoji}>{CATEGORY_EMOJIS[category]}</Text>
              <Text style={[
                styles.chipText,
                isActive && styles.chipTextActive
              ]}>
                {category}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  emoji: {
    fontSize: 14,
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
