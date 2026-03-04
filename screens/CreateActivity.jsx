import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import MapView, { PROVIDER_DEFAULT, Marker } from 'react-native-maps';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';

const ACTIVITY_TYPES = ['Fotball', 'Løping', 'Sykling', 'Tennis', 'Annet'];

const OSLO_REGION = {
  latitude: 59.9139,
  longitude: 10.7522,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function CreateActivity({ navigation }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState(null);
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState(new Date());
  const [pickerMode, setPickerMode] = useState(null); // null | 'date' | 'time'
  const [location, setLocation] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [saving, setSaving] = useState(false);

  async function useMyLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Tilgang nektet', 'Gi tilgang til posisjon i innstillinger.');
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    setShowMap(false);
    Alert.alert('Posisjon hentet', 'Din nåværende posisjon er valgt.');
  }

  function onMapPress(e) {
    setLocation(e.nativeEvent.coordinate);
  }

  function onDateChange(event, selectedDate) {
    if (selectedDate) setScheduledAt(selectedDate);
    if (Platform.OS === 'android') setPickerMode(null);
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('Mangler tittel', 'Fyll inn en tittel for aktiviteten.');
      return;
    }
    if (!type) {
      Alert.alert('Mangler type', 'Velg en aktivitetstype.');
      return;
    }
    if (!location) {
      Alert.alert('Mangler lokasjon', 'Velg en lokasjon for aktiviteten.');
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('activities').insert({
      title: title.trim(),
      type: type.toLowerCase(),
      description: description.trim() || null,
      latitude: location.latitude,
      longitude: location.longitude,
      scheduled_at: scheduledAt.toISOString(),
      user_id: user.id,
    });

    setSaving(false);

    if (error) {
      Alert.alert('Feil', error.message);
    } else {
      navigation.goBack();
    }
  }

  const formattedDate = scheduledAt.toLocaleDateString('nb-NO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const formattedTime = scheduledAt.toLocaleTimeString('nb-NO', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <ScrollView
      style={styles.container}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <Text style={styles.label}>Tittel *</Text>
      <TextInput
        style={styles.input}
        placeholder="F.eks. Fotball på Frogner"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Type *</Text>
      <View style={styles.typeRow}>
        {ACTIVITY_TYPES.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.typeChip, type === t && styles.typeChipActive]}
            onPress={() => setType(t)}
          >
            <Text style={[styles.typeChipText, type === t && styles.typeChipTextActive]}>
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Beskrivelse</Text>
      <TextInput
        style={[styles.input, styles.inputMultiline]}
        placeholder="Valgfri beskrivelse..."
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
        returnKeyType="done"
        blurOnSubmit
      />

      <Text style={styles.label}>Tidspunkt *</Text>
      <View style={styles.dateRow}>
        <TouchableOpacity style={styles.dateButton} onPress={() => setPickerMode('date')}>
          <Text style={styles.dateButtonText}>{formattedDate}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dateButton} onPress={() => setPickerMode('time')}>
          <Text style={styles.dateButtonText}>{formattedTime}</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={pickerMode !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerMode(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setPickerMode(null)}
        />
        <View style={styles.pickerModal}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>
              {pickerMode === 'date' ? 'Velg dato' : 'Velg tidspunkt'}
            </Text>
            <TouchableOpacity onPress={() => setPickerMode(null)}>
              <Text style={styles.pickerDone}>Ferdig</Text>
            </TouchableOpacity>
          </View>
          {pickerMode !== null && (
            <DateTimePicker
              value={scheduledAt}
              mode={pickerMode}
              display="inline"
              onChange={onDateChange}
              minimumDate={pickerMode === 'date' ? new Date() : undefined}
              style={styles.picker}
            />
          )}
        </View>
      </Modal>

      <Text style={styles.label}>Lokasjon *</Text>
      <View style={styles.locationRow}>
        <TouchableOpacity style={styles.locationButton} onPress={useMyLocation}>
          <Text style={styles.locationButtonText}>Bruk min posisjon</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.locationButton, showMap && styles.locationButtonActive]}
          onPress={() => setShowMap(!showMap)}
        >
          <Text style={[styles.locationButtonText, showMap && styles.locationButtonTextActive]}>
            Velg på kart
          </Text>
        </TouchableOpacity>
      </View>

      {location && !showMap && (
        <Text style={styles.locationInfo}>
          Posisjon valgt: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
        </Text>
      )}

      {showMap && (
        <View style={styles.mapContainer}>
          <Text style={styles.mapHint}>Trykk på kartet for å velge posisjon</Text>
          <MapView
            style={styles.map}
            provider={PROVIDER_DEFAULT}
            initialRegion={location ? {
              ...location,
              latitudeDelta: 0.04,
              longitudeDelta: 0.04,
            } : OSLO_REGION}
            onPress={onMapPress}
          >
            {location && (
              <Marker coordinate={location} />
            )}
          </MapView>
          {location && (
            <TouchableOpacity style={styles.confirmMapButton} onPress={() => setShowMap(false)}>
              <Text style={styles.confirmMapButtonText}>Bekreft posisjon</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>{saving ? 'Lagrer...' : 'Lagre aktivitet'}</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inputMultiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#1a73e8',
    backgroundColor: '#fff',
  },
  typeChipActive: {
    backgroundColor: '#1a73e8',
  },
  typeChipText: {
    color: '#1a73e8',
    fontSize: 14,
    fontWeight: '500',
  },
  typeChipTextActive: {
    color: '#fff',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateButtonText: {
    fontSize: 15,
    color: '#333',
  },
  locationRow: {
    flexDirection: 'row',
    gap: 10,
  },
  locationButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#1a73e8',
  },
  locationButtonActive: {
    backgroundColor: '#1a73e8',
  },
  locationButtonText: {
    color: '#1a73e8',
    fontSize: 14,
    fontWeight: '500',
  },
  locationButtonTextActive: {
    color: '#fff',
  },
  locationInfo: {
    marginTop: 8,
    color: '#4caf50',
    fontSize: 13,
    fontWeight: '500',
  },
  mapContainer: {
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mapHint: {
    backgroundColor: '#fff3cd',
    padding: 8,
    textAlign: 'center',
    fontSize: 13,
    color: '#856404',
  },
  map: {
    height: 260,
  },
  confirmMapButton: {
    backgroundColor: '#1a73e8',
    padding: 12,
    alignItems: 'center',
  },
  confirmMapButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  saveButton: {
    backgroundColor: '#1a73e8',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonDisabled: {
    backgroundColor: '#aaa',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 30,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  pickerDone: {
    fontSize: 16,
    color: '#1a73e8',
    fontWeight: '600',
  },
  picker: {
    width: '100%',
  },
});
