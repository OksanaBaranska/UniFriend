import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { collection, addDoc, onSnapshot, orderBy, query, updateDoc, doc, arrayUnion } from "firebase/firestore";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { auth, db } from "../firebase/config";
import { Message, RootStackParamList } from "../types";
import { useTheme } from "../hooks/useTheme";

type ChatRouteProp = RouteProp<RootStackParamList, "Chat">;

export default function ChatScreen() {
  const c = useTheme();
  const { matchId, otherUserName } = useRoute<ChatRouteProp>().params;
  const navigation = useNavigation();
  const uid = auth.currentUser!.uid;
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: c.card },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.card },
    header: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingBottom: 12, paddingHorizontal: 16,
      borderBottomWidth: 1, borderBottomColor: c.border,
      backgroundColor: c.card,
    },
    back: { fontSize: 32, color: c.accent, lineHeight: 34 },
    headerName: { fontSize: 17, fontWeight: "700", color: c.text },
    messageList: { padding: 16, flexGrow: 1 },
    emptyChat: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
    emptyChatText: { color: c.textMuted, fontSize: 15 },
    bubbleRow: { marginBottom: 8 },
    bubbleRowMe: { alignItems: "flex-end" },
    bubbleRowThem: { alignItems: "flex-start" },
    bubble: { maxWidth: "75%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
    bubbleMe: { backgroundColor: c.accent, borderBottomRightRadius: 4 },
    bubbleThem: { backgroundColor: c.background, borderBottomLeftRadius: 4 },
    bubbleText: { fontSize: 15, lineHeight: 20 },
    bubbleTextMe: { color: "#fff" },
    bubbleTextThem: { color: c.text },
    receipt: { fontSize: 11, color: c.textMuted, marginTop: 2, marginRight: 2 },
    receiptRead: { color: c.accent },
    inputRow: {
      flexDirection: "row", alignItems: "flex-end",
      paddingHorizontal: 12, paddingTop: 10,
      borderTopWidth: 1, borderTopColor: c.border,
      backgroundColor: c.card, gap: 8,
    },
    input: {
      flex: 1, borderWidth: 1, borderColor: c.inputBorder, borderRadius: 22,
      paddingHorizontal: 16, paddingVertical: 10, fontSize: 15,
      color: c.text, backgroundColor: c.inputBg, maxHeight: 100,
    },
    sendButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" },
    sendDisabled: { opacity: 0.4 },
    sendText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  }), [c]);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardWillShow", () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener("keyboardWillHide", () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  useEffect(() => {
    navigation.setOptions({ title: otherUserName });
    updateDoc(doc(db, "matches", matchId), { seenBy: arrayUnion(uid) });
    const q = query(collection(db, "matches", matchId, "messages"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const msgs: Message[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Message, "id">) }));
      setMessages(msgs);
      setLoading(false);
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.fromUid !== uid && !(data.readBy ?? []).includes(uid)) {
          updateDoc(doc(db, "matches", matchId, "messages", d.id), { readBy: [...(data.readBy ?? []), uid] });
        }
      });
    });
    return unsub;
  }, [matchId]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    await addDoc(collection(db, "matches", matchId, "messages"), { fromUid: uid, text: trimmed, createdAt: Date.now(), readBy: [uid] });
  }

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={c.accent} /></View>;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerName}>{otherUserName}</Text>
        <View style={{ width: 24 }} />
      </View>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={<View style={styles.emptyChat}><Text style={styles.emptyChatText}>Say hi to {otherUserName}!</Text></View>}
        renderItem={({ item }) => {
          const isMe = item.fromUid === uid;
          const isRead = (item.readBy ?? []).some((id) => id !== uid);
          return (
            <View style={[styles.bubbleRow, isMe ? styles.bubbleRowMe : styles.bubbleRowThem]}>
              <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>{item.text}</Text>
              </View>
              {isMe && <Text style={[styles.receipt, isRead && styles.receiptRead]}>{isRead ? "✓✓" : "✓"}</Text>}
            </View>
          );
        }}
      />
      <View style={[styles.inputRow, { paddingBottom: keyboardVisible ? 10 : Math.max(insets.bottom, 16) }]}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor={c.placeholder}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity style={[styles.sendButton, !text.trim() && styles.sendDisabled]} onPress={handleSend} disabled={!text.trim()}>
          <Text style={styles.sendText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
