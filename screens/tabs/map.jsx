import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
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
      .not('longitude', 'is', null);
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
        <ActivityIndicator size="large" color="#1a73e8" />
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
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={region}
        showsUserLocation={!!location}
        showsMyLocationButton
      >
        {activities.map((activity) => (
          <ActivityPin
            key={activity.id}
            activity={activity}
            onProfilePress={(userId) =>
              navigation.navigate('UserProfile', { userId })
            }
          />
        ))}
      </MapView>
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
