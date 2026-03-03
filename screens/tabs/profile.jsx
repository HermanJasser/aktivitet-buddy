import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

export default function ProfileScreen() {
  const { session } = useAuth();

  async function handleLogout() {
    Alert.alert('Logg ut', 'Er du sikker på at du vil logge ut?', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Logg ut',
        style: 'destructive',
        onPress: () => supabase.auth.signOut(),
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {session?.user?.email?.[0]?.toUpperCase() ?? '?'}
        </Text>
      </View>

      <Text style={styles.email}>{session?.user?.email ?? 'Ikke innlogget'}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Min konto</Text>
        <View style={styles.card}>
          <Text style={styles.cardText}>Bruker-ID: {session?.user?.id ?? '—'}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logg ut</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    padding: 24,
    paddingTop: 48,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1a73e8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  email: {
    fontSize: 16,
    color: '#333',
    marginBottom: 32,
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
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
  },
  cardText: {
    fontSize: 14,
    color: '#555',
  },
  logoutButton: {
    marginTop: 'auto',
    width: '100%',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e53935',
    alignItems: 'center',
  },
  logoutText: {
    color: '#e53935',
    fontSize: 16,
    fontWeight: '600',
  },
});
