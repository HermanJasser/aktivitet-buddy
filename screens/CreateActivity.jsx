import { useState, useRef, useEffect, useCallback } from 'react';
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
  ActivityIndicator,
  Keyboard,
  Animated,
  Image,
} from 'react-native';
import MapView, { PROVIDER_DEFAULT, Marker } from 'react-native-maps';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';

const PARTICIPANT_OPTIONS = Array.from({ length: 49 }, (_, i) => i + 2);
const ITEM_HEIGHT = 52;

const ACTIVITY_TYPES = [
  'Fotball', 'Basket', 'Håndball', 'Volleyball', 'Tennis', 'Padel',
  'Squash', 'Bordtennis', 'Løping', 'Sykling', 'Svømming', 'Trening',
  'Klatring', 'Fjelltur', 'Slalom', 'Randone', 'Skating', 'Skøyting', 'Fisking',
];

const OSLO_REGION = {
  latitude: 59.9139,
  longitude: 10.7522,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function CreateActivity({ navigation, route }) {
  const existing = route.params?.activity ?? null;
  const isEditing = !!existing;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [type, setType] = useState(existing?.type
    ? existing.type.charAt(0).toUpperCase() + existing.type.slice(1)
    : null);
  const [customType, setCustomType] = useState('');
  const [showCustomTypeModal, setShowCustomTypeModal] = useState(false);
  const [description, setDescription] = useState(existing?.description ?? '');
  const [localImage, setLocalImage] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(existing?.image_url ?? null);
  const [maxParticipants, setMaxParticipants] = useState(existing?.max_participants ?? null);
  const [scheduledAt, setScheduledAt] = useState(() => {
    if (existing?.scheduled_at) return new Date(existing.scheduled_at);
    const d = new Date(); d.setMinutes(0, 0, 0); return d;
  });
  const [scheduledEnd, setScheduledEnd] = useState(() => {
    if (existing?.scheduled_end) return new Date(existing.scheduled_end);
    const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1); return d;
  });
  const [hasEndTime, setHasEndTime] = useState(!!existing?.scheduled_end);
  const [pickerMode, setPickerMode] = useState(null); // null | 'date' | 'timeStart' | 'timeEnd'
  const [location, setLocation] = useState(
    existing?.latitude && existing?.longitude
      ? { latitude: existing.latitude, longitude: existing.longitude }
      : null
  );
  const [locationLabel, setLocationLabel] = useState(null);
  const [addressQuery, setAddressQuery] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [saving, setSaving] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef(null);
  const titleRef = useRef(null);
  const descriptionRef = useRef(null);
  const addressRef = useRef(null);
  const pickerSlide = useRef(new Animated.Value(400)).current;
  const pickerFade = useRef(new Animated.Value(0)).current;
  const participantsScrollRef = useRef(null);

  const openPicker = useCallback((mode) => {
    setPickerMode(mode);
    Animated.parallel([
      Animated.timing(pickerFade, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(pickerSlide, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }, []);

  const closePicker = useCallback(() => {
    Animated.parallel([
      Animated.timing(pickerFade, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(pickerSlide, { toValue: 400, duration: 200, useNativeDriver: true }),
    ]).start(() => setPickerMode(null));
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', e => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    if (pickerMode === 'participants') {
      const idx = maxParticipants != null ? PARTICIPANT_OPTIONS.indexOf(maxParticipants) : -1;
      const safeIdx = idx >= 0 ? idx : 0;
      setTimeout(() => {
        participantsScrollRef.current?.scrollTo({ y: safeIdx * ITEM_HEIGHT, animated: false });
      }, 50);
    }
  }, [pickerMode]);

  useEffect(() => {
    if (isEditing) {
      navigation.setOptions({ title: 'Rediger aktivitet' });
      if (existing.latitude && existing.longitude) {
        Location.reverseGeocodeAsync({ latitude: existing.latitude, longitude: existing.longitude })
          .then(results => {
            if (results.length > 0) {
              const r = results[0];
              const parts = [r.street, r.streetNumber, r.city].filter(Boolean);
              setLocationLabel(parts.length > 0 ? parts.join(' ') : r.name ?? null);
            }
          })
          .catch(() => {});
      }
    }
  }, []);

  async function setLocationWithLabel(coords, label = null) {
    setLocation(coords);
    if (label) {
      setLocationLabel(label);
      return;
    }
    try {
      const results = await Location.reverseGeocodeAsync(coords);
      if (results.length > 0) {
        const r = results[0];
        const parts = [r.street, r.streetNumber, r.city].filter(Boolean);
        setLocationLabel(parts.length > 0 ? parts.join(' ') : r.name ?? null);
      }
    } catch {
      setLocationLabel(null);
    }
  }

  function scrollToInput(inputRef) {
    if (!inputRef?.current || !scrollRef?.current) return;
    inputRef.current.measureLayout(scrollRef.current, (x, y) => {
      scrollRef.current.scrollTo({ y: y - 120, animated: true });
    }, () => {});
  }

  async function fetchUserLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const loc = await Location.getCurrentPositionAsync({});
    return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
  }

  async function useMyLocation() {
    const coords = await fetchUserLocation();
    if (!coords) {
      Alert.alert('Tilgang nektet', 'Gi tilgang til posisjon i innstillinger.');
      return;
    }
    setLocationWithLabel(coords);
    setShowMap(false);
    Alert.alert('Posisjon hentet', 'Din nåværende posisjon er valgt.');
  }

  async function handleShowMap() {
    if (!userLocation) {
      const coords = await fetchUserLocation();
      if (coords) setUserLocation(coords);
    }
    setShowMap(true);
  }

  async function geocodeAddress() {
    if (!addressQuery.trim()) return;
    setGeocoding(true);
    try {
      const results = await Location.geocodeAsync(addressQuery.trim());
      if (results.length === 0) {
        Alert.alert('Ikke funnet', 'Fant ingen resultater for adressen. Prøv å være mer spesifikk.');
      } else {
        const { latitude, longitude } = results[0];
        setLocationWithLabel({ latitude, longitude }, addressQuery.trim());
        setShowMap(false);
      }
    } catch {
      Alert.alert('Feil', 'Kunne ikke søke etter adressen. Sjekk internettforbindelsen.');
    } finally {
      setGeocoding(false);
    }
  }

  function onMapPress(e) {
    setLocationWithLabel(e.nativeEvent.coordinate);
  }

  function combineDateAndTime(dateSource, timeSource) {
    const result = new Date(dateSource);
    result.setHours(timeSource.getHours(), timeSource.getMinutes(), 0, 0);
    return result;
  }

  function onDateChange(event, selectedDate) {
    if (!selectedDate) return;
    if (pickerMode === 'date') {
      setScheduledAt(combineDateAndTime(selectedDate, scheduledAt));
      setScheduledEnd(combineDateAndTime(selectedDate, scheduledEnd));
    } else if (pickerMode === 'timeStart') {
      setScheduledAt(combineDateAndTime(scheduledAt, selectedDate));
    } else if (pickerMode === 'timeEnd') {
      setScheduledEnd(combineDateAndTime(scheduledAt, selectedDate));
    }
    if (Platform.OS === 'android') setPickerMode(null);
  }

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Tilgang nektet', 'Gi tilgang til bilder i innstillinger.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) {
      setLocalImage(result.assets[0].uri);
    }
  }

  async function uploadImage(uri, userId) {
    const path = `${userId}/${Date.now()}.jpg`;
    const arraybuffer = await fetch(uri).then(r => r.arrayBuffer());
    const { error } = await supabase.storage
      .from('activity-images')
      .upload(path, arraybuffer, { contentType: 'image/jpeg', upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('activity-images').getPublicUrl(path);
    return data.publicUrl;
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

    let image_url = existingImageUrl;
    if (localImage) {
      try {
        image_url = await uploadImage(localImage, user.id);
      } catch (e) {
        setSaving(false);
        Alert.alert('Feil', 'Kunne ikke laste opp bilde. Prøv igjen.');
        return;
      }
    }

    const payload = {
      title: title.trim(),
      type: type.toLowerCase(),
      description: description.trim() || null,
      latitude: location.latitude,
      longitude: location.longitude,
      scheduled_at: scheduledAt.toISOString(),
      scheduled_end: hasEndTime ? scheduledEnd.toISOString() : null,
      max_participants: maxParticipants ? parseInt(maxParticipants) : null,
      image_url,
    };

    const { error } = isEditing
      ? await supabase.from('activities').update(payload).eq('id', existing.id)
      : await supabase.from('activities').insert({ ...payload, user_id: user.id });

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
  const formattedTimeStart = scheduledAt.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
  const formattedTimeEnd = scheduledEnd.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={{ paddingBottom: keyboardHeight ? keyboardHeight + 20 : 40 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <Text style={styles.label}>Tittel *</Text>
      <TextInput
        ref={titleRef}
        style={styles.input}
        placeholder="F.eks. Fotball på Frogner"
        value={title}
        onChangeText={setTitle}
        onFocus={() => scrollToInput(titleRef)}
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
        <TouchableOpacity
          style={[styles.typeChip, type && !ACTIVITY_TYPES.includes(type) && styles.typeChipActive]}
          onPress={() => setShowCustomTypeModal(true)}
        >
          <Text style={[styles.typeChipText, type && !ACTIVITY_TYPES.includes(type) && styles.typeChipTextActive]}>
            {type && !ACTIVITY_TYPES.includes(type) ? type : 'Annet'}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showCustomTypeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCustomTypeModal(false)}
      >
        <View style={styles.customTypeOverlay}>
          <View style={styles.customTypeBox}>
            <Text style={styles.customTypeTitle}>Skriv inn aktivitetstype</Text>
            <TextInput
              style={styles.customTypeInput}
              placeholder="F.eks. Padletur, Dans, Yoga..."
              value={customType}
              onChangeText={setCustomType}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => {
                if (customType.trim()) {
                  setType(customType.trim());
                  setShowCustomTypeModal(false);
                  setCustomType('');
                }
              }}
            />
            <View style={styles.customTypeButtons}>
              <TouchableOpacity
                style={styles.customTypeCancelBtn}
                onPress={() => { setShowCustomTypeModal(false); setCustomType(''); }}
              >
                <Text style={styles.customTypeCancelText}>Avbryt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.customTypeConfirmBtn, !customType.trim() && { backgroundColor: '#aaa' }]}
                onPress={() => {
                  if (customType.trim()) {
                    setType(customType.trim());
                    setShowCustomTypeModal(false);
                    setCustomType('');
                  }
                }}
                disabled={!customType.trim()}
              >
                <Text style={styles.customTypeConfirmText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Text style={styles.label}>Beskrivelse</Text>
      <TextInput
        ref={descriptionRef}
        style={[styles.input, styles.inputMultiline]}
        placeholder="Valgfri beskrivelse..."
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
        returnKeyType="done"
        blurOnSubmit
        onFocus={() => scrollToInput(descriptionRef)}
      />

      <Text style={styles.label}>Bilde</Text>
      {localImage || existingImageUrl ? (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: localImage || existingImageUrl }} style={styles.imagePreview} />
          <TouchableOpacity
            style={styles.removeImageBtn}
            onPress={() => { setLocalImage(null); setExistingImageUrl(null); }}
          >
            <Text style={styles.removeImageText}>✕</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.changeImageBtn} onPress={pickImage}>
            <Text style={styles.changeImageText}>Bytt bilde</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
          <Text style={styles.imagePickerText}>+ Velg bilde</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.label}>Antall deltakere</Text>
      <TouchableOpacity style={styles.dateButton} onPress={() => openPicker('participants')}>
        <Text style={styles.dateButtonText}>
          {maxParticipants ?? 'Ikke satt'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.label}>Tidspunkt *</Text>
      <TouchableOpacity style={[styles.dateButton, { marginBottom: 8 }]} onPress={() => openPicker('date')}>
        <Text style={styles.dateButtonText}>{formattedDate}</Text>
      </TouchableOpacity>
      <View style={styles.dateRow}>
        <TouchableOpacity style={styles.dateButton} onPress={() => openPicker('timeStart')}>
          <Text style={styles.dateButtonLabel}>Fra</Text>
          <Text style={styles.dateButtonText}>{formattedTimeStart}</Text>
        </TouchableOpacity>
        {hasEndTime ? (
          <TouchableOpacity style={styles.dateButton} onPress={() => openPicker('timeEnd')}>
            <Text style={styles.dateButtonLabel}>Til</Text>
            <Text style={styles.dateButtonText}>{formattedTimeEnd}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.dateButton, styles.addEndTimeBtn]}
            onPress={() => setHasEndTime(true)}
          >
            <Text style={styles.addEndTimeText}>+ Legg til sluttid</Text>
          </TouchableOpacity>
        )}
      </View>
      {hasEndTime && (
        <TouchableOpacity onPress={() => setHasEndTime(false)}>
          <Text style={styles.removeEndTimeText}>Fjern sluttid</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={pickerMode !== null}
        transparent
        animationType="none"
        onRequestClose={closePicker}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Animated.View style={[styles.modalBackdrop, { opacity: pickerFade, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }]}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closePicker} />
          </Animated.View>
          <Animated.View style={[styles.pickerModal, { transform: [{ translateY: pickerSlide }] }]}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>
                {pickerMode === 'date' ? 'Velg dato' : pickerMode === 'timeStart' ? 'Fra-tidspunkt' : pickerMode === 'timeEnd' ? 'Til-tidspunkt' : 'Antall deltakere'}
              </Text>
              <TouchableOpacity onPress={closePicker}>
                <Text style={styles.pickerDone}>Ferdig</Text>
              </TouchableOpacity>
            </View>
            {pickerMode === 'participants' ? (
              <View style={styles.participantsPickerContainer}>
                <View pointerEvents="none" style={styles.participantsPickerHighlight} />
                <ScrollView
                  ref={participantsScrollRef}
                  style={{ height: ITEM_HEIGHT * 3 }}
                  snapToInterval={ITEM_HEIGHT}
                  decelerationRate="fast"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}
                  onMomentumScrollEnd={e => {
                    const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
                    const clamped = Math.max(0, Math.min(index, PARTICIPANT_OPTIONS.length - 1));
                    setMaxParticipants(PARTICIPANT_OPTIONS[clamped] ?? null);
                  }}
                >
                  {PARTICIPANT_OPTIONS.map((n, i) => (
                    <View key={i} style={styles.participantsPickerItem}>
                      <Text style={styles.participantsPickerText}>{n}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            ) : pickerMode !== null ? (
              <DateTimePicker
                value={pickerMode === 'timeEnd' ? scheduledEnd : scheduledAt}
                mode={pickerMode === 'date' ? 'date' : 'time'}
                display="spinner"
                onChange={onDateChange}
                minimumDate={pickerMode === 'date' ? new Date() : undefined}
                textColor="#000000"
              />
            ) : null}
          </Animated.View>
        </View>
      </Modal>

      <Text style={styles.label}>Lokasjon *</Text>
      <View style={styles.locationRow}>
        <TouchableOpacity style={styles.locationButton} onPress={useMyLocation}>
          <Text style={styles.locationButtonText}>Bruk min posisjon</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.locationButton, showMap && styles.locationButtonActive]}
          onPress={() => { if (showMap) setShowMap(false); else handleShowMap(); }}
        >
          <Text style={[styles.locationButtonText, showMap && styles.locationButtonTextActive]}>
            Velg på kart
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.addressRow}>
        <TextInput
          ref={addressRef}
          style={styles.addressInput}
          placeholder="Søk på adresse..."
          value={addressQuery}
          onChangeText={setAddressQuery}
          returnKeyType="search"
          onSubmitEditing={geocodeAddress}
          onFocus={() => scrollToInput(addressRef)}
        />
        <TouchableOpacity
          style={[styles.addressSearchBtn, geocoding && { backgroundColor: '#aaa' }]}
          onPress={geocodeAddress}
          disabled={geocoding}
        >
          {geocoding
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.addressSearchText}>Søk</Text>
          }
        </TouchableOpacity>
      </View>

      {location && !showMap && (
        <Text style={styles.locationInfo}>
          {locationLabel ?? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
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
            } : userLocation ? {
              ...userLocation,
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
        <Text style={styles.saveButtonText}>{saving ? 'Lagrer...' : isEditing ? 'Oppdater aktivitet' : 'Lagre aktivitet'}</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    borderColor: '#7C5CBF',
    backgroundColor: '#fff',
  },
  typeChipActive: {
    backgroundColor: '#7C5CBF',
  },
  typeChipText: {
    color: '#7C5CBF',
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
  dateButtonLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  addEndTimeBtn: {
    justifyContent: 'center',
  },
  addEndTimeText: {
    color: '#7C5CBF',
    fontSize: 14,
    fontWeight: '500',
  },
  removeEndTimeText: {
    color: '#999',
    fontSize: 13,
    marginTop: 6,
    textDecorationLine: 'underline',
  },
  dateButtonText: {
    fontSize: 15,
    color: '#333',
  },
  locationRow: {
    flexDirection: 'row',
    gap: 10,
  },
  addressRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  addressInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  addressSearchBtn: {
    backgroundColor: '#7C5CBF',
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressSearchText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  locationButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#7C5CBF',
  },
  locationButtonActive: {
    backgroundColor: '#7C5CBF',
  },
  locationButtonText: {
    color: '#7C5CBF',
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
    backgroundColor: '#7C5CBF',
    padding: 12,
    alignItems: 'center',
  },
  confirmMapButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  saveButton: {
    backgroundColor: '#7C5CBF',
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
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  pickerModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 30,
    alignItems: 'center',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignSelf: 'stretch',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  pickerDone: {
    fontSize: 16,
    color: '#7C5CBF',
    fontWeight: '600',
  },
  picker: {
    width: '100%',
  },
  customTypeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  customTypeBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
  },
  customTypeTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  customTypeInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 16,
  },
  customTypeButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  customTypeCancelBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  customTypeCancelText: {
    color: '#666',
    fontWeight: '500',
  },
  customTypeConfirmBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#7C5CBF',
    alignItems: 'center',
  },
  customTypeConfirmText: {
    color: '#fff',
    fontWeight: '600',
  },
  imagePickerBtn: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#7C5CBF',
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
  },
  imagePickerText: {
    color: '#7C5CBF',
    fontSize: 15,
    fontWeight: '500',
  },
  imagePreviewContainer: {
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 10,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  changeImageBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  changeImageText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  participantsPickerContainer: {
    width: '100%',
    position: 'relative',
  },
  participantsPickerHighlight: {
    position: 'absolute',
    top: ITEM_HEIGHT,
    left: 24,
    right: 24,
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  participantsPickerItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantsPickerText: {
    fontSize: 17,
    color: '#333',
  },
});
