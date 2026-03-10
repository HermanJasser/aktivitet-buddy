import { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { PROVIDER_DEFAULT, Marker } from 'react-native-maps';
import { supabase } from '../lib/supabase';

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
  const [organizer, setOrganizer] = useState(null);

  useEffect(() => {
    if (activity.user_id) {
      supabase
        .from('profiles')
        .select('full_name, username, avatar_url')
        .eq('id', activity.user_id)
        .single()
        .then(({ data }) => { if (data) setOrganizer(data); });
    }
  }, [activity.user_id]);

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

  const displayName = organizer?.full_name || organizer?.username || 'Ukjent';
  const initials = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

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
          style={styles.organizerRow}
          onPress={() => navigation.navigate('UserProfile', { userId: activity.user_id })}
          activeOpacity={0.7}
        >
          {organizer?.avatar_url ? (
            <Image source={{ uri: organizer.avatar_url }} style={styles.organizerAvatar} />
          ) : (
            <View style={styles.organizerAvatarFallback}>
              <Text style={styles.organizerInitials}>{initials || '?'}</Text>
            </View>
          )}
          <View style={styles.organizerInfo}>
            <Text style={styles.organizerLabel}>Arrangør</Text>
            <Text style={styles.organizerName}>{displayName}</Text>
          </View>
          <Text style={styles.organizerChevron}>›</Text>
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
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  organizerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  organizerAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1a73e8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  organizerInitials: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
  organizerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  organizerLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  organizerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 2,
  },
  organizerChevron: {
    fontSize: 24,
    color: '#ccc',
  },
});
