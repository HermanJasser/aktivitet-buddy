import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export default function ChatList({ navigation }) {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchChats();
    }, [])
  );

  async function fetchChats() {
    setLoading(true);
    const { data } = await supabase
      .from('chat_members')
      .select('chats(id, name, activity_id, activities(title))')
      .eq('user_id', session.user.id);

    if (data) {
      const chatItems = data.map(d => d.chats).filter(Boolean);
      const withLastMessages = await Promise.all(
        chatItems.map(async (chat) => {
          const { data: msgs } = await supabase
            .from('messages')
            .select('content, created_at, profiles(full_name, username)')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1);
          return { ...chat, lastMessage: msgs?.[0] ?? null };
        })
      );
      setChats(withLastMessages);
    }
    setLoading(false);
  }

  function renderItem({ item }) {
    const lastMsg = item.lastMessage;
    const senderName = lastMsg?.profiles?.full_name || lastMsg?.profiles?.username || '';
    const initial = (item.name || '?')[0].toUpperCase();

    return (
      <TouchableOpacity
        style={styles.chatRow}
        onPress={() => navigation.navigate('ChatRoom', { chat: item })}
        activeOpacity={0.7}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.chatInfo}>
          <Text style={styles.chatName} numberOfLines={1}>{item.name}</Text>
          {item.activities?.title ? (
            <Text style={styles.activityTitle} numberOfLines={1}>{item.activities.title}</Text>
          ) : null}
          {lastMsg ? (
            <Text style={styles.lastMsg} numberOfLines={1}>
              {senderName ? `${senderName.split(' ')[0]}: ` : ''}{lastMsg.content}
            </Text>
          ) : (
            <Text style={styles.noMsg}>Ingen meldinger ennå</Text>
          )}
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Text style={styles.headerBackText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meldinger</Text>
        <View style={{ width: 48 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#7C5CBF" />
      ) : chats.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyTitle}>Ingen chatter ennå</Text>
          <Text style={styles.emptySub}>Meld deg på en aktivitet for å bli med i gruppechatten</Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 10,
  },
  headerBack: { width: 48, alignItems: 'center', justifyContent: 'center' },
  headerBackText: { fontSize: 34, color: '#7C5CBF', lineHeight: 38 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: '#1A1A2E' },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#7C5CBF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  chatInfo: { flex: 1 },
  chatName: { fontSize: 16, fontWeight: '600', color: '#1A1A2E', marginBottom: 2 },
  activityTitle: { fontSize: 12, color: '#7C5CBF', marginBottom: 2 },
  lastMsg: { fontSize: 13, color: '#888' },
  noMsg: { fontSize: 13, color: '#bbb', fontStyle: 'italic' },
  chevron: { fontSize: 24, color: '#ccc', marginLeft: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20 },
});
