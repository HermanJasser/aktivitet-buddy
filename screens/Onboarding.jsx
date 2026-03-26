import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  Modal,
  Keyboard,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const MAX_BIRTH_DATE = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d;
})();

const ACTIVITIES = [
  'Fotball', 'Basket', 'Håndball', 'Volleyball', 'Tennis', 'Padel',
  'Squash', 'Bordtennis', 'Løping', 'Sykling', 'Svømming', 'Trening',
  'Klatring', 'Fjelltur', 'Slalom', 'Randone', 'Skating', 'Skøyting', 'Fisking',
];
const FIRST_STEP_NEW = 1;
const FIRST_STEP_EDIT = 2;
const LAST_STEP_NEW = 5;
const LAST_STEP_EDIT = 4;

export default function OnboardingScreen({ route, navigation, onDone }) {
  const editing = route?.params?.editing ?? false;
  const { session, profile, refreshProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const userId = session?.user?.id;

  const firstStep = editing ? FIRST_STEP_EDIT : FIRST_STEP_NEW;
  const lastStep = editing ? LAST_STEP_EDIT : LAST_STEP_NEW;
  const [step, setStep] = useState(firstStep);
  const [fullName, setFullName] = useState('');
  const [avatarUri, setAvatarUri] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [bio, setBio] = useState('');
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [birthDate, setBirthDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customText, setCustomText] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    if (editing && profile) {
      setFullName(profile.full_name ?? '');
      setBio(profile.bio ?? '');
      setSelectedActivities(profile.preferred_activities ?? []);
      setBirthDate(profile.birth_date ? new Date(profile.birth_date) : null);
      setAvatarUrl(profile.avatar_url ?? null);
    }
  }, [editing, profile]);

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Tillatelse nødvendig', 'Vi trenger tilgang til bildebiblioteket ditt.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  }

  async function uploadAvatar() {
    if (!avatarUri) return avatarUrl;
    setUploading(true);
    try {
      const response = await fetch(avatarUri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      const filePath = `${userId}/avatar.jpg`;
      const { error } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });
      if (error) throw error;
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (e) {
      Alert.alert('Opplastingsfeil', e.message);
      return avatarUrl;
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!fullName.trim()) {
      Alert.alert('Mangler navn', 'Du må fylle inn fullt navn.');
      setStep(1);
      return;
    }
    if (!editing && (!birthDate || birthDate > MAX_BIRTH_DATE)) {
      Alert.alert('Du må være over 18', 'Du må være minst 18 år for å bruke appen.');
      setStep(5);
      return;
    }
    setSaving(true);
    try {
      const uploadedUrl = await uploadAvatar();
      const { error } = await supabase.from('profiles').upsert({
        id: userId,
        full_name: fullName.trim(),
        bio: bio.trim() || null,
        preferred_activities: selectedActivities,
        birth_date: birthDate ? birthDate.toISOString().split('T')[0] : undefined,
        avatar_url: uploadedUrl ?? null,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      await refreshProfile();
      if (editing) navigation.goBack();
      else if (onDone) onDone();
    } catch (e) {
      Alert.alert('Lagringsfeil', e.message);
    } finally {
      setSaving(false);
    }
  }

  function toggleActivity(activity) {
    setSelectedActivities(prev =>
      prev.includes(activity) ? prev.filter(a => a !== activity) : [...prev, activity]
    );
  }

  function addCustomActivity() {
    const trimmed = customText.trim();
    if (!trimmed) return;
    if (!selectedActivities.includes(trimmed)) {
      setSelectedActivities(prev => [...prev, trimmed]);
    }
    setCustomText('');
    setShowCustomInput(false);
  }

  const customActivities = selectedActivities.filter(a => !ACTIVITIES.includes(a));

  function canProceed() {
    if (step === 1) return fullName.trim().length > 0;
    return true;
  }

  function renderProgressDots() {
    return (
      <View style={styles.dots}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === step - firstStep && styles.dotActive, i < step - firstStep && styles.dotDone]}
          />
        ))}
      </View>
    );
  }

  function renderStep() {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Hva heter du?</Text>
            <Text style={styles.stepSubtitle}>Andre vil se dette på profilen din</Text>
            <TextInput
              style={styles.input}
              placeholder="Fullt navn"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              autoFocus
            />
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Legg til profilbilde</Text>
            <Text style={styles.stepSubtitle}>Velg et bilde fra galleriet ditt</Text>
            <TouchableOpacity style={styles.avatarPicker} onPress={pickImage}>
              {avatarUri || avatarUrl ? (
                <Image
                  source={{ uri: avatarUri ?? avatarUrl }}
                  style={styles.avatarPreview}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarPlaceholderText}>📷</Text>
                  <Text style={styles.avatarPlaceholderLabel}>Velg bilde</Text>
                </View>
              )}
            </TouchableOpacity>
            {uploading && <ActivityIndicator color="#7C5CBF" style={{ marginTop: 12 }} />}
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Fortell litt om deg selv</Text>
            <Text style={styles.stepSubtitle}>Bio vises på profilen din</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              placeholder="Skriv en kort bio... (valgfritt)"
              value={bio}
              onChangeText={setBio}
              multiline
              textAlignVertical="top"
            />
          </View>
        );
      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Favorittaktiviteter</Text>
            <Text style={styles.stepSubtitle}>Velg hva du liker å gjøre</Text>
            <View style={styles.chips}>
              {ACTIVITIES.map(activity => (
                <TouchableOpacity
                  key={activity}
                  style={[styles.chip, selectedActivities.includes(activity) && styles.chipSelected]}
                  onPress={() => toggleActivity(activity)}
                >
                  <Text style={[styles.chipText, selectedActivities.includes(activity) && styles.chipTextSelected]}>
                    {activity}
                  </Text>
                </TouchableOpacity>
              ))}
              {customActivities.map(activity => (
                <TouchableOpacity
                  key={activity}
                  style={[styles.chip, styles.chipSelected]}
                  onPress={() => setSelectedActivities(prev => prev.filter(a => a !== activity))}
                >
                  <Text style={[styles.chipText, styles.chipTextSelected]}>{activity} ×</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.chip, showCustomInput && styles.chipSelected]}
                onPress={() => setShowCustomInput(v => !v)}
              >
                <Text style={[styles.chipText, showCustomInput && styles.chipTextSelected]}>
                  + Annet
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      case 5:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Når er du født?</Text>
            <Text style={styles.stepSubtitle}>Du må være minst 18 år for å bruke appen</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
              <Text style={birthDate ? styles.dateButtonText : styles.dateButtonPlaceholder}>
                {birthDate ? birthDate.toLocaleDateString('nb-NO') : 'Velg fødselsdato'}
              </Text>
            </TouchableOpacity>
            {birthDate && birthDate > MAX_BIRTH_DATE && (
              <Text style={styles.ageError}>Du må være minst 18 år gammel</Text>
            )}
          </View>
        );
    }
  }

  const totalSteps = lastStep - firstStep + 1;
  const isLastStep = step === lastStep;
  const isSkippable = step === 3;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 44 }]}
        keyboardShouldPersistTaps="handled"
      >
        {editing && (
          <TouchableOpacity style={[styles.closeButton, { top: 16 }]} onPress={() => navigation.goBack()}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      {!editing && (
          <Text style={styles.welcomeLabel}>Sett opp profil</Text>
        )}
        {renderProgressDots()}
        {renderStep()}
      </ScrollView>

      <Modal
        visible={showCustomInput}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCustomInput(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowCustomInput(false)}
        >
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Legg til aktivitet</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Skriv aktivitet..."
              value={customText}
              onChangeText={setCustomText}
              onSubmitEditing={addCustomActivity}
              returnKeyType="done"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => { setShowCustomInput(false); setCustomText(''); }}
              >
                <Text style={styles.modalCancelText}>Avbryt</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={addCustomActivity}>
                <Text style={styles.modalConfirmText}>Legg til</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowDatePicker(false)}
        />
        <View style={styles.pickerModal}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Fødselsdato</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(false)}>
              <Text style={styles.pickerDone}>Ferdig</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={birthDate ?? MAX_BIRTH_DATE}
            mode="date"
            display="spinner"
            onChange={(_, date) => { if (date) setBirthDate(date); }}
            maximumDate={new Date()}
            textColor="#000000"
          />
        </View>
      </Modal>

      <View style={[styles.footer, { marginBottom: keyboardHeight > 0 ? keyboardHeight + 16 : insets.bottom }]}>
        {step > firstStep && (
          <TouchableOpacity style={styles.backButton} onPress={() => setStep(s => s - 1)}>
            <Text style={styles.backButtonText}>Tilbake</Text>
          </TouchableOpacity>
        )}

        <View style={styles.footerRight}>
          {isSkippable && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => setStep(s => s + 1)}
            >
              <Text style={styles.skipButtonText}>Hopp over</Text>
            </TouchableOpacity>
          )}

          {isLastStep ? (
            <TouchableOpacity
              style={[styles.primaryButton, (saving || !canProceed()) && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {editing ? 'Lagre endringer' : 'Fullfør'}
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.primaryButton, !canProceed() && styles.buttonDisabled]}
              onPress={() => setStep(s => s + 1)}
              disabled={!canProceed()}
            >
              <Text style={styles.primaryButtonText}>Neste</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scroll: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 0,
    paddingBottom: 16,
  },
  welcomeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 20,
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 40,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
  },
  dotActive: {
    backgroundColor: '#7C5CBF',
    width: 24,
  },
  dotDone: {
    backgroundColor: '#4caf50',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1A1A2E',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 28,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  bioInput: {
    height: 120,
    paddingTop: 14,
  },
  avatarPicker: {
    alignSelf: 'center',
  },
  avatarPreview: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#7C5CBF',
  },
  avatarPlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#EDE8FF',
    borderWidth: 2,
    borderColor: '#7C5CBF',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 36,
  },
  avatarPlaceholderLabel: {
    fontSize: 13,
    color: '#7C5CBF',
    marginTop: 6,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
  },
  chipSelected: {
    backgroundColor: '#7C5CBF',
    borderColor: '#7C5CBF',
  },
  chipText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#fff',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 32,
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A2E',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancel: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    color: '#666',
  },
  modalConfirm: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#7C5CBF',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    backgroundColor: '#f9f9f9',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#1A1A2E',
  },
  dateButtonPlaceholder: {
    fontSize: 16,
    color: '#aaa',
  },
  ageError: {
    color: '#e53935',
    fontSize: 13,
    marginTop: 8,
  },
  pickerModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 32,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  pickerDone: {
    fontSize: 16,
    color: '#7C5CBF',
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    left: 24,
    zIndex: 10,
    padding: 4,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  footerRight: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginLeft: 'auto',
  },
  backButton: {
    padding: 14,
  },
  backButtonText: {
    fontSize: 15,
    color: '#666',
  },
  skipButton: {
    padding: 14,
  },
  skipButtonText: {
    fontSize: 15,
    color: '#7C5CBF',
  },
  primaryButton: {
    backgroundColor: '#7C5CBF',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
