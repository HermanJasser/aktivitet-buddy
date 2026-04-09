import { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

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

export default function ActivityCard({ activity, onPress }) {
  const color = ACTIVITY_COLORS[activity.type?.toLowerCase()] ?? ACTIVITY_COLORS.default;
  const icon = ACTIVITY_ICONS[activity.type?.toLowerCase()] ?? '🏅';
  const [participantCount, setParticipantCount] = useState(null);

  useEffect(() => {
    supabase
      .from('activity_participants')
      .select('*', { count: 'exact', head: true })
      .eq('activity_id', activity.id)
      .then(({ count }) => setParticipantCount(count));
  }, [activity.id]);

  const scheduledDate = activity.scheduled_at ? new Date(activity.scheduled_at) : null;
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

  let dateLabel = '';
  if (scheduledDate) {
    const isSameDay = (a, b) =>
      a.getDate() === b.getDate() &&
      a.getMonth() === b.getMonth() &&
      a.getFullYear() === b.getFullYear();

    if (isSameDay(scheduledDate, today)) dateLabel = 'I dag';
    else if (isSameDay(scheduledDate, tomorrow)) dateLabel = 'I morgen';
    else dateLabel = scheduledDate.toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  const timeLabel = scheduledDate
    ? scheduledDate.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
    : '';

  const endLabel = activity.scheduled_end
    ? new Date(activity.scheduled_end).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
    : null;

  const isFull = activity.max_participants && participantCount >= activity.max_participants;

  const endTime = activity.scheduled_end
    ? new Date(activity.scheduled_end)
    : scheduledDate
      ? new Date(scheduledDate.getTime() + 60 * 60 * 1000)
      : null;
  const isPast = endTime ? new Date() > endTime : false;

  return (
    <TouchableOpacity style={[styles.card, isPast && styles.cardPast]} onPress={onPress} activeOpacity={0.85}>
      {/* Left: image */}
      <View style={styles.imageWrapper}>
        {activity.image_url ? (
          <Image source={{ uri: activity.image_url }} style={[styles.image, isPast && styles.imagePast]} />
        ) : (
          <View style={[styles.imageFallback, { backgroundColor: isPast ? '#ccc' : color }]}>
            <Text style={styles.imageFallbackIcon}>{icon}</Text>
          </View>
        )}
      </View>

      {/* Middle: info */}
      <View style={styles.content}>
        <Text style={[styles.typeLabel, { color: isPast ? '#bbb' : color }]}>
          {(activity.type ?? 'Aktivitet').toUpperCase()}
        </Text>
        <Text style={[styles.title, isPast && styles.titlePast]} numberOfLines={1}>{activity.title}</Text>
        {dateLabel ? (
          <Text style={[styles.time, isPast && styles.timePast]}>🕐 {dateLabel}, {timeLabel}{endLabel ? `–${endLabel}` : ''}</Text>
        ) : null}
        <View style={styles.bottomRow}>
          {participantCount !== null ? (
            <Text style={[styles.participants, isPast && styles.participantsPast]}>
              👥 {participantCount}{activity.max_participants ? `/${activity.max_participants}` : ''}
            </Text>
          ) : null}
        </View>
      </View>

      {isPast ? (
        <View style={styles.pastPill}>
          <Text style={styles.pastPillText}>Avholdt</Text>
        </View>
      ) : isFull ? (
        <View style={styles.ctaPill}>
          <Text style={styles.ctaText}>Fullt</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
    gap: 12,
  },
  imageWrapper: {
    flexShrink: 0,
  },
  image: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  imageFallback: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageFallbackIcon: {
    fontSize: 28,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  time: {
    fontSize: 12,
    color: '#666',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  participants: {
    fontSize: 12,
    color: '#999',
  },
  cardPast: {
    opacity: 0.6,
  },
  imagePast: {
    opacity: 0.5,
  },
  titlePast: {
    color: '#999',
  },
  timePast: {
    color: '#bbb',
  },
  participantsPast: {
    color: '#bbb',
  },
  ctaPill: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexShrink: 0,
    backgroundColor: '#e0e0e0',
  },
  ctaText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  pastPill: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexShrink: 0,
    backgroundColor: '#f0f0f0',
  },
  pastPillText: {
    color: '#999',
    fontWeight: '600',
    fontSize: 12,
  },
});
