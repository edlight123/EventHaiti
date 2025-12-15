import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { COLORS } from '../../config/brand';
import { useAuth } from '../../contexts/AuthContext';
import {
  pickAndUploadImage,
  updateVerificationFiles,
  updateVerificationStep,
  getDocumentDownloadURL,
  getVerificationRequest,
} from '../../lib/verification';

type RouteParams = {
  GovernmentIDUpload: {
    onComplete?: () => void;
  };
};

export default function GovernmentIDUploadScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'GovernmentIDUpload'>>();
  const { userProfile } = useAuth();
  const [frontPath, setFrontPath] = useState<string | null>(null);
  const [backPath, setBackPath] = useState<string | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadExistingImages();
  }, [userProfile?.id]);

  const loadExistingImages = async () => {
    if (!userProfile?.id) return;

    try {
      const request = await getVerificationRequest(userProfile.id);
      if (request?.files?.governmentId) {
        const { front, back } = request.files.governmentId;
        
        if (front) {
          setFrontPath(front);
          const url = await getDocumentDownloadURL(front);
          setFrontPreview(url);
        }
        
        if (back) {
          setBackPath(back);
          const url = await getDocumentDownloadURL(back);
          setBackPreview(url);
        }
      }
    } catch (error) {
      console.error('Error loading existing images:', error);
    }
  };

  const handleUploadFront = async (useCamera: boolean) => {
    if (!userProfile?.id) return;

    try {
      setUploading(true);
      const storagePath = await pickAndUploadImage(userProfile.id, 'id_front', useCamera);
      setFrontPath(storagePath);

      // Get preview URL
      const url = await getDocumentDownloadURL(storagePath);
      setFrontPreview(url);

      // Update Firestore
      await updateVerificationFiles(userProfile.id, {
        governmentId: {
          front: storagePath,
          back: backPath || undefined,
          uploadedAt: new Date(),
        },
      });

      Alert.alert('Success', 'ID front uploaded successfully');
    } catch (error: any) {
      console.error('[ID Front Upload] Error details:', {
        message: error.message,
        code: error.code,
        name: error.name,
      });
      if (error.message !== 'Image selection cancelled') {
        const errorMsg = error.message || 'Failed to upload image';
        Alert.alert('Upload Error', errorMsg);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleUploadBack = async (useCamera: boolean) => {
    if (!userProfile?.id) return;

    try {
      setUploading(true);
      const storagePath = await pickAndUploadImage(userProfile.id, 'id_back', useCamera);
      setBackPath(storagePath);

      // Get preview URL
      const url = await getDocumentDownloadURL(storagePath);
      setBackPreview(url);

      // Update Firestore
      await updateVerificationFiles(userProfile.id, {
        governmentId: {
          front: frontPath || undefined,
          back: storagePath,
          uploadedAt: new Date(),
        },
      });

      Alert.alert('Success', 'ID back uploaded successfully');
    } catch (error: any) {
      console.error('[ID Back Upload] Error details:', {
        message: error.message,
        code: error.code,
        name: error.name,
      });
      if (error.message !== 'Image selection cancelled') {
        const errorMsg = error.message || 'Failed to upload image';
        Alert.alert('Upload Error', errorMsg);
      }
    } finally {
      setUploading(false);
    }
  };

  const showUploadOptions = (side: 'front' | 'back') => {
    Alert.alert(
      `Upload ID ${side === 'front' ? 'Front' : 'Back'}`,
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: () => {
            if (side === 'front') {
              handleUploadFront(true);
            } else {
              handleUploadBack(true);
            }
          },
        },
        {
          text: 'Choose from Library',
          onPress: () => {
            if (side === 'front') {
              handleUploadFront(false);
            } else {
              handleUploadBack(false);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleContinue = async () => {
    if (!frontPath || !backPath) {
      Alert.alert('Missing Images', 'Please upload both front and back of your ID');
      return;
    }

    if (!userProfile?.id) return;

    try {
      setSaving(true);

      // Mark step as complete
      await updateVerificationStep(userProfile.id, 'governmentId', {
        status: 'complete',
        missingFields: [],
      });

      Alert.alert('Success', 'Government ID uploaded successfully', [
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
        <Text style={styles.headerTitle}>Government ID</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Ionicons name="information-circle" size={32} color={COLORS.primary} />
          <Text style={styles.instructionsTitle}>Photo Tips</Text>
          <View style={styles.tipsList}>
            <Text style={styles.tipItem}>✓ Ensure all text is clearly readable</Text>
            <Text style={styles.tipItem}>✓ Use good lighting (avoid glare)</Text>
            <Text style={styles.tipItem}>✓ Place ID on a contrasting background</Text>
            <Text style={styles.tipItem}>✓ Photo should not be blurry or cropped</Text>
          </View>
        </View>

        {/* Front Upload */}
        <View style={styles.uploadSection}>
          <Text style={styles.uploadLabel}>ID Front *</Text>
          {frontPreview ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: frontPreview }} style={styles.preview} />
              <TouchableOpacity
                style={styles.changeButton}
                onPress={() => showUploadOptions('front')}
                disabled={uploading}
              >
                <Ionicons name="camera" size={20} color={COLORS.primary} />
                <Text style={styles.changeButtonText}>Change Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => showUploadOptions('front')}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={48} color={COLORS.primary} />
                  <Text style={styles.uploadButtonText}>Upload ID Front</Text>
                  <Text style={styles.uploadButtonSubtext}>
                    Take a photo or choose from library
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Back Upload */}
        <View style={styles.uploadSection}>
          <Text style={styles.uploadLabel}>ID Back *</Text>
          {backPreview ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: backPreview }} style={styles.preview} />
              <TouchableOpacity
                style={styles.changeButton}
                onPress={() => showUploadOptions('back')}
                disabled={uploading}
              >
                <Ionicons name="camera" size={20} color={COLORS.primary} />
                <Text style={styles.changeButtonText}>Change Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => showUploadOptions('back')}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={48} color={COLORS.primary} />
                  <Text style={styles.uploadButtonText}>Upload ID Back</Text>
                  <Text style={styles.uploadButtonSubtext}>
                    Take a photo or choose from library
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Continue Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            (!frontPath || !backPath || uploading || saving) && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!frontPath || !backPath || uploading || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.continueButtonText}>Save & Continue</Text>
          )}
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
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 12,
  },
  uploadButtonSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
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
    height: 200,
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
