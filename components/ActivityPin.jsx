import { View, Text, StyleSheet } from 'react-native';
import { Marker, Callout } from 'react-native-maps';

const ACTIVITY_COLORS = {
  fotball: '#4caf50',
  løping: '#ff9800',
  sykling: '#2196f3',
  tennis: '#9c27b0',
  default: '#1a73e8',
};

export default function ActivityPin({ activity }) {
  const color = ACTIVITY_COLORS[activity.type?.toLowerCase()] ?? ACTIVITY_COLORS.default;

  return (
    <Marker
      coordinate={{
        latitude: activity.latitude,
        longitude: activity.longitude,
      }}
    >
      <View style={[styles.pin, { backgroundColor: color }]}>
        <Text style={styles.pinText}>{activity.type?.[0]?.toUpperCase() ?? '?'}</Text>
      </View>
      <Callout>
        <View style={styles.callout}>
          <Text style={styles.calloutTitle}>{activity.title}</Text>
          <Text style={styles.calloutSub}>{activity.type}</Text>
        </View>
      </Callout>
    </Marker>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  pinText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  callout: {
    padding: 8,
    minWidth: 120,
  },
  calloutTitle: {
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 2,
  },
  calloutSub: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
});
