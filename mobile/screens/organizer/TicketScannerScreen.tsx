import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { COLORS } from '../../config/brand';
import { db } from '../../config/firebase';
import { doc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';

type RouteParams = {
  TicketScanner: {
    eventId: string;
  };
};

type ScanResult = {
  status: 'VALID' | 'ALREADY_CHECKED_IN' | 'EXPIRED' | 'CANCELLED' | 'WRONG_EVENT' | 'NOT_FOUND' | 'ERROR';
  attendeeName?: string;
  tierName?: string;
  message?: string;
  checkedInTime?: Date;
  ticketId?: string;
};

export default function TicketScannerScreen() {
  const route = useRoute<RouteProp<RouteParams, 'TicketScanner'>>();
  const navigation = useNavigation();
  const { eventId } = route.params;

  const [permission, requestPermission] = useCameraPermissions();
  const [flashOn, setFlashOn] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    // Prevent multiple scans
    if (isProcessing) return;

    setIsProcessing(true);
    Vibration.vibrate(200);

    try {
      const ticketId = data;

      // DEBUG: Log scan details
      console.log('=== TICKET SCAN DEBUG ===');
      console.log('QR Code Data:', ticketId);
      console.log('Looking in collection: tickets');
      console.log('Event ID:', eventId);
      console.log('Firestore Config:', {
        projectId: db.app.options.projectId,
        databaseId: db.app.options.databaseId || '(default)',
      });

      // Get ticket from Firestore
      const ticketRef = doc(db, 'tickets', ticketId);
      console.log('Ticket Ref Path:', ticketRef.path);
      
      const ticketSnap = await getDoc(ticketRef);
      console.log('Document exists:', ticketSnap.exists());

      if (!ticketSnap.exists()) {
        console.log('Ticket not found in Firestore');
        setScanResult({
          status: 'NOT_FOUND',
          message: 'This ticket does not exist.',
        });
        return;
      }

      const ticketData = ticketSnap.data();
      console.log('Ticket Data:', JSON.stringify(ticketData, null, 2));
      console.log('=== END DEBUG ===');

      const ticketData = ticketSnap.data();

      // Verify ticket belongs to this event
      if (ticketData.event_id !== eventId) {
        setScanResult({
          status: 'WRONG_EVENT',
          message: 'This ticket is for a different event.',
        });
        return;
      }

      // Check if event has ended (ticket expired)
      const now = new Date();
      const eventEnd = new Date(ticketData.end_datetime || ticketData.event_date || ticketData.start_datetime);
      if (now > eventEnd) {
        setScanResult({
          status: 'EXPIRED',
          attendeeName: ticketData.attendee_name || 'Attendee',
          tierName: ticketData.tier_name || 'General Admission',
          message: 'Event has already ended. This ticket cannot be checked in.',
        });
        return;
      }

      // Check if already checked in
      if (ticketData.checked_in_at) {
        const checkedInTime = ticketData.checked_in_at.toDate
          ? ticketData.checked_in_at.toDate()
          : new Date(ticketData.checked_in_at);
        
        setScanResult({
          status: 'ALREADY_CHECKED_IN',
          attendeeName: ticketData.attendee_name || 'Attendee',
          tierName: ticketData.tier_name || 'General Admission',
          checkedInTime,
          message: `Already checked in at ${checkedInTime.toLocaleString()}`,
        });
        return;
      }

      // Check ticket status
      if (ticketData.status === 'cancelled') {
        setScanResult({
          status: 'CANCELLED',
          attendeeName: ticketData.attendee_name || 'Attendee',
          tierName: ticketData.tier_name || 'General Admission',
          message: 'This ticket has been cancelled.',
        });
        return;
      }

      // Valid ticket - ready to check in
      setScanResult({
        status: 'VALID',
        attendeeName: ticketData.attendee_name || 'Attendee',
        tierName: ticketData.tier_name || 'General Admission',
        ticketId,
      });

    } catch (error: any) {
      console.error('Error checking in ticket:', error);
      setScanResult({
        status: 'ERROR',
        message: error.message || 'Failed to scan ticket. Please try again.',
      });
    }
  };

  const handleConfirmCheckIn = async () => {
    if (!scanResult || scanResult.status !== 'VALID' || !scanResult.ticketId) return;

    try {
      const ticketRef = doc(db, 'tickets', scanResult.ticketId);
      await updateDoc(ticketRef, {
        checked_in_at: Timestamp.now(),
        status: 'checked_in',
      });

      Vibration.vibrate([0, 100, 100, 100]);
      
      // Show success state briefly
      setScanResult({
        ...scanResult,
        status: 'ALREADY_CHECKED_IN',
        message: 'Check-in successful!',
      });

      // Auto-close after 1.5 seconds
      setTimeout(() => {
        handleCloseSheet();
      }, 1500);
    } catch (error: any) {
      console.error('Error checking in ticket:', error);
      setScanResult({
        status: 'ERROR',
        message: error.message || 'Failed to check in ticket. Please try again.',
      });
    }
  };

  const handleCloseSheet = () => {
    setScanResult(null);
    setIsProcessing(false);
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Ionicons name="camera-outline" size={64} color={COLORS.textSecondary} />
        <Text style={styles.message}>Camera permission is required to scan tickets</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        enableTorch={flashOn}
        onBarcodeScanned={isProcessing ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      >
        <View style={styles.overlay}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.topButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="close" size={28} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.topBarTitle}>Scan Ticket</Text>
            <TouchableOpacity
              style={styles.topButton}
              onPress={() => setFlashOn(!flashOn)}
            >
              <Ionicons
                name={flashOn ? 'flash' : 'flash-off'}
                size={24}
                color={COLORS.white}
              />
            </TouchableOpacity>
          </View>

          {/* Scanning frame */}
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>

          {/* Instructions */}
          <View style={styles.instructionContainer}>
            <Text style={styles.instruction}>
              {isProcessing
                ? 'Processing...'
                : 'Position the QR code within the frame'}
            </Text>
          </View>
        </View>
      </CameraView>

      {/* Bottom sheet modal */}
      <Modal
        visible={scanResult !== null}
        transparent
        animationType="slide"
        onRequestClose={handleCloseSheet}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1}
            onPress={handleCloseSheet}
          />
          <View style={styles.bottomSheet}>
            {/* Status Icon */}
            <View style={styles.sheetHeader}>
              <Ionicons
                name={
                  scanResult?.status === 'VALID' || scanResult?.status === 'ALREADY_CHECKED_IN'
                    ? 'checkmark-circle'
                    : 'alert-circle'
                }
                size={64}
                color={
                  scanResult?.status === 'VALID'
                    ? COLORS.success
                    : scanResult?.status === 'ALREADY_CHECKED_IN'
                    ? COLORS.info
                    : COLORS.error
                }
              />
            </View>

            {/* Ticket Details */}
            <View style={styles.sheetContent}>
              {scanResult?.attendeeName && (
                <Text style={styles.attendeeName}>{scanResult.attendeeName}</Text>
              )}
              {scanResult?.tierName && (
                <Text style={styles.tierName}>{scanResult.tierName}</Text>
              )}
              {scanResult?.message && (
                <Text style={styles.message}>{scanResult.message}</Text>
              )}
              
              {isProcessing && scanResult?.status === 'VALID' && (
                <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.sheetActions}>
              {scanResult?.status === 'VALID' && !scanResult.message?.includes('successful') ? (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.primaryButton]}
                    onPress={handleConfirmCheckIn}
                  >
                    <Text style={styles.primaryButtonText}>Confirm Check-in</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.secondaryButton]}
                    onPress={handleCloseSheet}
                  >
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.actionButton, styles.primaryButton]}
                  onPress={handleCloseSheet}
                >
                  <Text style={styles.primaryButtonText}>Close</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    marginVertical: 20,
    paddingHorizontal: 40,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  topButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  scanFrame: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderColor: COLORS.white,
  },
  cornerTopLeft: {
    top: '30%',
    left: '15%',
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTopRight: {
    top: '30%',
    right: '15%',
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBottomLeft: {
    bottom: '30%',
    left: '15%',
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBottomRight: {
    bottom: '30%',
    right: '15%',
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instructionContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instruction: {
    fontSize: 16,
    color: COLORS.white,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalBackdrop: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingBottom: 40,
    paddingHorizontal: 24,
    minHeight: 300,
  },
  sheetHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetContent: {
    alignItems: 'center',
    marginBottom: 24,
  },
  attendeeName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  tierName: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  loader: {
    marginTop: 16,
  },
  sheetActions: {
    gap: 12,
  },
  actionButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
