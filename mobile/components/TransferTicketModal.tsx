import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Alert,
  Share,
} from 'react-native';
import { X, Send, Copy, AlertCircle } from 'lucide-react-native';
import { COLORS } from '../config/brand';

interface TransferTicketModalProps {
  visible: boolean;
  onClose: () => void;
  ticketId: string;
  eventTitle: string;
  transferCount?: number;
}

export default function TransferTicketModal({
  visible,
  onClose,
  ticketId,
  eventTitle,
  transferCount = 0,
}: TransferTicketModalProps) {
  const [toEmail, setToEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transferLink, setTransferLink] = useState('');
  const [showLink, setShowLink] = useState(false);

  const handleTransfer = async () => {
    if (!toEmail.trim()) {
      setError('Please enter recipient email');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'https://eventhaiti.com'}/api/tickets/transfer/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId,
          toEmail: toEmail.trim(),
          message: message.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to transfer ticket');
      }

      // Show transfer link if available
      if (data.transfer?.transferToken) {
        const link = `https://eventhaiti.com/tickets/transfer/${data.transfer.transferToken}`;
        setTransferLink(link);
        setShowLink(true);
      } else {
        Alert.alert(
          'Transfer Sent!',
          `Transfer request sent to ${toEmail}. They have 24 hours to accept.`,
          [
            {
              text: 'OK',
              onPress: () => {
                onClose();
                setToEmail('');
                setMessage('');
              },
            },
          ]
        );
      }
    } catch (err: any) {
      setError(err.message || 'Failed to transfer ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    Alert.alert('Link Copied', 'Transfer link copied to clipboard');
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `I'm transferring my ticket for ${eventTitle} to you! Click here to accept: ${transferLink}\n\n⏰ This link expires in 24 hours.`,
        title: `Ticket Transfer: ${eventTitle}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const canTransfer = transferCount < 3;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Transfer Ticket</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {!showLink ? (
              <>
                {/* Warning Box */}
                {transferCount > 0 && (
                  <View style={styles.warningBox}>
                    <AlertCircle size={16} color="#F59E0B" />
                    <Text style={styles.warningText}>
                      This ticket has been transferred {transferCount} time(s). Maximum: 3 transfers
                    </Text>
                  </View>
                )}

                {!canTransfer && (
                  <View style={[styles.warningBox, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
                    <AlertCircle size={16} color="#DC2626" />
                    <Text style={[styles.warningText, { color: '#DC2626' }]}>
                      This ticket has reached the maximum transfer limit
                    </Text>
                  </View>
                )}

                <Text style={styles.description}>
                  Transfer your ticket for <Text style={styles.bold}>{eventTitle}</Text> to another person.
                </Text>

                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    ⏰ Transfer links expire in 24 hours{'\n'}
                    🔒 Once transferred, you will lose access to this ticket
                  </Text>
                </View>

                {/* Email Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Recipient Email *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="friend@example.com"
                    placeholderTextColor={COLORS.textSecondary}
                    value={toEmail}
                    onChangeText={setToEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={canTransfer}
                  />
                </View>

                {/* Message Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Message (Optional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Add a personal message..."
                    placeholderTextColor={COLORS.textSecondary}
                    value={message}
                    onChangeText={setMessage}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    editable={canTransfer}
                  />
                </View>

                {/* Error Message */}
                {error && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={onClose}
                    disabled={loading}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.transferButton,
                      (!canTransfer || loading) && styles.buttonDisabled,
                    ]}
                    onPress={handleTransfer}
                    disabled={!canTransfer || loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <>
                        <Send size={18} color="#FFF" />
                        <Text style={styles.transferButtonText}>Send Transfer</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                {/* Transfer Success - Show Link */}
                <View style={styles.successBox}>
                  <Text style={styles.successIcon}>✅</Text>
                  <Text style={styles.successTitle}>Transfer Initiated!</Text>
                  <Text style={styles.successText}>
                    Email sent to {toEmail}. You can also share this link:
                  </Text>
                </View>

                <View style={styles.linkBox}>
                  <Text style={styles.linkText} numberOfLines={2}>
                    {transferLink}
                  </Text>
                  <TouchableOpacity onPress={handleCopyLink} style={styles.copyButton}>
                    <Copy size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    ⏰ This link expires in 24 hours
                  </Text>
                </View>

                <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                  <Text style={styles.shareButtonText}>Share via WhatsApp / SMS</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.doneButton]}
                  onPress={() => {
                    onClose();
                    setToEmail('');
                    setMessage('');
                    setShowLink(false);
                    setTransferLink('');
                  }}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '600',
    color: COLORS.text,
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  textArea: {
    height: 80,
    paddingTop: 12,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  cancelButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  transferButton: {
    backgroundColor: COLORS.primary,
  },
  transferButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  successBox: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 16,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 12,
  },
  linkText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  copyButton: {
    padding: 8,
  },
  shareButton: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  doneButton: {
    backgroundColor: COLORS.primary,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
