import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { PROVIDER_DEFAULT, Marker } from 'react-native-maps';

const ACTIVITY_COLORS = {
  fotball: '#4caf50',
  løping: '#ff9800',
  sykling: '#2196f3',
  tennis: '#9c27b0',
  default: '#1a73e8',
};

export default function ActivityDetail({ route, navigation }) {
  const { activity } = route.params;
  const color = ACTIVITY_COLORS[activity.type?.toLowerCase()] ?? ACTIVITY_COLORS.default;

  const scheduledDate = new Date(activity.scheduled_at);
  const formattedDate = scheduledDate.toLocaleDateString('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const formattedTime = scheduledDate.toLocaleTimeString('nb-NO', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.typeTag, { backgroundColor: color }]}>
        <Text style={styles.typeText}>{activity.type ?? 'Aktivitet'}</Text>
      </View>

      <Text style={styles.title}>{activity.title}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Tidspunkt</Text>
        <Text style={styles.sectionValue}>{formattedDate}</Text>
        <Text style={styles.sectionValue}>{formattedTime}</Text>
      </View>

      {activity.description ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Beskrivelse</Text>
          <Text style={styles.sectionBody}>{activity.description}</Text>
        </View>
      ) : null}

      {activity.latitude && activity.longitude ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Lokasjon</Text>
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              provider={PROVIDER_DEFAULT}
              initialRegion={{
                latitude: activity.latitude,
                longitude: activity.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              <Marker coordinate={{ latitude: activity.latitude, longitude: activity.longitude }} />
            </MapView>
          </View>
        </View>
      ) : null}

      {activity.user_id ? (
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('UserProfile', { userId: activity.user_id })}
        >
          <Text style={styles.profileButtonText}>Se arrangørens profil</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  typeTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  typeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  sectionValue: {
    fontSize: 16,
    color: '#222',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  sectionBody: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
  },
  mapContainer: {
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 8,
  },
  map: {
    height: 180,
  },
  profileButton: {
    marginTop: 4,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#1a73e8',
  },
  profileButtonText: {
    color: '#1a73e8',
    fontWeight: '600',
    fontSize: 15,
  },
});
