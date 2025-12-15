import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../config/brand';
import { useAuth } from '../../contexts/AuthContext';
import {
  getVerificationRequest,
  initializeVerificationRequest,
  submitVerificationForReview,
  type VerificationRequest,
} from '../../lib/verification';

type Step = 'overview' | 'organizerInfo' | 'governmentId' | 'selfie' | 'review';

export default function OrganizerVerificationScreen() {
  const navigation = useNavigation();
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<VerificationRequest | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>('overview');

  useEffect(() => {
    loadVerificationRequest();
  }, [userProfile?.id]);

  const loadVerificationRequest = async () => {
    if (!userProfile?.id) return;

    try {
      let verificationRequest = await getVerificationRequest(userProfile.id);

      // Initialize if doesn't exist
      if (!verificationRequest) {
        verificationRequest = await initializeVerificationRequest(userProfile.id);
      }

      setRequest(verificationRequest);

      // Redirect if already approved
      if (verificationRequest.status === 'approved') {
        Alert.alert(
          'Already Verified',
          'Your organizer account is already verified!',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }
    } catch (error) {
      console.error('Error loading verification:', error);
      Alert.alert('Error', 'Failed to load verification data');
    } finally {
      setLoading(false);
    }
  };

  const getStepStatus = (stepId: keyof VerificationRequest['steps']) => {
    if (!request) return 'incomplete';
    return request.steps[stepId].status;
  };

  const isStepComplete = (stepId: keyof VerificationRequest['steps']) => {
    return getStepStatus(stepId) === 'complete';
  };

  const calculateProgress = () => {
    if (!request) return 0;
    const steps = Object.values(request.steps).filter((s: any) => s.required);
    const completed = steps.filter((s: any) => s.status === 'complete').length;
    return Math.round((completed / steps.length) * 100);
  };

  const canSubmit = () => {
    if (!request) return false;
    const requiredSteps = Object.values(request.steps).filter((s: any) => s.required);
    return requiredSteps.every((s: any) => s.status === 'complete');
  };

  const renderStepIcon = (stepId: keyof VerificationRequest['steps']) => {
    const status = getStepStatus(stepId);
    if (status === 'complete') {
      return <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />;
    } else if (status === 'needs_attention') {
      return <Ionicons name="alert-circle" size={24} color={COLORS.warning} />;
    }
    return <Ionicons name="ellipse-outline" size={24} color={COLORS.textSecondary} />;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading verification...</Text>
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
        <Text style={styles.errorText}>Failed to load verification data</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadVerificationRequest}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (currentStep === 'overview') {
    return (
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Become an Organizer</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusTitle}>Verification Progress</Text>
            <Text style={styles.statusPercentage}>{calculateProgress()}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${calculateProgress()}%` }]}
            />
          </View>
          {request.status === 'pending' && (
            <View style={styles.statusBadge}>
              <Ionicons name="time-outline" size={16} color={COLORS.warning} />
              <Text style={styles.statusBadgeText}>Under Review</Text>
            </View>
          )}
          {request.status === 'approved' && (
            <View style={[styles.statusBadge, { backgroundColor: COLORS.success + '20' }]}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={[styles.statusBadgeText, { color: COLORS.success }]}>
                Approved
              </Text>
            </View>
          )}
        </View>

        {/* Steps */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verification Steps</Text>

          <TouchableOpacity
            style={styles.stepCard}
            onPress={() => (navigation as any).navigate('OrganizerInfoForm', {
              onComplete: loadVerificationRequest,
            })}
          >
            <View style={styles.stepIcon}>{renderStepIcon('organizerInfo')}</View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Organizer Information</Text>
              <Text style={styles.stepDescription}>
                Basic information about you and your organization
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.stepCard}
            onPress={() => (navigation as any).navigate('GovernmentIDUpload', {
              onComplete: loadVerificationRequest,
            })}
          >
            <View style={styles.stepIcon}>{renderStepIcon('governmentId')}</View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Government ID</Text>
              <Text style={styles.stepDescription}>
                Upload front and back of your ID
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.stepCard}
            onPress={() => (navigation as any).navigate('SelfieUpload', {
              onComplete: loadVerificationRequest,
            })}
          >
            <View style={styles.stepIcon}>{renderStepIcon('selfie')}</View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Identity Verification</Text>
              <Text style={styles.stepDescription}>
                Take a selfie holding your ID
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Submit Button */}
        {canSubmit() && request.status !== 'pending' && (
          <View style={styles.submitSection}>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={async () => {
                Alert.alert(
                  'Submit Application',
                  'Are you ready to submit your organizer application for review?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Submit',
                      onPress: async () => {
                        try {
                          if (!userProfile?.id) return;
                          await submitVerificationForReview(userProfile.id);
                          Alert.alert(
                            'Success',
                            'Your application has been submitted for review. We will notify you once it is processed.',
                            [{ text: 'OK', onPress: () => navigation.goBack() }]
                          );
                        } catch (error) {
                          console.error('Error submitting:', error);
                          Alert.alert('Error', 'Failed to submit application');
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={styles.submitButtonText}>Submit for Review</Text>
            </TouchableOpacity>
          </View>
        )}

        {request.status === 'pending' && (
          <View style={styles.pendingNotice}>
            <Ionicons name="time-outline" size={24} color={COLORS.warning} />
            <Text style={styles.pendingText}>
              Your application is under review. We'll notify you once it's processed.
            </Text>
          </View>
        )}
      </ScrollView>
    );
  }

  // Render specific step screens
  if (currentStep === 'organizerInfo') {
    return (
      <View style={styles.container}>
        <Text>Organizer Info Form - Coming soon</Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: COLORS.error,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
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
  statusCard: {
    margin: 16,
    padding: 20,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  statusPercentage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  statusBadge: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: COLORS.warning + '20',
    borderRadius: 8,
  },
  statusBadgeText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.warning,
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stepIcon: {
    marginRight: 12,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  submitSection: {
    padding: 16,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  pendingNotice: {
    margin: 16,
    padding: 16,
    backgroundColor: COLORS.warning + '20',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pendingText: {
    marginLeft: 12,
    flex: 1,
    fontSize: 14,
    color: COLORS.warning,
  },
});
