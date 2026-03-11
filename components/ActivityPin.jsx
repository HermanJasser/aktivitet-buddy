import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';

const ACTIVITY_COLORS = {
  fotball: '#4caf50',
  løping: '#ff9800',
  sykling: '#00897B',
  tennis: '#9c27b0',
  default: '#7C5CBF',
};

const ACTIVITY_ICONS = {
  fotball: '⚽', basket: '🏀', håndball: '🤾', volleyball: '🏐',
  tennis: '🎾', padel: '🏓', squash: '🎾', bordtennis: '🏓',
  løping: '🏃', sykling: '🚴', svømming: '🏊', trening: '💪',
  klatring: '🧗', fjelltur: '🥾', slalom: '⛷️', randone: '🎿',
  skating: '🛹', skøyting: '⛸️', fisking: '🎣',
};

export default function ActivityPin({ activity, onActivityPress }) {
  const color = ACTIVITY_COLORS[activity.type?.toLowerCase()] ?? ACTIVITY_COLORS.default;
  const icon = ACTIVITY_ICONS[activity.type?.toLowerCase()] ?? '🏅';

  return (
    <Marker
      coordinate={{ latitude: activity.latitude, longitude: activity.longitude }}
      tracksViewChanges={false}
      onPress={() => onActivityPress && onActivityPress(activity)}
      onSelect={() => onActivityPress && onActivityPress(activity)}
    >
      <View style={[styles.pin, { backgroundColor: color }]} pointerEvents="none">
        <Text style={styles.icon}>{icon}</Text>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  icon: {
    fontSize: 20,
  },
});
