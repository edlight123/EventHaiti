import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../config/brand';

export default function ProfileScreen() {
  const { userProfile, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{userProfile?.full_name || 'User'}</Text>
        <Text style={styles.email}>{userProfile?.email}</Text>
        <Text style={styles.role}>{userProfile?.role?.toUpperCase()}</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity style={styles.button} onPress={signOut}>
          <Text style={styles.buttonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.surface,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: COLORS.surface,
    opacity: 0.8,
    marginBottom: 8,
  },
  role: {
    fontSize: 12,
    color: COLORS.surface,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  button: {
    backgroundColor: COLORS.error,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});
