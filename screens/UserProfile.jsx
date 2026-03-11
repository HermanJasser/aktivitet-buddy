import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import ActivityCard from '../components/ActivityCard';

export default function UserProfile({ route }) {
  const { userId } = route.params;
  const [profile, setProfile] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [userId]);

  async function fetchData() {
    const [profileRes, activitiesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase
        .from('activities')
        .select('*')
        .eq('user_id', userId)
        .order('scheduled_at', { ascending: false }),
    ]);

    if (profileRes.data) setProfile(profileRes.data);
    if (activitiesRes.data) setActivities(activitiesRes.data);
    setLoading(false);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7C5CBF" />
      </View>
    );
  }

  const displayName = profile?.username || profile?.full_name || 'Ukjent bruker';
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <FlatList
      style={styles.container}
      data={activities}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => <ActivityCard activity={item} />}
      ListHeaderComponent={
        <View style={styles.header}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials || '?'}</Text>
            </View>
          )}
          <Text style={styles.name}>{displayName}</Text>
          {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
          <Text style={styles.sectionTitle}>Aktiviteter</Text>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>Ingen aktiviteter enda.</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 12,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#7C5CBF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  bio: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    alignSelf: 'flex-start',
  },
  empty: {
    textAlign: 'center',
    color: '#999',
    padding: 24,
    fontSize: 15,
  },
});
