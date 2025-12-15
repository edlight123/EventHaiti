import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../../config/brand';
import type { EventDraft } from '../CreateEventFlowRefactored';

interface Props {
  draft: EventDraft;
  updateDraft: (updates: Partial<EventDraft>) => void;
}

export default function Step5Preview({ draft, updateDraft }: Props) {
  const [viewMode, setViewMode] = useState<'card' | 'page'>('card');

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      updateDraft({ banner_image_url: result.assets[0].uri });
    }
  };

  const getCurrencySymbol = () => (draft.currency === 'HTG' ? 'HTG' : '$');
  const totalTickets = draft.ticket_tiers.reduce((sum, tier) => sum + (parseInt(tier.quantity) || 0), 0);

  if (viewMode === 'card') {
    return (
      <View style={styles.container}>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, styles.toggleButtonActive]}
            onPress={() => setViewMode('card')}
          >
            <Ionicons name="card-outline" size={20} color={COLORS.white} />
            <Text style={styles.toggleButtonTextActive}>Card View</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setViewMode('page')}
          >
            <Ionicons name="document-text-outline" size={20} color={COLORS.text} />
            <Text style={styles.toggleButtonText}>Page View</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.eventCard}>
          {draft.banner_image_url ? (
            <Image source={{ uri: draft.banner_image_url }} style={styles.cardImage} />
          ) : (
            <View style={styles.cardImagePlaceholder}>
              <Ionicons name="image-outline" size={40} color={COLORS.textSecondary} />
            </View>
          )}
          <View style={styles.cardContent}>
            <View style={styles.cardCategory}>
              <Text style={styles.cardCategoryText}>{draft.category}</Text>
            </View>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {draft.title || 'Event Title'}
            </Text>
            <View style={styles.cardInfo}>
              <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.cardInfoText}>{draft.start_date || 'Date TBD'}</Text>
            </View>
            <View style={styles.cardInfo}>
              <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.cardInfoText}>{draft.city || 'Location TBD'}</Text>
            </View>
            <View style={styles.cardFooter}>
              <Text style={styles.cardPrice}>
                {getCurrencySymbol()} {draft.ticket_tiers[0]?.price || '0'}
              </Text>
              <Text style={styles.cardTickets}>{totalTickets} tickets</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.changeImageButton} onPress={pickImage}>
          <Ionicons name="camera-outline" size={20} color={COLORS.primary} />
          <Text style={styles.changeImageText}>Change Event Image</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => setViewMode('card')}
        >
          <Ionicons name="card-outline" size={20} color={COLORS.text} />
          <Text style={styles.toggleButtonText}>Card View</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, styles.toggleButtonActive]}
          onPress={() => setViewMode('page')}
        >
          <Ionicons name="document-text-outline" size={20} color={COLORS.white} />
          <Text style={styles.toggleButtonTextActive}>Page View</Text>
        </TouchableOpacity>
      </View>

      {/* Hero Section */}
      <View style={styles.eventPageHero}>
        {draft.banner_image_url ? (
          <Image source={{ uri: draft.banner_image_url }} style={styles.pageHeroImage} />
        ) : (
          <View style={styles.pageHeroPlaceholder}>
            <Ionicons name="image-outline" size={60} color={COLORS.textSecondary} />
            <Text style={styles.placeholderText}>No image selected</Text>
          </View>
        )}
        <TouchableOpacity style={styles.editImageButton} onPress={pickImage}>
          <Ionicons name="camera" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Event Details */}
      <View style={styles.eventPageContent}>
        <View style={styles.pageCategory}>
          <Text style={styles.pageCategoryText}>{draft.category}</Text>
        </View>

        <Text style={styles.pageTitle}>{draft.title || 'Event Title'}</Text>

        <View style={styles.pageInfoRow}>
          <View style={styles.pageInfoItem}>
            <Ionicons name="calendar" size={20} color={COLORS.primary} />
            <View style={styles.pageInfoTextContainer}>
              <Text style={styles.pageInfoLabel}>Date</Text>
              <Text style={styles.pageInfoValue}>{draft.start_date || 'TBD'}</Text>
            </View>
          </View>
          <View style={styles.pageInfoItem}>
            <Ionicons name="time" size={20} color={COLORS.primary} />
            <View style={styles.pageInfoTextContainer}>
              <Text style={styles.pageInfoLabel}>Time</Text>
              <Text style={styles.pageInfoValue}>{draft.start_time || 'TBD'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.pageInfoRow}>
          <View style={styles.pageInfoItem}>
            <Ionicons name="location" size={20} color={COLORS.primary} />
            <View style={styles.pageInfoTextContainer}>
              <Text style={styles.pageInfoLabel}>Location</Text>
              <Text style={styles.pageInfoValue}>{draft.venue_name || 'TBD'}</Text>
              <Text style={styles.pageInfoSubtext}>{draft.city || ''}</Text>
            </View>
          </View>
        </View>

        <View style={styles.pageDivider} />

        <Text style={styles.pageSectionTitle}>About This Event</Text>
        <Text style={styles.pageDescription}>
          {draft.description || 'No description provided'}
        </Text>

        <View style={styles.pageDivider} />

        <Text style={styles.pageSectionTitle}>Ticket Options</Text>
        {draft.ticket_tiers.map((tier, index) => (
          <View key={index} style={styles.pageTicketTier}>
            <View style={styles.pageTicketInfo}>
              <Text style={styles.pageTicketName}>{tier.name || `Tier ${index + 1}`}</Text>
              <Text style={styles.pageTicketAvailable}>{tier.quantity || '0'} available</Text>
            </View>
            <Text style={styles.pageTicketPrice}>
              {getCurrencySymbol()} {tier.price || '0'}
            </Text>
          </View>
        ))}

        <View style={styles.helpCard}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
          <Text style={styles.helpText}>
            This is how your event will appear to attendees. Ready to publish?
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  viewToggle: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  toggleButtonTextActive: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  eventCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  cardImage: {
    width: '100%',
    height: 180,
  },
  cardImagePlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    padding: 16,
  },
  cardCategory: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 8,
  },
  cardCategoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cardInfoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cardPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  cardTickets: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  changeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  changeImageText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  eventPageHero: {
    height: 220,
    position: 'relative',
    marginBottom: 16,
  },
  pageHeroImage: {
    width: '100%',
    height: '100%',
  },
  pageHeroPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  editImageButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventPageContent: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 16,
  },
  pageCategory: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 12,
  },
  pageCategoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  pageInfoRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  pageInfoItem: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  pageInfoTextContainer: {
    flex: 1,
  },
  pageInfoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  pageInfoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  pageInfoSubtext: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  pageDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },
  pageSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  pageDescription: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
  },
  pageTicketTier: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pageTicketInfo: {
    flex: 1,
  },
  pageTicketName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  pageTicketAvailable: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  pageTicketPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.success + '15',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  helpText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
  },
});
