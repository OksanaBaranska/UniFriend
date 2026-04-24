import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { auth, db } from "../firebase/config";
import { RootStackParamList, UserProfile } from "../types";
import { useTheme } from "../hooks/useTheme";

interface MatchItem {
  matchId: string;
  user: UserProfile;
  lastMessage?: string;
  lastMessageAt?: number;
  isUnread?: boolean;
}

type FilterKey = "all" | "unread" | "sameCourse" | "thisWeek";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all",        label: "All" },
  { key: "unread",     label: "Unread" },
  { key: "sameCourse", label: "Same course" },
  { key: "thisWeek",   label: "This week" },
];

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default function MatchesScreen() {
  const c = useTheme();
  const uid = auth.currentUser!.uid;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [matches, setMatches]     = useState<MatchItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [myMajor, setMyMajor]     = useState<string | undefined>();

  const styles = useMemo(() => StyleSheet.create({
    root:       { flex: 1, backgroundColor: c.background },
    centered:   { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.background },

    /* Header */
    header:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                  paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12 },
    headerTitle:{ fontSize: 22, fontWeight: "600", color: c.text, letterSpacing: -0.4 },
    filterIcon: { padding: 4 },

    /* Filter chips */
    filterRow:  { paddingHorizontal: 16, paddingBottom: 14, paddingTop: 4, alignItems: "center" },
    filterChip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999,
                  backgroundColor: c.card, borderWidth: 1, borderColor: c.borderStrong,
                  marginRight: 8, alignSelf: "flex-start" },
    filterChipActive: { backgroundColor: c.text, borderColor: c.text },
    filterChipText:       { fontSize: 13, fontWeight: "600", color: c.text },
    filterChipTextActive: { fontSize: 13, fontWeight: "600", color: c.card },

    /* Main card */
    card:       { marginHorizontal: 16, backgroundColor: c.card, borderRadius: 24,
                  shadowColor: "#1A1916", shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.10, shadowRadius: 24, elevation: 4,
                  marginBottom: 24, overflow: "hidden" },

    /* Section header inside card */
    sectionHead:{ flexDirection: "row", justifyContent: "space-between", alignItems: "center",
                  paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
    sectionLabel:{ fontSize: 11, fontWeight: "600", color: c.textSecondary,
                   letterSpacing: 0.14 * 11, textTransform: "uppercase" },
    sectionCount:{ fontSize: 12, fontWeight: "500", color: c.textSecondary },

    /* Match row */
    row:        { flexDirection: "row", alignItems: "center", gap: 14,
                  paddingHorizontal: 16, paddingVertical: 14,
                  borderTopWidth: 1, borderTopColor: c.border },
    avatar:     { width: 56, height: 56, borderRadius: 28 },
    avatarPlaceholder: { width: 56, height: 56, borderRadius: 28,
                         backgroundColor: c.accentLight, alignItems: "center", justifyContent: "center" },
    avatarEmoji:{ fontSize: 24 },
    info:       { flex: 1, minWidth: 0 },
    nameRow:    { flexDirection: "row", alignItems: "center", gap: 6 },
    name:       { fontSize: 17, fontWeight: "700", color: c.text, letterSpacing: -0.01 * 17 },
    unreadDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: "#2F55EB" },
    meta:       { fontSize: 13, fontWeight: "500", color: c.textSecondary, marginTop: 1 },
    lastMsg:    { fontSize: 13, color: c.textSecondary, fontStyle: "italic", marginTop: 2 },
    sayHello:   { fontSize: 13, fontWeight: "600", color: c.text, marginTop: 2 },
    chevron:    { fontSize: 18, color: c.textMuted },

    /* Empty */
    emptyWrap:  { paddingVertical: 48, alignItems: "center" },
    emptyTitle: { fontSize: 20, fontWeight: "700", color: c.text, marginBottom: 8 },
    emptySub:   { fontSize: 15, color: c.textSecondary },
  }), [c]);

  useFocusEffect(useCallback(() => { loadMatches(); }, []));

  async function loadMatches() {
    setLoading(true);
    try {
      const [snap, meSnap] = await Promise.all([
        getDocs(query(collection(db, "matches"), where("users", "array-contains", uid))),
        getDoc(doc(db, "users", uid)),
      ]);
      const me = meSnap.data() as UserProfile | undefined;
      setMyMajor(me?.major);

      const now = Date.now();
      const items: MatchItem[] = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data();
          const otherUid = data.users.find((u: string) => u !== uid);
          const [userSnap, msgSnap] = await Promise.all([
            getDoc(doc(db, "users", otherUid)),
            getDocs(query(collection(db, "matches", d.id, "messages"), orderBy("createdAt", "desc"), limit(1))),
          ]);
          const lastMsg = msgSnap.docs[0]?.data();
          const lastMessageAt: number | undefined = lastMsg?.createdAt;
          const isNew = !lastMsg;
          return {
            matchId: d.id,
            user: userSnap.data() as UserProfile,
            lastMessage: lastMsg?.text,
            lastMessageAt,
            isUnread: isNew,
          };
        })
      );
      // Sort: new matches first, then by most recent message
      items.sort((a, b) => {
        if (a.isUnread && !b.isUnread) return -1;
        if (!a.isUnread && b.isUnread) return 1;
        return (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0);
      });
      setMatches(items);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const now = Date.now();
    return matches.filter((m) => {
      if (activeFilter === "unread")     return m.isUnread;
      if (activeFilter === "sameCourse") return myMajor ? m.user.major === myMajor : true;
      if (activeFilter === "thisWeek")   return m.lastMessageAt != null && (now - m.lastMessageAt) < ONE_WEEK_MS;
      return true;
    });
  }, [matches, activeFilter, myMajor]);

  const newMatches   = filtered.filter((m) => m.isUnread);
  const chatMatches  = filtered.filter((m) => !m.isUnread);
  const totalCount   = filtered.length;

  function renderRow(item: MatchItem) {
    const displayName = item.user.name || item.user.email?.split("@")[0] || "—";
    return (
      <TouchableOpacity
        key={item.matchId}
        style={styles.row}
        onPress={() => navigation.navigate("Chat", { matchId: item.matchId, otherUserName: displayName })}
        activeOpacity={0.7}
      >
        {item.user.photos?.[0]
          ? <Image source={{ uri: item.user.photos[0] }} style={styles.avatar} />
          : <View style={styles.avatarPlaceholder}><Text style={styles.avatarEmoji}>👤</Text></View>}

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{displayName}</Text>
            {item.isUnread && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.meta} numberOfLines={1}>
            {item.user.major}{item.user.semester != null ? ` · Sem ${item.user.semester}` : ""}
          </Text>
          {item.isUnread
            ? <Text style={styles.sayHello}>Say hello!</Text>
            : <Text style={styles.lastMsg} numberOfLines={1}>{item.lastMessage}</Text>}
        </View>

        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={c.accent} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Matches</Text>
        <TouchableOpacity style={styles.filterIcon}>
          {/* Filter / sort icon — three lines */}
          <View style={{ gap: 4 }}>
            {[12, 8, 5].map((w, i) => (
              <View key={i} style={{ width: w, height: 1.5, backgroundColor: c.text, borderRadius: 1 }} />
            ))}
          </View>
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map(({ key, label }) => {
          const isActive = activeFilter === key;
          const chipLabel = key === "all" ? `${label} · ${matches.length}` : label;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setActiveFilter(key)}
              activeOpacity={0.75}
            >
              <Text style={isActive ? styles.filterChipTextActive : styles.filterChipText}>
                {chipLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={[styles.card, styles.emptyWrap]}>
            <Text style={styles.emptyTitle}>No matches yet</Text>
            <Text style={styles.emptySub}>Keep swiping!</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {/* NEW section */}
            {newMatches.length > 0 && (
              <>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionLabel}>New</Text>
                  <Text style={styles.sectionCount}>{newMatches.length} new</Text>
                </View>
                {newMatches.map(renderRow)}
              </>
            )}

            {/* CHATS section */}
            {chatMatches.length > 0 && (
              <>
                <View style={[styles.sectionHead, newMatches.length > 0 && { paddingTop: 18 }]}>
                  <Text style={styles.sectionLabel}>Chats</Text>
                  <Text style={styles.sectionCount}>{chatMatches.length} active</Text>
                </View>
                {chatMatches.map(renderRow)}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
