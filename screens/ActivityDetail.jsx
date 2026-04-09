import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, Modal, Alert, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import MapView, { PROVIDER_DEFAULT, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const ACTIVITY_COLORS = {
  fotball: '#4caf50',
  løping: '#ff9800',
  sykling: '#00897B',
  tennis: '#9c27b0',
  default: '#7C5CBF',
};

export default function ActivityDetail({ route, navigation }) {
  const { activity: initialActivity } = route.params;
  const [activity, setActivity] = useState(initialActivity);
  const color = ACTIVITY_COLORS[activity.type?.toLowerCase()] ?? ACTIVITY_COLORS.default;
  const { session } = useAuth();
  const isOwner = session?.user?.id === activity.user_id;
  const insets = useSafeAreaInsets();
  const [organizer, setOrganizer] = useState(null);
  const [address, setAddress] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const isParticipant = participants.some(p => p.user_id === session?.user?.id);
  const isFull = activity.max_participants && participants.length >= activity.max_participants;

  function openMenu() {
    setMenuVisible(true);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }

  function closeMenu(cb) {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }),
    ]).start(() => { setMenuVisible(false); cb?.(); });
  }

  async function getOrCreateChat(act) {
    const { data } = await supabase
      .from('chats')
      .select('id')
      .eq('activity_id', act.id)
      .limit(1);
    if (data && data.length > 0) return data[0];
    await supabase.from('chats').insert({ activity_id: act.id, name: act.title });
    const { data: created } = await supabase
      .from('chats')
      .select('id')
      .eq('activity_id', act.id)
      .limit(1);
    if (created && created.length > 0) {
      await supabase.from('chat_members').insert({ chat_id: created[0].id, user_id: act.user_id });
      return created[0];
    }
    return null;
  }

  async function fetchParticipants() {
    const { data } = await supabase
      .from('activity_participants')
      .select('user_id, joined_at, profiles(full_name, username, avatar_url)')
      .eq('activity_id', activity.id)
      .order('joined_at', { ascending: true });
    if (data) setParticipants(data);
  }

  useFocusEffect(
    useCallback(() => {
      supabase
        .from('activities')
        .select('*')
        .eq('id', initialActivity.id)
        .single()
        .then(({ data }) => { if (data) setActivity(data); });
      fetchParticipants();
    }, [initialActivity.id])
  );

  useEffect(() => {
    if (activity.user_id) {
      supabase
        .from('profiles')
        .select('full_name, username, avatar_url')
        .eq('id', activity.user_id)
        .single()
        .then(({ data }) => { if (data) setOrganizer(data); });
    }
    if (activity.latitude && activity.longitude) {
      Location.reverseGeocodeAsync({ latitude: activity.latitude, longitude: activity.longitude })
        .then(results => {
          if (results.length > 0) {
            const r = results[0];
            const parts = [r.street, r.streetNumber, r.city].filter(Boolean);
            setAddress(parts.length > 0 ? parts.join(' ') : r.name ?? null);
          }
        })
        .catch(() => {});
    }
  }, [activity.user_id, activity.latitude, activity.longitude]);

  function handleEdit() {
    navigation.navigate('CreateActivity', { activity });
  }

  function confirmDelete() {
    Alert.alert('Slett arrangement', 'Er du sikker på at du vil slette dette arrangementet?', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Slett',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('activities').delete().eq('id', activity.id);
          navigation.goBack();
        },
      },
    ]);
  }

  async function handleJoin() {
    const { error } = await supabase
      .from('activity_participants')
      .insert({ activity_id: activity.id, user_id: session.user.id });
    if (error) {
      Alert.alert('Feil', error.message);
    } else {
      let chat = await getOrCreateChat(activity);
      if (chat) {
        await supabase.from('chat_members').insert({ chat_id: chat.id, user_id: session.user.id });
      }
      fetchParticipants();
    }
  }

  async function handleLeave() {
    Alert.alert('Meld deg av', 'Er du sikker på at du vil melde deg av?', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Meld deg av',
        style: 'destructive',
        onPress: async () => {
          await supabase
            .from('activity_participants')
            .delete()
            .eq('activity_id', activity.id)
            .eq('user_id', session.user.id);
          const { data: chats } = await supabase
            .from('chats')
            .select('id')
            .eq('activity_id', activity.id)
            .limit(1);
          if (chats && chats.length > 0) {
            await supabase
              .from('chat_members')
              .delete()
              .eq('chat_id', chats[0].id)
              .eq('user_id', session.user.id);
          }
          fetchParticipants();
        },
      },
    ]);
  }

  const scheduledDate = new Date(activity.scheduled_at);
  const formattedDate = scheduledDate.toLocaleDateString('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const formattedTimeStart = scheduledDate.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
  const formattedTimeEnd = activity.scheduled_end
    ? new Date(activity.scheduled_end).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
    : null;

  const displayName = organizer?.full_name || organizer?.username || 'Ukjent';
  const initials = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <>
    <View style={[styles.customHeader, { paddingTop: insets.top }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
        <Text style={styles.headerBackText}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Aktivitet</Text>
      {isOwner ? (
        <TouchableOpacity onPress={openMenu} style={styles.headerRight}>
          <Text style={styles.headerDots}>•••</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.headerRight} />
      )}
    </View>

    <Modal visible={menuVisible} transparent animationType="none" onRequestClose={() => closeMenu()}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.menuOverlay, { opacity: fadeAnim }]}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => closeMenu()} />
        </Animated.View>
        <Animated.View style={[styles.menuCard, { transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity style={styles.menuItem} onPress={() => closeMenu(handleEdit)}>
            <Text style={styles.menuItemText}>Rediger</Text>
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity style={styles.menuItem} onPress={() => closeMenu(confirmDelete)}>
            <Text style={[styles.menuItemText, styles.menuItemDestructive]}>Slett arrangement</Text>
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity style={styles.menuItem} onPress={() => closeMenu()}>
            <Text style={[styles.menuItemText, { color: '#999' }]}>Avbryt</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>

    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {activity.image_url ? (
        <Image source={{ uri: activity.image_url }} style={styles.heroImage} />
      ) : null}
      <View style={[styles.typeTag, { backgroundColor: color }]}>
        <Text style={styles.typeText}>{activity.type ?? 'Aktivitet'}</Text>
      </View>

      <Text style={styles.title}>{activity.title}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Tidspunkt</Text>
        <Text style={styles.sectionValue}>{formattedDate}</Text>
        <Text style={styles.sectionValue}>
          {formattedTimeStart}{formattedTimeEnd ? ` – ${formattedTimeEnd}` : ''}
        </Text>
      </View>

      {activity.description ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Beskrivelse</Text>
          <Text style={styles.sectionBody}>{activity.description}</Text>
        </View>
      ) : null}

      {/* Participants */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>
          Deltakere ({participants.length}{activity.max_participants ? `/${activity.max_participants}` : ''})
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.participantsScroll}>
          {participants.map(p => {
            const profile = p.profiles;
            const name = profile?.full_name || profile?.username || '?';
            const pInitials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
            const isOrganizer = p.user_id === activity.user_id;
            return (
              <TouchableOpacity
                key={p.user_id}
                style={styles.participantItem}
                onPress={() => navigation.navigate('UserProfile', { userId: p.user_id })}
                activeOpacity={0.7}
              >
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.participantAvatar} />
                ) : (
                  <View style={[styles.participantAvatarFallback, isOrganizer && styles.organizerAvatarBorder]}>
                    <Text style={styles.participantInitials}>{pInitials}</Text>
                  </View>
                )}
                {isOrganizer && profile?.avatar_url ? (
                  <View style={styles.organizerBadgeContainer}>
                    <View style={styles.organizerAvatarBorderRing} />
                  </View>
                ) : null}
                <Text style={styles.participantName} numberOfLines={1}>
                  {name.split(' ')[0]}{isOrganizer ? ' ★' : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {!isOwner && (
          <TouchableOpacity
            style={[
              styles.joinButton,
              isParticipant && styles.leaveButton,
              isFull && !isParticipant && styles.fullButton,
            ]}
            onPress={isParticipant ? handleLeave : handleJoin}
            disabled={isFull && !isParticipant}
          >
            <Text style={[styles.joinButtonText, isParticipant && styles.leaveButtonText]}>
              {isParticipant ? 'Meld deg av' : isFull ? 'Fullt' : 'Meld deg på'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {activity.latitude && activity.longitude ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Lokasjon</Text>
          {address ? <Text style={styles.addressText}>{address}</Text> : null}
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
    </>
  );
}

const styles = StyleSheet.create({
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 10,
  },
  headerBack: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBackText: {
    fontSize: 34,
    color: '#7C5CBF',
    lineHeight: 38,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  headerRight: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerDots: {
    fontSize: 20,
    color: '#7C5CBF',
    letterSpacing: 1,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  menuCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 34,
  },
  menuItem: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: '#1A1A2E',
  },
  menuItemDestructive: {
    color: '#e53935',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  heroImage: {
    marginHorizontal: -20,
    marginTop: -20,
    height: 300,
    marginBottom: 16,
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
    color: '#1A1A2E',
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
  participantsScroll: {
    marginTop: 10,
    marginBottom: 14,
  },
  participantItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 56,
  },
  participantAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  participantAvatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#7C5CBF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  organizerAvatarBorder: {
    borderWidth: 2.5,
    borderColor: '#f4b400',
  },
  participantInitials: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
  participantName: {
    fontSize: 11,
    color: '#555',
    marginTop: 5,
    textAlign: 'center',
  },
  joinButton: {
    backgroundColor: '#7C5CBF',
    borderRadius: 24,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  joinButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  leaveButton: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e53935',
  },
  leaveButtonText: {
    color: '#e53935',
  },
  fullButton: {
    backgroundColor: '#e0e0e0',
  },
  addressText: {
    fontSize: 15,
    color: '#444',
    marginBottom: 10,
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
    backgroundColor: '#7C5CBF',
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
    color: '#1A1A2E',
    marginTop: 2,
  },
  organizerChevron: {
    fontSize: 24,
    color: '#ccc',
  },
});
