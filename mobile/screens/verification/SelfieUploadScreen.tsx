import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { COLORS } from '../../config/brand';
import { useAuth } from '../../contexts/AuthContext';
import SelfieCameraWithGuide from '../../components/SelfieCameraWithGuide';
import * as ImagePicker from 'expo-image-picker';
import {
  updateVerificationFiles,
  updateVerificationStep,
  getDocumentDownloadURL,
  getVerificationRequest,
} from '../../lib/verification';

type RouteParams = {
  SelfieUpload: {
    onComplete?: () => void;
  };
};

export default function SelfieUploadScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'SelfieUpload'>>();
  const { userProfile } = useAuth();
  const [selfiePath, setSelfiePath] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  useEffect(() => {
    loadExistingSelfie();
  }, [userProfile?.id]);

  const loadExistingSelfie = async () => {
    if (!userProfile?.id) return;

    try {
      const request = await getVerificationRequest(userProfile.id);
      if (request?.files?.selfie?.path) {
        const path = request.files.selfie.path;
        setSelfiePath(path);
        const url = await getDocumentDownloadURL(path);
        setSelfiePreview(url);
      }
    } catch (error) {
      console.error('Error loading existing selfie:', error);
    }
  };

  const uploadImageFromUri = async (uri: string) => {
    if (!userProfile?.id) return;

    try {
      setUploading(true);

      // Fetch the image as blob
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error('Failed to fetch image');
      }
      const blob = await response.blob();

      // Upload to storage using the same logic
      const { storage } = await import('../../config/firebase');
      const { ref, uploadBytes } = await import('firebase/storage');
      
      const timestamp = Date.now();
      const extension = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `selfie_${timestamp}.${extension}`;
      const storagePath = `verification/${userProfile.id}/${fileName}`;
      const storageRef = ref(storage, storagePath);

      const metadata = {
        contentType: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
        customMetadata: {
          uploadedAt: new Date().toISOString(),
          documentType: 'selfie',
        },
      };

      await uploadBytes(storageRef, blob, metadata);
      setSelfiePath(storagePath);

      // Get preview URL
      const url = await getDocumentDownloadURL(storagePath);
      setSelfiePreview(url);

      // Update Firestore
      await updateVerificationFiles(userProfile.id, {
        selfie: {
          path: storagePath,
          uploadedAt: new Date(),
        },
      });

      Alert.alert('Success', 'Selfie uploaded successfully');
    } catch (error: any) {
      console.error('[Selfie Upload] Error details:', {
        message: error.message,
        code: error.code,
        name: error.name,
      });
      Alert.alert('Upload Error', error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleCameraCapture = (uri: string) => {
    setShowCamera(false);
    uploadImageFromUri(uri);
  };

  const handleLibraryPick = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImageFromUri(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('[Library Pick] Error:', error);
      Alert.alert('Error', 'Failed to pick image from library');
    }
  };

  const showUploadOptions = () => {
    Alert.alert('Upload Selfie', 'Choose an option', [
      {
        text: 'Take Selfie with Camera',
        onPress: () => setShowCamera(true),
      },
      {
        text: 'Choose from Library',
        onPress: () => handleLibraryPick(),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleContinue = async () => {
    if (!selfiePath) {
      Alert.alert('Missing Image', 'Please upload a selfie with your ID');
      return;
    }

    if (!userProfile?.id) return;

    try {
      setSaving(true);

      // Mark step as complete
      await updateVerificationStep(userProfile.id, 'selfie', {
        status: 'complete',
        missingFields: [],
      });

      Alert.alert('Success', 'Identity verification completed', [
        {
          text: 'OK',
          onPress: () => {
            if (route.params?.onComplete) {
              route.params.onComplete();
            }
            navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      console.error('Error saving:', error);
      Alert.alert('Error', 'Failed to save verification step');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Identity Verification</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Facial Guide Visual */}
        <View style={styles.guideVisual}>
          <Text style={styles.guideTitle}>Position Your Face</Text>
          <View style={styles.ovalContainer}>
            <View style={styles.ovalGuide}>
              {/* Horizontal center line */}
              <View style={styles.horizontalLine} />
              {/* Vertical center line */}
              <View style={styles.verticalLine} />
              <Ionicons 
                name="person" 
                size={80} 
                color={COLORS.primary} 
                style={styles.personIcon}
              />
            </View>
          </View>
          <Text style={styles.guideSubtitle}>
            Center your face in the oval when taking the selfie
          </Text>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Ionicons name="camera" size={32} color={COLORS.primary} />
          <Text style={styles.instructionsTitle}>Selfie Instructions</Text>
          <View style={styles.tipsList}>
            <Text style={styles.tipItem}>✓ Camera will open in selfie mode</Text>
            <Text style={styles.tipItem}>✓ Hold your ID next to your face</Text>
            <Text style={styles.tipItem}>✓ Center your face in the guide lines</Text>
            <Text style={styles.tipItem}>✓ Make sure your face is clearly visible</Text>
            <Text style={styles.tipItem}>✓ Ensure the ID text is readable</Text>
            <Text style={styles.tipItem}>✓ Use good lighting, remove sunglasses/hat</Text>
            <Text style={styles.tipItem}>✓ Look directly at the camera</Text>
          </View>
        </View>

        {/* Selfie Upload */}
        <View style={styles.uploadSection}>
          <Text style={styles.uploadLabel}>Selfie with ID *</Text>
          {selfiePreview ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: selfiePreview }} style={styles.preview} />
              <TouchableOpacity
                style={styles.changeButton}
                onPress={showUploadOptions}
                disabled={uploading}
              >
                <Ionicons name="camera" size={20} color={COLORS.primary} />
                <Text style={styles.changeButtonText}>Retake Selfie</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={showUploadOptions}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={64} color={COLORS.primary} />
                  <Text style={styles.uploadButtonText}>Take Selfie with ID</Text>
                  <Text style={styles.uploadButtonSubtext}>
                    Hold your ID next to your face
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Example */}
        <View style={styles.exampleCard}>
          <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
          <View style={styles.exampleText}>
            <Text style={styles.exampleTitle}>Good Example:</Text>
            <Text style={styles.exampleDescription}>
              Face and ID are both clearly visible and in focus. The photo is well-lit
              without glare.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            (!selfiePath || uploading || saving) && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selfiePath || uploading || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.continueButtonText}>Save & Continue</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Camera Modal with Facial Guide */}
      <Modal
        visible={showCamera}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <SelfieCameraWithGuide
          onCapture={handleCameraCapture}
          onCancel={() => setShowCamera(false)}
        />
      </Modal>
    </View>
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
    padding: 16,
    paddingTop: 60,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  guideVisual: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  guideTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  ovalContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  ovalGuide: {
    width: Dimensions.get('window').width * 0.5,
    height: Dimensions.get('window').width * 0.65,
    borderRadius: (Dimensions.get('window').width * 0.5) / 2,
    borderWidth: 3,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  horizontalLine: {
    position: 'absolute',
    width: '60%',
    height: 2,
    backgroundColor: COLORS.primary,
    opacity: 0.4,
  },
  verticalLine: {
    position: 'absolute',
    width: 2,
    height: '60%',
    backgroundColor: COLORS.primary,
    opacity: 0.4,
  },
  personIcon: {
    opacity: 0.3,
  },
  guideSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  instructionsCard: {
    padding: 16,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 8,
    marginBottom: 12,
  },
  tipsList: {
    alignSelf: 'stretch',
  },
  tipItem: {
    fontSize: 14,
    color: COLORS.primary,
    marginBottom: 4,
  },
  uploadSection: {
    marginBottom: 24,
  },
  uploadLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  uploadButton: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  uploadButtonSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  previewContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  preview: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  changeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 8,
  },
  exampleCard: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.success + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.success + '30',
  },
  exampleText: {
    flex: 1,
    marginLeft: 12,
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
    marginBottom: 4,
  },
  exampleDescription: {
    fontSize: 13,
    color: COLORS.success,
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  continueButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: COLORS.textSecondary,
    opacity: 0.5,
  },
  continueButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
