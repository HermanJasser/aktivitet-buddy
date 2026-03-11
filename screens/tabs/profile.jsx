import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator, Modal, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import ActivityCard from '../../components/ActivityCard';

export default function ProfileScreen({ navigation }) {
  const { session, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      if (session?.user?.id) fetchMyActivities();
    }, [session?.user?.id])
  );

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, []);

  async function fetchMyActivities() {
    setLoadingActivities(true);
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', session.user.id)
      .order('scheduled_at', { ascending: false });
    if (!error && data) setActivities(data);
    setLoadingActivities(false);
  }

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

  function handleLogout() {
    closeMenu(() => {
      Alert.alert('Logg ut', 'Er du sikker på at du vil logge ut?', [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'Logg ut', style: 'destructive', onPress: () => supabase.auth.signOut() },
      ]);
    });
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : session?.user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <>
      <Modal visible={menuVisible} transparent animationType="none" onRequestClose={() => closeMenu()}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.menuOverlay, { opacity: fadeAnim }]}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => closeMenu()} />
          </Animated.View>
          <Animated.View style={[styles.menuCard, { transform: [{ translateY: slideAnim }] }]}>
            <TouchableOpacity style={styles.menuItem} onPress={() => closeMenu(() => navigation.navigate('Onboarding', { editing: true }))}>
              <Text style={styles.menuItemText}>Rediger profil</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <Text style={[styles.menuItemText, styles.menuItemDestructive]}>Logg ut</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => closeMenu()}>
              <Text style={[styles.menuItemText, { color: '#999' }]}>Avbryt</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      <View style={[styles.customHeader, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>Profil</Text>
        <TouchableOpacity onPress={openMenu} style={styles.headerRight}>
          <Text style={styles.headerDots}>•••</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}

        <Text style={styles.name}>{profile?.full_name ?? session?.user?.email ?? '—'}</Text>

        {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

        {profile?.preferred_activities?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Favorittaktiviteter</Text>
            <View style={styles.chips}>
              {profile.preferred_activities.map(activity => (
                <View key={activity} style={styles.chip}>
                  <Text style={styles.chipText}>{activity}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mine aktiviteter</Text>
          {loadingActivities ? (
            <ActivityIndicator color="#7C5CBF" style={{ marginTop: 8 }} />
          ) : activities.length === 0 ? (
            <Text style={styles.emptyText}>Du har ikke lagt ut noen aktiviteter enda.</Text>
          ) : (
            activities.map(activity => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                onPress={() => navigation.navigate('ActivityDetail', { activity })}
              />
            ))
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 48,
    paddingBottom: 40,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  avatarFallback: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#7C5CBF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A2E',
    marginBottom: 8,
    textAlign: 'center',
  },
  bio: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  section: {
    width: '100%',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#EDE8FF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  chipText: {
    color: '#7C5CBF',
    fontSize: 13,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    paddingVertical: 8,
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerDots: {
    fontSize: 20,
    color: '#7C5CBF',
    letterSpacing: 1,
  },
  menuOverlay: {
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
});
