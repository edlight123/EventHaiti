import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../config/brand';
import { COUNTRIES, CITIES_BY_COUNTRY } from '../../../types/filters';
import type { EventDraft } from '../CreateEventFlowRefactored';

interface Props {
  draft: EventDraft;
  updateDraft: (updates: Partial<EventDraft>) => void;
}

export default function Step2Location({ draft, updateDraft }: Props) {
  const selectedCountry = (draft as any).country || 'HT';
  const cities = CITIES_BY_COUNTRY[selectedCountry] || [];

  const handleCountryChange = (countryCode: string) => {
    const newCities = CITIES_BY_COUNTRY[countryCode] || [];
    updateDraft({ 
      country: countryCode,
      city: newCities[0] || '',
      commune: ''
    } as any);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Where will it happen?</Text>
      <Text style={styles.subtitle}>Help people find your event</Text>

      {/* Country */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>
          Country <Text style={styles.required}>*</Text>
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cityScroll}
        >
          {COUNTRIES.map((country) => (
            <TouchableOpacity
              key={country.code}
              style={[
                styles.cityChip,
                selectedCountry === country.code && styles.cityChipActive,
              ]}
              onPress={() => handleCountryChange(country.code)}
            >
              <Text
                style={[
                  styles.cityChipText,
                  selectedCountry === country.code && styles.cityChipTextActive,
                ]}
              >
                {country.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Venue Name */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>
          Venue Name <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.inputContainer}>
          <Ionicons name="business-outline" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.input}
            placeholder="e.g., Hotel Montana, Parc Historique"
            value={draft.venue_name}
            onChangeText={(text) => updateDraft({ venue_name: text })}
          />
        </View>
      </View>

      {/* City */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>
          City <Text style={styles.required}>*</Text>
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cityScroll}
        >
          {cities.map((city) => (
            <TouchableOpacity
              key={city}
              style={[
                styles.cityChip,
                draft.city === city && styles.cityChipActive,
              ]}
              onPress={() => updateDraft({ city })}
            >
              <Text
                style={[
                  styles.cityChipText,
                  draft.city === city && styles.cityChipTextActive,
                ]}
              >
                {city}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Commune */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Commune (Optional)</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="map-outline" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.input}
            placeholder="e.g., Pétion-Ville, Delmas 33"
            value={draft.commune}
            onChangeText={(text) => updateDraft({ commune: text })}
          />
        </View>
      </View>

      {/* Address */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>
          Street Address <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.inputContainer}>
          <Ionicons name="location-outline" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.input}
            placeholder="Street address and number"
            value={draft.address}
            onChangeText={(text) => updateDraft({ address: text })}
          />
        </View>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
        <Text style={styles.infoText}>
          Provide accurate location details to help attendees find your event easily.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: -12,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  required: {
    color: COLORS.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.text,
  },
  cityScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  cityChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cityChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  cityChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  cityChipTextActive: {
    color: COLORS.white,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.primary + '10',
    padding: 12,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
  },
});
