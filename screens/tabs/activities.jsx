import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
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

export default function ActivitiesScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('kart');
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState(null);

  useEffect(() => {
    navigation.setOptions({ headerRight: null });
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

  const region = location
    ? { latitude: location.latitude, longitude: location.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : OSLO_REGION;

  return (
    <View style={styles.container}>
      <View style={styles.toggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, activeTab === 'kart' && styles.toggleBtnActive]}
          onPress={() => setActiveTab('kart')}
        >
          <Text style={[styles.toggleText, activeTab === 'kart' && styles.toggleTextActive]}>Utforsk</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, activeTab === 'feed' && styles.toggleBtnActive]}
          onPress={() => setActiveTab('feed')}
        >
          <Text style={[styles.toggleText, activeTab === 'feed' && styles.toggleTextActive]}>Oversikt</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'kart' ? (
        locationLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#1a73e8" />
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
            >
              {activities.filter(a => a.latitude && a.longitude).map(activity => (
                <ActivityPin
                  key={activity.id}
                  activity={activity}
                  onProfilePress={(userId) => navigation.navigate('UserProfile', { userId })}
                />
              ))}
            </MapView>
          </View>
        )
      ) : (
        loadingActivities ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#1a73e8" />
          </View>
        ) : (
          <FlatList
            data={activities}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <ActivityCard
                activity={item}
                onPress={() => navigation.navigate('ActivityDetail', { activity: item })}
              />
            )}
            contentContainerStyle={activities.length === 0 ? styles.emptyContainer : { paddingVertical: 8 }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Ingen aktiviteter enda.</Text>
                <Text style={styles.emptySubtext}>Trykk + for å opprette den første.</Text>
              </View>
            }
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  toggle: {
    flexDirection: 'row',
    margin: 12,
    backgroundColor: '#e8e8e8',
    borderRadius: 10,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#888',
  },
  toggleTextActive: {
    color: '#111',
    fontWeight: '600',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  errorBanner: {
    backgroundColor: '#fff3cd',
    padding: 10,
    alignItems: 'center',
  },
  errorText: {
    color: '#856404',
    fontSize: 13,
  },
  empty: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
});
