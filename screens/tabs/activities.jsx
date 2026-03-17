import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  Image,
  Modal,
  ScrollView,
} from 'react-native';
import Slider from '@react-native-community/slider';
import MapView, { PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import ActivityCard from '../../components/ActivityCard';
import ActivityPin from '../../components/ActivityPin';

const OSLO_REGION = {
  latitude: 59.9139,
  longitude: 10.7522,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

const ACTIVITY_COLORS = {
  fotball: '#4caf50', løping: '#ff9800', sykling: '#00897B',
  tennis: '#9c27b0', default: '#7C5CBF',
};

const ACTIVITY_ICONS = {
  fotball: '⚽', basket: '🏀', håndball: '🤾', volleyball: '🏐',
  tennis: '🎾', padel: '🏓', squash: '🎾', bordtennis: '🏓',
  løping: '🏃', sykling: '🚴', svømming: '🏊', trening: '💪',
  klatring: '🧗', fjelltur: '🥾', slalom: '⛷️', randone: '🎿',
  skating: '🛹', skøyting: '⛸️', fisking: '🎣',
};

const ACTIVITY_TYPES = [
  'fotball', 'basket', 'håndball', 'volleyball', 'tennis', 'padel',
  'squash', 'bordtennis', 'løping', 'sykling', 'svømming', 'trening',
  'klatring', 'fjelltur', 'slalom', 'randone', 'skating', 'skøyting', 'fisking',
];


function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

export default function ActivitiesScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('kart');
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [mapEpoch, setMapEpoch] = useState(0);
  const slideAnim = useRef(new Animated.Value(200)).current;
  const deselectTimer = useRef(null);

  // Filter state
  const [filterVisible, setFilterVisible] = useState(false);
  const filterSlide = useRef(new Animated.Value(600)).current;
  const filterFade = useRef(new Animated.Value(0)).current;
  const [filterTypes, setFilterTypes] = useState([]);
  const [filterRadius, setFilterRadius] = useState(0);
  const activeFiltersCount = (filterTypes.length > 0 ? 1 : 0)
    + (filterRadius > 0 ? 1 : 0);

  useEffect(() => {
    navigation.setOptions({
      headerRight: null,
      headerTitle: () => (
        <Text style={{ fontSize: 26, fontWeight: '900', color: '#1A1A2E', letterSpacing: -0.5 }}>
          Krets
        </Text>
      ),
    });
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Posisjonstilgang nektet — viser Oslo som standard.');
      } else {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);
      }
      setLocationLoading(false);
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchActivities();
      setMapEpoch(e => e + 1);
    }, [])
  );

  async function fetchActivities() {
    setLoadingActivities(true);
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true });
    if (!error && data) setActivities(data);
    setLoadingActivities(false);
  }

  // Filtered activities
  const filteredActivities = useMemo(() => {
    let result = activities;

    if (filterTypes.length > 0) {
      result = result.filter(a => {
        const t = a.type?.toLowerCase();
        if (filterTypes.includes(t)) return true;
        if (filterTypes.includes('annet') && !ACTIVITY_TYPES.includes(t)) return true;
        return false;
      });
    }

    if (filterRadius > 0 && location) {
      result = result.filter(a => {
        if (!a.latitude || !a.longitude) return false;
        return getDistanceKm(location.latitude, location.longitude, a.latitude, a.longitude) <= filterRadius;
      });
    }

    return result;
  }, [activities, filterTypes, filterRadius, location]);

  function openFilter() {
    setFilterVisible(true);
    Animated.parallel([
      Animated.timing(filterFade, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(filterSlide, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
    ]).start();
  }

  function closeFilter() {
    Animated.parallel([
      Animated.timing(filterFade, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(filterSlide, { toValue: 600, duration: 220, useNativeDriver: true }),
    ]).start(() => setFilterVisible(false));
  }

  function resetFilters() {
    setFilterTypes([]);
    setFilterRadius(0);
  }

  function toggleType(type) {
    setFilterTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  }

  function selectActivity(activity) {
    if (deselectTimer.current) clearTimeout(deselectTimer.current);
    setSelectedActivity(activity);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
  }

  function deselectActivity() {
    deselectTimer.current = setTimeout(() => {
      Animated.timing(slideAnim, { toValue: 200, duration: 120, useNativeDriver: true })
        .start(() => setSelectedActivity(null));
    }, 10);
  }

  const region = location
    ? { latitude: location.latitude, longitude: location.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : OSLO_REGION;

  const renderBottomCard = () => {
    if (!selectedActivity) return null;
    const a = selectedActivity;
    const color = ACTIVITY_COLORS[a.type?.toLowerCase()] ?? ACTIVITY_COLORS.default;
    const icon = ACTIVITY_ICONS[a.type?.toLowerCase()] ?? '🏅';
    const scheduledDate = a.scheduled_at ? new Date(a.scheduled_at) : null;
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const isSameDay = (x, y) =>
      x.getDate() === y.getDate() && x.getMonth() === y.getMonth() && x.getFullYear() === y.getFullYear();

    let dateLabel = '';
    if (scheduledDate) {
      if (isSameDay(scheduledDate, today)) dateLabel = 'I dag';
      else if (isSameDay(scheduledDate, tomorrow)) dateLabel = 'I morgen';
      else dateLabel = scheduledDate.toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short' });
    }
    const timeLabel = scheduledDate
      ? scheduledDate.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }) : '';
    const endLabel = a.scheduled_end
      ? new Date(a.scheduled_end).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }) : null;

    return (
      <Animated.View style={[styles.bottomCardWrapper, { transform: [{ translateY: slideAnim }] }]}>
        <TouchableOpacity
          style={styles.bottomCard}
          activeOpacity={0.85}
          onPress={() => { deselectActivity(); navigation.navigate('ActivityDetail', { activity: a }); }}
        >
          <View style={styles.bottomCardImage}>
            {a.image_url ? (
              <Image source={{ uri: a.image_url }} style={styles.bottomCardImg} />
            ) : (
              <View style={[styles.bottomCardImgFallback, { backgroundColor: color }]}>
                <Text style={styles.bottomCardImgIcon}>{icon}</Text>
              </View>
            )}
          </View>
          <View style={styles.bottomCardInfo}>
            <Text style={[styles.bottomCardType, { color }]}>{(a.type ?? 'Aktivitet').toUpperCase()}</Text>
            <Text style={styles.bottomCardTitle} numberOfLines={1}>{a.title}</Text>
            {dateLabel ? (
              <Text style={styles.bottomCardTime}>
                🕐 {dateLabel}, {timeLabel}{endLabel ? `–${endLabel}` : ''}
              </Text>
            ) : null}
          </View>
          <Text style={styles.bottomCardChevron}>›</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Filter button */}
      <View style={styles.filterRow}>
        <TouchableOpacity style={[styles.filterBtn, activeFiltersCount > 0 && styles.filterBtnActive]} onPress={openFilter}>
          <Text style={[styles.filterBtnText, activeFiltersCount > 0 && styles.filterBtnTextActive]}>
            Filtrer
          </Text>
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        {activeFiltersCount > 0 && (
          <TouchableOpacity onPress={resetFilters} style={styles.resetBtn}>
            <Text style={styles.resetBtnText}>Nullstill</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Toggle */}
      <View style={styles.toggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, activeTab === 'kart' && styles.toggleBtnActive]}
          onPress={() => setActiveTab('kart')}
        >
          <Text style={[styles.toggleText, activeTab === 'kart' && styles.toggleTextActive]}>Kart</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, activeTab === 'feed' && styles.toggleBtnActive]}
          onPress={() => setActiveTab('feed')}
        >
          <Text style={[styles.toggleText, activeTab === 'feed' && styles.toggleTextActive]}>Liste</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'kart' ? (
        locationLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#7C5CBF" />
            <Text style={styles.loadingText}>Henter posisjon...</Text>
          </View>
        ) : (
          <View style={styles.mapContainer}>
            {locationError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{locationError}</Text>
              </View>
            )}
            <MapView
              style={styles.map}
              provider={PROVIDER_DEFAULT}
              initialRegion={region}
              showsUserLocation={!!location}
              showsMyLocationButton
              onPress={deselectActivity}
            >
              {filteredActivities.filter(a => a.latitude && a.longitude).map(activity => (
                <ActivityPin
                  key={`${activity.id}-${mapEpoch}`}
                  activity={activity}
                  onActivityPress={selectActivity}
                />
              ))}
            </MapView>
            {renderBottomCard()}
          </View>
        )
      ) : (
        loadingActivities ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#7C5CBF" />
          </View>
        ) : (
          <FlatList
            data={filteredActivities}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <ActivityCard
                activity={item}
                onPress={() => navigation.navigate('ActivityDetail', { activity: item })}
              />
            )}
            contentContainerStyle={filteredActivities.length === 0 ? styles.emptyContainer : { paddingVertical: 8 }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Ingen aktiviteter funnet.</Text>
                <Text style={styles.emptySubtext}>Prøv å justere filtrene.</Text>
              </View>
            }
          />
        )
      )}

      {/* Filter bottom sheet */}
      <Modal visible={filterVisible} transparent animationType="none" onRequestClose={closeFilter}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.filterOverlay, { opacity: filterFade }]}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeFilter} />
          </Animated.View>
          <Animated.View style={[styles.filterSheet, { transform: [{ translateY: filterSlide }] }]}>
            <View style={styles.filterSheetHandle} />
            <View style={styles.filterSheetHeader}>
              <Text style={styles.filterSheetTitle}>Filtrer aktiviteter</Text>
              <TouchableOpacity onPress={resetFilters}>
                <Text style={styles.filterSheetReset}>Nullstill</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Type */}
              <Text style={styles.filterSectionTitle}>Aktivitetstype</Text>
              <View style={styles.chipGrid}>
                {ACTIVITY_TYPES.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.filterChip, filterTypes.includes(t) && styles.filterChipActive]}
                    onPress={() => toggleType(t)}
                  >
                    <Text style={[styles.filterChipText, filterTypes.includes(t) && styles.filterChipTextActive]}>
                      {ACTIVITY_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.filterChip, filterTypes.includes('annet') && styles.filterChipActive]}
                  onPress={() => toggleType('annet')}
                >
                  <Text style={[styles.filterChipText, filterTypes.includes('annet') && styles.filterChipTextActive]}>
                    🏅 Annet
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Radius */}
              <View style={styles.filterRadiusHeader}>
                <Text style={styles.filterSectionTitle}>
                  Radius{!location ? ' (krever posisjon)' : ''}
                </Text>
                <Text style={styles.filterRadiusValue}>
                  {filterRadius === 0 ? 'Av' : `${filterRadius} km`}
                </Text>
              </View>
              <Slider
                style={styles.radiusSlider}
                minimumValue={0}
                maximumValue={50}
                step={1}
                value={filterRadius}
                onValueChange={v => location && setFilterRadius(v)}
                minimumTrackTintColor={location ? '#7C5CBF' : '#ccc'}
                maximumTrackTintColor="#E4DCFF"
                thumbTintColor={location ? '#7C5CBF' : '#ccc'}
                disabled={!location}
              />


            </ScrollView>

            <TouchableOpacity style={styles.filterApplyBtn} onPress={closeFilter}>
              <Text style={styles.filterApplyText}>
                Vis resultater{activeFiltersCount > 0 ? ` (${activeFiltersCount} filter)` : ''}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 10,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E4DCFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
    gap: 6,
  },
  filterBtnActive: {
    backgroundColor: '#7C5CBF',
    borderColor: '#7C5CBF',
  },
  filterBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C5CBF',
  },
  filterBtnTextActive: {
    color: '#fff',
  },
  filterBadge: {
    backgroundColor: '#fff',
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C5CBF',
  },
  resetBtn: {
    paddingVertical: 7,
    paddingHorizontal: 4,
  },
  resetBtnText: {
    fontSize: 14,
    color: '#999',
  },
  toggle: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ebebeb',
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  toggleBtnActive: {
    borderBottomWidth: 2.5,
    borderBottomColor: '#7C5CBF',
    marginBottom: -1,
  },
  toggleText: { fontSize: 15, fontWeight: '500', color: '#aaa' },
  toggleTextActive: { color: '#7C5CBF', fontWeight: '700' },
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: '#666' },
  errorBanner: { backgroundColor: '#fff3cd', padding: 10, alignItems: 'center' },
  errorText: { color: '#856404', fontSize: 13 },
  empty: { alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#999', textAlign: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  bottomCardWrapper: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  bottomCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 10,
  },
  bottomCardImage: { flexShrink: 0 },
  bottomCardImg: { width: 60, height: 60, borderRadius: 30 },
  bottomCardImgFallback: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
  },
  bottomCardImgIcon: { fontSize: 24 },
  bottomCardInfo: { flex: 1, gap: 3 },
  bottomCardType: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  bottomCardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  bottomCardTime: { fontSize: 12, color: '#666' },
  bottomCardChevron: { fontSize: 26, color: '#ccc', flexShrink: 0 },
  // Filter sheet
  filterOverlay: { backgroundColor: 'rgba(0,0,0,0.3)' },
  filterSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 34,
    maxHeight: '85%',
  },
  filterSheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#e0e0e0',
    alignSelf: 'center',
    marginTop: 12, marginBottom: 16,
  },
  filterSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  filterSheetTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  filterSheetReset: { fontSize: 14, color: '#999' },
  filterSectionTitle: {
    fontSize: 13, fontWeight: '700', color: '#999',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 10, marginTop: 20,
  },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterRadiusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 4,
  },
  filterRadiusValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#7C5CBF',
  },
  radiusSlider: {
    width: '100%',
    height: 40,
  },
  filterChip: {
    borderWidth: 1.5, borderColor: '#E4DCFF',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: '#fff',
  },
  filterChipActive: { backgroundColor: '#7C5CBF', borderColor: '#7C5CBF' },
  filterChipDisabled: { opacity: 0.4 },
  filterChipText: { fontSize: 13, fontWeight: '500', color: '#7C5CBF' },
  filterChipTextActive: { color: '#fff' },
  filterApplyBtn: {
    backgroundColor: '#7C5CBF',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 24,
  },
  filterApplyText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
