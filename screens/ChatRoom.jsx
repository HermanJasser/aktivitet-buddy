import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export default function ChatRoom({ route, navigation }) {
  const { chat: initialChat } = route.params;
  const [chat, setChat] = useState(initialChat);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [activity, setActivity] = useState(null);
  const { session, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef(null);

  useFocusEffect(
    useCallback(() => {
      supabase
        .from('chat_members')
        .select('user_id')
        .eq('chat_id', chat.id)
        .eq('user_id', session.user.id)
        .single()
        .then(({ data }) => {
          if (!data) navigation.goBack();
        });
    }, [chat.id, session.user.id])
  );

  useEffect(() => {
    fetchMessages();
    if (initialChat.activity_id) {
      supabase.from('activities').select('*').eq('id', initialChat.activity_id).single()
        .then(({ data }) => { if (data) setActivity(data); });
    }

    const subscription = supabase
      .channel(`chat:${chat.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chat.id}`,
      }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }, [chat.id]);

  async function fetchMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*, profiles(full_name, username, avatar_url)')
      .eq('chat_id', chat.id)
      .order('created_at', { ascending: true });
    if (data) {
      setMessages(data);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 50);
    }
  }

  async function sendMessage() {
    const content = input.trim();
    if (!content || sending) return;
    setInput('');
    setSending(true);
    const { error } = await supabase.from('messages').insert({
      chat_id: chat.id,
      user_id: session.user.id,
      content,
    });
    if (error) console.error('Send message error:', error);
    else fetchMessages();
    setSending(false);
  }

  function handleRename() {
    Alert.prompt(
      'Gi chatten nytt navn',
      '',
      async (newName) => {
        if (!newName?.trim() || newName.trim() === chat.name) return;
        const trimmed = newName.trim();
        const { error } = await supabase
          .from('chats')
          .update({ name: trimmed })
          .eq('id', chat.id);
        if (!error) {
          setChat(c => ({ ...c, name: trimmed }));
          const senderName = profile?.full_name || profile?.username || 'Noen';
          await supabase.from('messages').insert({
            chat_id: chat.id,
            user_id: session.user.id,
            content: `${senderName} endret navn til "${trimmed}"`,
            is_system: true,
          });
        }
      },
      'plain-text',
      chat.name
    );
  }

  function renderMessage({ item, index }) {
    if (item.is_system) {
      return (
        <View style={styles.systemMsgRow}>
          <Text style={styles.systemMsgText}>{item.content}</Text>
        </View>
      );
    }

    const isMe = item.user_id === session.user.id;
    const senderName = item.profiles?.full_name || item.profiles?.username || 'Ukjent';
    const prevItem = messages[index - 1];
    const showSender = !isMe && (!prevItem || prevItem.user_id !== item.user_id || prevItem.is_system);

    return (
      <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
        {!isMe && (
          <View style={styles.msgAvatarWrap}>
            {showSender ? (
              item.profiles?.avatar_url ? (
                <Image source={{ uri: item.profiles.avatar_url }} style={styles.msgAvatar} />
              ) : (
                <View style={[styles.msgAvatar, styles.msgAvatarFallback]}>
                  <Text style={styles.msgAvatarText}>{senderName[0].toUpperCase()}</Text>
                </View>
              )
            ) : (
              <View style={styles.msgAvatarSpacer} />
            )}
          </View>
        )}
        <View style={styles.msgBubbleWrap}>
          {showSender && (
            <Text style={styles.msgSender}>{senderName.split(' ')[0]}</Text>
          )}
          <View style={[styles.msgBubble, isMe ? styles.msgBubbleMe : styles.msgBubbleThem]}>
            <Text style={[styles.msgText, isMe && styles.msgTextMe]}>{item.content}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f7f7f7' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Text style={styles.headerBackText}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerCenter} onPress={handleRename} activeOpacity={0.7}>
          <Text style={styles.headerTitle} numberOfLines={1}>{chat.name}</Text>
          <Text style={styles.headerSub}>Trykk for å gi nytt navn</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerRight}
          onPress={() => activity && navigation.navigate('ActivityDetail', { activity })}
          disabled={!activity}
        >
          <MaterialIcons name="event" size={24} color={activity ? '#7C5CBF' : '#ccc'} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.msgList}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Input */}
      <View style={[styles.inputRow, { paddingBottom: insets.bottom + 6 }]}>
        <TextInput
          style={styles.input}
          placeholder="Skriv en melding..."
          placeholderTextColor="#aaa"
          value={input}
          onChangeText={setInput}
          multiline
          returnKeyType="default"
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!input.trim() || sending}
        >
          <Text style={styles.sendBtnText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 10,
  },
  headerBack: { width: 48, alignItems: 'center', justifyContent: 'center' },
  headerRight: { width: 48, alignItems: 'center', justifyContent: 'center' },
  headerBackText: { fontSize: 34, color: '#7C5CBF', lineHeight: 38 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  headerSub: { fontSize: 11, color: '#aaa', marginTop: 1 },
  msgList: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8 },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 6,
  },
  msgRowMe: { flexDirection: 'row-reverse' },
  msgAvatarWrap: { width: 32, marginRight: 6 },
  msgAvatarSpacer: { width: 32 },
  msgAvatar: { width: 28, height: 28, borderRadius: 14 },
  msgAvatarFallback: {
    backgroundColor: '#7C5CBF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgAvatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  msgBubbleWrap: { maxWidth: '72%' },
  msgSender: { fontSize: 11, color: '#888', marginBottom: 2, marginLeft: 10 },
  msgBubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  msgBubbleMe: {
    backgroundColor: '#7C5CBF',
    borderBottomRightRadius: 4,
  },
  msgBubbleThem: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  msgText: { fontSize: 15, color: '#222', lineHeight: 21 },
  msgTextMe: { color: '#fff' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 120,
    color: '#222',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7C5CBF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#ccc' },
  sendBtnText: { color: '#fff', fontSize: 18, fontWeight: '700', lineHeight: 22 },
  systemMsgRow: { alignItems: 'center', marginVertical: 8, paddingHorizontal: 20 },
  systemMsgText: { fontSize: 12, color: '#aaa', textAlign: 'center' },
});
