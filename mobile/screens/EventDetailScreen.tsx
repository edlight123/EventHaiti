import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../config/brand';

export default function EventDetailScreen({ route }: any) {
  const { eventId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Event Details</Text>
      <Text style={styles.subtitle}>Event ID: {eventId}</Text>
      <Text style={styles.subtitle}>(Coming Soon)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
});
