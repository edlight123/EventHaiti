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
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { COLORS } from '../../config/brand';
import { db } from '../../config/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { useI18n } from '../../contexts/I18nContext';

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

  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!title.trim()) {
      Alert.alert(t('common.error'), t('organizerSendUpdate.errors.missingTitle'));
      return;
    }

    if (!message.trim()) {
      Alert.alert(t('common.error'), t('organizerSendUpdate.errors.missingMessage'));
      return;
    }

    Alert.alert(
      t('organizerSendUpdate.confirm.title'),
      t('organizerSendUpdate.confirm.body'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.send'),
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
                  title: `${t('organizerSendUpdate.notificationTitlePrefix')}${eventTitle}`,
                  message: title,
                  eventId: eventId,
                  isRead: false,
                  createdAt: serverTimestamp(),
                })
              );

              await Promise.all(notificationPromises);

              Alert.alert(
                t('common.success'),
                attendeeIds.size === 1
                  ? t('organizerSendUpdate.success.bodySingular')
                  : `${t('organizerSendUpdate.success.bodyPluralPrefix')}${attendeeIds.size}${t('organizerSendUpdate.success.bodyPluralSuffix')}`,
                [
                  {
                    text: t('common.ok'),
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } catch (error: any) {
              console.error('Error sending update:', error);
              Alert.alert(t('common.error'), t('organizerSendUpdate.errors.sendFailed'));
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
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="close" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('organizerSendUpdate.headerTitle')}</Text>
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
            <Text style={styles.sendButtonText}>{t('common.send')}</Text>
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
            {t('organizerSendUpdate.infoText')}
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>{t('organizerSendUpdate.fields.titleLabel')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('organizerSendUpdate.fields.titlePlaceholder')}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
            placeholderTextColor={COLORS.textSecondary}
          />
          <Text style={styles.charCount}>{title.length}/100</Text>

          <Text style={styles.label}>{t('organizerSendUpdate.fields.messageLabel')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={t('organizerSendUpdate.fields.messagePlaceholder')}
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
          <Text style={styles.examplesTitle}>{t('organizerSendUpdate.examplesTitle')}</Text>
          <TouchableOpacity
            style={styles.exampleCard}
            onPress={() => {
              setTitle(t('organizerSendUpdate.examples.venueChange.title'));
              setMessage(
                t('organizerSendUpdate.examples.venueChange.message')
              );
            }}
          >
            <Text style={styles.exampleTitle}>{t('organizerSendUpdate.examples.venueChange.cardTitle')}</Text>
            <Text style={styles.exampleText} numberOfLines={2}>
              {t('organizerSendUpdate.examples.venueChange.cardPreview')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exampleCard}
            onPress={() => {
              setTitle(t('organizerSendUpdate.examples.timeUpdate.title'));
              setMessage(t('organizerSendUpdate.examples.timeUpdate.message'));
            }}
          >
            <Text style={styles.exampleTitle}>{t('organizerSendUpdate.examples.timeUpdate.cardTitle')}</Text>
            <Text style={styles.exampleText} numberOfLines={2}>
              {t('organizerSendUpdate.examples.timeUpdate.cardPreview')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exampleCard}
            onPress={() => {
              setTitle(t('organizerSendUpdate.examples.reminder.title'));
              setMessage(
                t('organizerSendUpdate.examples.reminder.message')
              );
            }}
          >
            <Text style={styles.exampleTitle}>{t('organizerSendUpdate.examples.reminder.cardTitle')}</Text>
            <Text style={styles.exampleText} numberOfLines={2}>
              {t('organizerSendUpdate.examples.reminder.cardPreview')}
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
    paddingTop: 16,
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
