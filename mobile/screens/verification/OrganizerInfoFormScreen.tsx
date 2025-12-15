import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { COLORS } from '../../config/brand';
import { useAuth } from '../../contexts/AuthContext';
import {
  updateVerificationStep,
  getVerificationRequest,
} from '../../lib/verification';

type RouteParams = {
  OrganizerInfoForm: {
    onComplete?: () => void;
  };
};

export default function OrganizerInfoFormScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'OrganizerInfoForm'>>();
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [organizationType, setOrganizationType] = useState('individual');
  const [description, setDescription] = useState('');

  useEffect(() => {
    loadExistingData();
  }, [userProfile?.id]);

  const loadExistingData = async () => {
    if (!userProfile?.id) return;

    try {
      const request = await getVerificationRequest(userProfile.id);
      if (request?.steps?.organizerInfo?.fields) {
        const fields = request.steps.organizerInfo.fields;
        setFullName(fields.full_name || userProfile?.full_name || '');
        setPhone(fields.phone || userProfile?.phone_number || '');
        setOrganizationName(fields.organization_name || '');
        setOrganizationType(fields.organization_type || 'individual');
        setDescription(fields.description || '');
      } else {
        // Set defaults from profile
        setFullName(userProfile?.full_name || '');
        setPhone(userProfile?.phone_number || '');
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    if (!fullName.trim()) {
      Alert.alert('Missing Information', 'Please enter your full name');
      return false;
    }
    if (!phone.trim()) {
      Alert.alert('Missing Information', 'Please enter your phone number');
      return false;
    }
    if (!organizationName.trim()) {
      Alert.alert('Missing Information', 'Please enter your organization name');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (!userProfile?.id) return;

    try {
      setSaving(true);

      await updateVerificationStep(userProfile.id, 'organizerInfo', {
        status: 'complete',
        fields: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          organization_name: organizationName.trim(),
          organization_type: organizationType,
          description: description.trim(),
        },
        missingFields: [],
      });

      Alert.alert('Success', 'Organizer information saved successfully', [
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
      Alert.alert('Error', 'Failed to save information');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Organizer Information</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionDescription}>
          Tell us about yourself and your organization
        </Text>

        {/* Full Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Full Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter your full name"
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>

        {/* Phone */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Phone Number <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+509 XX XX XXXX"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="phone-pad"
          />
        </View>

        {/* Organization Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Organization Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={organizationName}
            onChangeText={setOrganizationName}
            placeholder="Name of your organization or business"
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>

        {/* Organization Type */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Organization Type</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={[
                styles.radioButton,
                organizationType === 'individual' && styles.radioButtonSelected,
              ]}
              onPress={() => setOrganizationType('individual')}
            >
              <View style={styles.radio}>
                {organizationType === 'individual' && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.radioLabel}>Individual</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.radioButton,
                organizationType === 'business' && styles.radioButtonSelected,
              ]}
              onPress={() => setOrganizationType('business')}
            >
              <View style={styles.radio}>
                {organizationType === 'business' && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.radioLabel}>Business</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Description */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Briefly describe your organization and the type of events you plan to host"
            placeholderTextColor={COLORS.textSecondary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.saveButtonText}>Save & Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
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
  sectionDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  required: {
    color: COLORS.error,
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
    height: 100,
    paddingTop: 12,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  radioButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
  },
  radioButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  radioLabel: {
    fontSize: 14,
    color: COLORS.text,
  },
  footer: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
