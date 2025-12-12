import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Switch, RefreshControl } from 'react-native';
import { User, Mail, Phone, MapPin, Bell, Globe, LogOut, Edit2, Check, X } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../config/brand';

export default function ProfileScreen() {
  const { user, userProfile, signOut } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editedName, setEditedName] = useState(userProfile?.full_name || '');
  const [editedPhone, setEditedPhone] = useState(userProfile?.phone_number || '');
  
  // Notification settings
  const [notifyReminders, setNotifyReminders] = useState(true);
  const [notifyUpdates, setNotifyUpdates] = useState(true);
  const [notifyPromos, setNotifyPromos] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
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

  const memberSince = 'Recently';

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header with Avatar */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <User size={40} color={COLORS.textSecondary} />
          </View>
        </View>
        <Text style={styles.name}>{userProfile?.full_name || 'User'}</Text>
        <Text style={styles.memberSince}>Member since {memberSince}</Text>
      </View>

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
          </View>
        )}
      </View>

      {/* Preferences Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MapPin size={20} color={COLORS.secondary} />
          <Text style={styles.cardTitle}>Preferences</Text>
        </View>
        <View style={styles.preferenceSection}>
          <View style={styles.preferenceRow}>
            <Text style={styles.preferenceLabel}>Default City</Text>
            <Text style={styles.preferenceValue}>Port-au-Prince</Text>
          </View>
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

      {/* Notifications Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Bell size={20} color={COLORS.secondary} />
          <Text style={styles.cardTitle}>Notifications</Text>
        </View>
        <View style={styles.notificationSection}>
          <View style={styles.notificationRow}>
            <View style={styles.notificationInfo}>
              <Text style={styles.notificationTitle}>Event Reminders</Text>
              <Text style={styles.notificationDesc}>Get reminded about upcoming events</Text>
            </View>
            <Switch
              value={notifyReminders}
              onValueChange={setNotifyReminders}
              trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
              thumbColor={notifyReminders ? COLORS.primary : COLORS.surface}
            />
          </View>
          <View style={styles.notificationRow}>
            <View style={styles.notificationInfo}>
              <Text style={styles.notificationTitle}>Event Updates</Text>
              <Text style={styles.notificationDesc}>Changes to events you're attending</Text>
            </View>
            <Switch
              value={notifyUpdates}
              onValueChange={setNotifyUpdates}
              trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
              thumbColor={notifyUpdates ? COLORS.primary : COLORS.surface}
            />
          </View>
          <View style={styles.notificationRow}>
            <View style={styles.notificationInfo}>
              <Text style={styles.notificationTitle}>Promotions</Text>
              <Text style={styles.notificationDesc}>Special offers and discounts</Text>
            </View>
            <Switch
              value={notifyPromos}
              onValueChange={setNotifyPromos}
              trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
              thumbColor={notifyPromos ? COLORS.primary : COLORS.surface}
            />
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
