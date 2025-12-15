import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { COLORS } from '../../config/brand';
import { db } from '../../config/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

type RouteParams = {
  SendEventUpdate: {
    eventId: string;
    eventTitle: string;
  };
};

export default function SendEventUpdateScreen() {
  const route = useRoute<RouteProp<RouteParams, 'SendEventUpdate'>>();
  const navigation = useNavigation();
  const { eventId, eventTitle } = route.params;

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter an update title');
      return;
    }

    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    Alert.alert(
      'Send Update',
      'Send this update to all ticket holders?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            setSending(true);
            try {
              // Create event update
              await addDoc(collection(db, 'event_updates'), {
                event_id: eventId,
                title: title.trim(),
                message: message.trim(),
                created_at: serverTimestamp(),
              });

              // Get all ticket holders
              const ticketsQuery = query(
                collection(db, 'tickets'),
                where('event_id', '==', eventId),
                where('status', 'in', ['active', 'checked_in', 'confirmed'])
              );

              const ticketsSnapshot = await getDocs(ticketsQuery);
              const attendeeIds = new Set<string>();
              
              ticketsSnapshot.docs.forEach((doc) => {
                const data = doc.data();
                if (data.attendee_id) {
                  attendeeIds.add(data.attendee_id);
                }
              });

              // Create notifications for all attendees
              const notificationPromises = Array.from(attendeeIds).map((attendeeId) =>
                addDoc(collection(db, 'users', attendeeId, 'notifications'), {
                  type: 'event_update',
                  title: `Update: ${eventTitle}`,
                  message: title,
                  event_id: eventId,
                  read: false,
                  created_at: serverTimestamp(),
                })
              );

              await Promise.all(notificationPromises);

              Alert.alert(
                'Success',
                `Update sent to ${attendeeIds.size} attendee${attendeeIds.size !== 1 ? 's' : ''}`,
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } catch (error: any) {
              console.error('Error sending update:', error);
              Alert.alert('Error', 'Failed to send update. Please try again.');
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="close" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send Update</Text>
        <TouchableOpacity
          onPress={handleSend}
          disabled={sending || !title.trim() || !message.trim()}
          style={[
            styles.sendButton,
            (sending || !title.trim() || !message.trim()) && styles.sendButtonDisabled,
          ]}
        >
          {sending ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.eventInfo}>
          <Ionicons name="calendar" size={20} color={COLORS.primary} />
          <Text style={styles.eventTitle}>{eventTitle}</Text>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>
            This update will be sent to all ticket holders via in-app notification
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Update Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Venue Change, Time Update"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
            placeholderTextColor={COLORS.textSecondary}
          />
          <Text style={styles.charCount}>{title.length}/100</Text>

          <Text style={styles.label}>Message *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter your message to attendees..."
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={10}
            textAlignVertical="top"
            maxLength={500}
            placeholderTextColor={COLORS.textSecondary}
          />
          <Text style={styles.charCount}>{message.length}/500</Text>
        </View>

        <View style={styles.examples}>
          <Text style={styles.examplesTitle}>Example Updates:</Text>
          <TouchableOpacity
            style={styles.exampleCard}
            onPress={() => {
              setTitle('Venue Change');
              setMessage(
                'Due to high demand, we are moving to a larger venue! The new location is...'
              );
            }}
          >
            <Text style={styles.exampleTitle}>Venue Change</Text>
            <Text style={styles.exampleText} numberOfLines={2}>
              Due to high demand, we are moving to a larger venue...
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exampleCard}
            onPress={() => {
              setTitle('Event Time Update');
              setMessage('The event start time has been changed to accommodate more attendees...');
            }}
          >
            <Text style={styles.exampleTitle}>Time Update</Text>
            <Text style={styles.exampleText} numberOfLines={2}>
              The event start time has been changed to accommodate...
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exampleCard}
            onPress={() => {
              setTitle('Important Reminder');
              setMessage(
                "Don't forget to bring a valid ID and your ticket confirmation. Doors open 1 hour early!"
              );
            }}
          >
            <Text style={styles.exampleTitle}>Reminder</Text>
            <Text style={styles.exampleText} numberOfLines={2}>
              Don't forget to bring a valid ID and your ticket...
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginLeft: 12,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  sendButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  eventInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    padding: 16,
    margin: 16,
    borderRadius: 12,
  },
  eventTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 8,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.infoLight,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 8,
  },
  form: {
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  textArea: {
    height: 120,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 20,
  },
  examples: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  examplesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  exampleCard: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  exampleText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});
