import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Switch, RefreshControl } from 'react-native';
import { User, Mail, Phone, MapPin, Bell, Globe, LogOut, Edit2, Check, X, Briefcase } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { useAppMode } from '../contexts/AppModeContext';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../config/brand';
import { getVerificationRequest, type VerificationRequest } from '../lib/verification';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, userProfile, signOut } = useAuth();
  const { mode, setMode } = useAppMode();
  const [isEditing, setIsEditing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editedName, setEditedName] = useState(userProfile?.full_name || '');
  const [editedPhone, setEditedPhone] = useState(userProfile?.phone_number || '');
  const [editedCity, setEditedCity] = useState(userProfile?.default_city || 'Port-au-Prince');
  const [verificationStatus, setVerificationStatus] = useState<VerificationRequest | null>(null);

  // Load verification status
  useEffect(() => {
    loadVerificationStatus();
  }, [userProfile?.id]);

  const loadVerificationStatus = async () => {
    if (!userProfile?.id) return;
    
    try {
      const verification = await getVerificationRequest(userProfile.id);
      setVerificationStatus(verification);
    } catch (error) {
      console.log('No verification request found');
      setVerificationStatus(null);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadVerificationStatus();
    // Simulate refresh - in real app, refetch user profile
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleSave = () => {
    // In a real app, save to Firestore here
    Alert.alert('Success', 'Profile updated successfully');
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedName(userProfile?.full_name || '');
    setEditedPhone(userProfile?.phone_number || '');
    setEditedCity(userProfile?.default_city || 'Port-au-Prince');
    setIsEditing(false);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut }
      ]
    );
  };

  const handleModeSwitch = async () => {
    const newMode = mode === 'attendee' ? 'organizer' : 'attendee';
    await setMode(newMode);

    // Reset navigation to the appropriate tab navigator and initial screen
    if (newMode === 'organizer') {
      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'Main' as never,
            state: {
              index: 0,
              routes: [{ name: 'Dashboard' as never }],
            },
          },
        ],
      });
      return;
    }

    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'Main' as never,
          state: {
            index: 0,
            routes: [{ name: 'Home' as never }],
          },
        },
      ],
    });
  };

  const handleStaffModeSwitch = async () => {
    const newMode = mode === 'staff' ? 'attendee' : 'staff';
    await setMode(newMode as any);

    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'Main' as never,
          state: {
            index: 0,
            routes: [{ name: (newMode === 'staff' ? 'Events' : 'Home') as never }],
          },
        },
      ],
    });
  };

  const memberSince = 'Recently';

  return (
    <View style={styles.container}>
      {/* Fixed Header with Avatar */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <User size={40} color={COLORS.textSecondary} />
          </View>
        </View>
        <Text style={styles.name}>{userProfile?.full_name || 'User'}</Text>
        <Text style={styles.memberSince}>Member since {memberSince}</Text>
      </View>

      <ScrollView 
        style={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Profile Information Card */}
        <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Profile Information</Text>
          {!isEditing ? (
            <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editButton}>
              <Edit2 size={18} color={COLORS.primary} />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.actionButtons}>
              <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
                <X size={16} color={COLORS.textSecondary} />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                <Check size={16} color={COLORS.surface} />
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {isEditing ? (
          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={editedName}
                onChangeText={setEditedName}
                placeholder="Enter your name"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={editedPhone}
                onChangeText={setEditedPhone}
                placeholder="Enter phone number"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Default City</Text>
              <TextInput
                style={styles.input}
                value={editedCity}
                onChangeText={setEditedCity}
                placeholder="Enter your city"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
          </View>
        ) : (
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <User size={20} color={COLORS.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Full Name</Text>
                <Text style={styles.infoValue}>{userProfile?.full_name || 'Not set'}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Mail size={20} color={COLORS.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{userProfile?.email || user?.email}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Phone size={20} color={COLORS.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{userProfile?.phone_number || 'Not set'}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <MapPin size={20} color={COLORS.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Default City</Text>
                <Text style={styles.infoValue}>{userProfile?.default_city || 'Port-au-Prince'}</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Organizer Mode Card */}
      {userProfile?.role === 'organizer' || userProfile?.role === 'admin' || verificationStatus?.status === 'approved' ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Briefcase size={20} color={COLORS.secondary} />
            <Text style={styles.cardTitle}>Organizer Mode</Text>
          </View>
          <View style={styles.organizerSection}>
            <Text style={styles.organizerDesc}>
              {mode === 'attendee'
                ? 'Create and manage your own events with EventHaiti.'
                : 'Switch back to attendee mode to browse and attend events.'}
            </Text>
            <TouchableOpacity
              style={styles.switchModeButton}
              onPress={handleModeSwitch}
            >
              <Text style={styles.switchModeButtonText}>
                {mode === 'attendee' ? 'Switch to Organizer Mode' : 'Switch to Attendee Mode'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : verificationStatus?.status === 'pending' || verificationStatus?.status === 'in_review' ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Briefcase size={20} color={COLORS.warning} />
            <Text style={styles.cardTitle}>Verification Pending</Text>
          </View>
          <View style={styles.organizerSection}>
            <Text style={styles.organizerDesc}>
              Your organizer application is under review. We'll notify you once it's been processed.
            </Text>
            <TouchableOpacity
              style={[styles.switchModeButton, styles.viewApplicationButton]}
              onPress={() => (navigation as any).navigate('OrganizerVerification')}
            >
              <Text style={styles.switchModeButtonText}>View Application</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // Show "Become Organizer" card for new applicants or rejected
        <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Briefcase size={20} color={COLORS.secondary} />
              <Text style={styles.cardTitle}>Become an Organizer</Text>
            </View>
            <View style={styles.organizerSection}>
              <Text style={styles.organizerDesc}>
                Host your own events and reach thousands of attendees in Haiti.
              </Text>
              {verificationStatus?.status === 'rejected' && (
                <View style={styles.rejectedBanner}>
                  <Text style={styles.rejectedText}>
                    Your previous application was not approved. 
                    {verificationStatus.reviewNotes ? ` Reason: ${verificationStatus.reviewNotes}` : ''}
                  </Text>
                </View>
              )}
              {verificationStatus?.status === 'changes_requested' && (
                <View style={styles.changesBanner}>
                  <Text style={styles.changesText}>
                    Changes requested. Please update your application.
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.switchModeButton}
                onPress={() => (navigation as any).navigate('OrganizerVerification')}
              >
                <Text style={styles.switchModeButtonText}>
                  {verificationStatus?.status === 'rejected' || verificationStatus?.status === 'changes_requested' 
                    ? 'Reapply to Become an Organizer' 
                    : 'Apply to Become an Organizer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
      )}

      {/* Staff Mode Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Briefcase size={20} color={COLORS.primary} />
          <Text style={styles.cardTitle}>Staff Mode</Text>
        </View>
        <View style={styles.organizerSection}>
          <Text style={styles.organizerDesc}>
            {mode === 'staff'
              ? 'You are in staff mode. Scan tickets for events you were assigned to.'
              : 'Use staff mode to scan tickets for events you are assigned to.'}
          </Text>
          <TouchableOpacity style={styles.switchModeButton} onPress={handleStaffModeSwitch}>
            <Text style={styles.switchModeButtonText}>
              {mode === 'staff' ? 'Switch to Attendee Mode' : 'Switch to Staff Mode'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Preferences Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Globe size={20} color={COLORS.secondary} />
          <Text style={styles.cardTitle}>Preferences</Text>
        </View>
        <View style={styles.preferenceSection}>
          <View style={styles.preferenceRow}>
            <Text style={styles.preferenceLabel}>Language</Text>
            <View style={styles.languageButtons}>
              <TouchableOpacity style={[styles.languageButton, styles.languageButtonActive]}>
                <Text style={styles.languageButtonTextActive}>EN</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.languageButton}>
                <Text style={styles.languageButtonText}>FR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.languageButton}>
                <Text style={styles.languageButtonText}>HT</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Account Actions Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Account</Text>
        </View>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <LogOut size={20} color={COLORS.error} />
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer} />
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flex: 1,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.surface,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.surface,
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 14,
    color: COLORS.surface,
    opacity: 0.9,
  },
  card: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.primaryLight + '20',
    borderRadius: 8,
  },
  editButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.borderLight,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  saveButtonText: {
    color: COLORS.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  formSection: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  infoSection: {
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  infoContent: {
    flex: 1,
    gap: 4,
  },
  infoLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '400',
  },
  organizerSection: {
    gap: 16,
  },
  organizerDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  switchModeButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  switchModeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.surface,
  },
  viewApplicationButton: {
    backgroundColor: COLORS.warning,
  },
  rejectedBanner: {
    backgroundColor: COLORS.error + '15',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.error,
  },
  rejectedText: {
    fontSize: 13,
    color: COLORS.error,
    lineHeight: 18,
  },
  changesBanner: {
    backgroundColor: COLORS.warning + '15',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  changesText: {
    fontSize: 13,
    color: COLORS.warning,
    lineHeight: 18,
  },
  preferenceSection: {
    gap: 16,
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  preferenceLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  preferenceValue: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  languageButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  languageButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  languageButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  languageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  languageButtonTextActive: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.surface,
  },
  notificationSection: {
    gap: 4,
  },
  notificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  notificationInfo: {
    flex: 1,
    marginRight: 16,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  notificationDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.error + '10',
  },
  signOutButtonText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    height: 40,
  },
});
