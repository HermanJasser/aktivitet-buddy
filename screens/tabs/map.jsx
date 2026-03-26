import { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import MapView, { PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { supabase } from '../../lib/supabase';
import ActivityPin from '../../components/ActivityPin';

const OSLO_REGION = {
  latitude: 59.9139,
  longitude: 10.7522,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

export default function MapScreen({ navigation }) {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const mapRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Posisjonstilgang nektet — viser Oslo som standard.');
        setLoading(false);
      } else {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);
        setLoading(false);
      }
    })();
    fetchActivities();
  }, []);

  async function fetchActivities() {
    const { data } = await supabase
      .from('activities')
      .select('*')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .gte('scheduled_at', new Date().toISOString());
    if (data) setActivities(data);
  }

  const region = location
    ? {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : OSLO_REGION;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7C5CBF" />
        <Text style={styles.loadingText}>Henter posisjon...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {errorMsg && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={region}
        showsUserLocation={!!location}
      >
        {activities.map((activity) => (
          <ActivityPin
            key={activity.id}
            activity={activity}
            onActivityPress={(a) =>
              navigation.navigate('ActivityDetail', { activity: a })
            }
          />
        ))}
      </MapView>
      <TouchableOpacity
        style={styles.locationButton}
        onPress={() =>
          location &&
          mapRef.current?.animateToRegion({
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          })
        }
      >
        <Text style={styles.locationButtonText}>📍</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  locationButton: {
    position: 'absolute',
    bottom: 110,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  locationButtonText: {
    fontSize: 22,
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
});
