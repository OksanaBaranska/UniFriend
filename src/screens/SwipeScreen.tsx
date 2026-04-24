import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
} from "react-native";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { useFocusEffect } from "@react-navigation/native";
import { auth, db } from "../firebase/config";
import { filterCandidates } from "../utils/filterCandidates";
import { Filters, UserProfile } from "../types";
import { VIBE_CATEGORIES } from "../constants/vibes";
import { useTheme } from "../hooks/useTheme";

// ─── Shared-feature colour families (green · blue · purple · pink · yellow) ──
const CHIP_LIGHT = [
  { bg: "#EDFAF1", border: "#A7E3BB", text: "#15803D" }, // green
  { bg: "#EEF4FF", border: "#BFCFFB", text: "#3B5FD9" }, // blue
  { bg: "#F3EFFE", border: "#C9B8F8", text: "#6D28D9" }, // purple
  { bg: "#FFF0F6", border: "#F9C0D8", text: "#BE185D" }, // pink
  { bg: "#FEFCE8", border: "#FDE047", text: "#854D0E" }, // yellow
];
const CHIP_DARK = [
  { bg: "#052E10", border: "#166534", text: "#4ADE80" }, // green
  { bg: "#0B1740", border: "#1E3A8A", text: "#93C5FD" }, // blue
  { bg: "#1A0B40", border: "#4C1D95", text: "#C4B5FD" }, // purple
  { bg: "#2D0A1A", border: "#831843", text: "#F9A8D4" }, // pink
  { bg: "#1C1300", border: "#713F12", text: "#FDE68A" }, // yellow
];

// ─── Vibe label map ───────────────────────────────────────────────────────────
const VIBE_LABEL: Record<string, string> = {
  hangout: "Hangout vibe",
  lifeFeelsLike: "Life right now",
  showUpAs: "I show up as",
};

// ─── ProfileCard ─────────────────────────────────────────────────────────────
function ProfileCard({
  profile,
  myInterests,
  myVibes,
}: {
  profile: UserProfile;
  myInterests: string[];
  myVibes: import("../constants/vibes").Vibes;
}) {
  const c = useTheme();
  const isDark = useColorScheme() === "dark";
  const chips = isDark ? CHIP_DARK : CHIP_LIGHT;

  const photos = profile.photos ?? [];
  const prompts = profile.prompts ?? [];
  const interests = profile.interests ?? [];
  const extraPhotos = photos.slice(1);

  // For lighting up shared interests
  const myLower = myInterests.map((i) => i.toLowerCase());

  // Vibe rows — include myValue so we can detect matches
  const vibeRows = VIBE_CATEGORIES
    .filter((cat) => profile.vibes?.[cat.key])
    .map((cat) => ({
      label:   VIBE_LABEL[cat.key] ?? cat.label,
      value:   profile.vibes![cat.key]!,
      myValue: myVibes[cat.key],
    }));

  // Day in the life items
  const dayItems = extraPhotos
    .map((photo, i) => ({ photo, prompt: prompts[i] ?? null }))
    .filter((item) => item.photo);

  const s = useMemo(() => StyleSheet.create({
    scroll:         { flex: 1, backgroundColor: c.card },
    sep:            { height: 1, backgroundColor: c.border, marginHorizontal: 20 },
    dashedSep:      { height: 1, marginHorizontal: 20, borderStyle: "dashed", borderWidth: 1, borderColor: c.borderStrong },
    sectionLabel:   { fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: c.textSecondary, fontWeight: "600", paddingHorizontal: 20, paddingBottom: 8 },

    // Identity
    identRow:       { flexDirection: "row", alignItems: "flex-start", gap: 14, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 18 },
    avatar:         { width: 130, height: 130, borderRadius: 20, backgroundColor: c.cardAlt, borderWidth: 1, borderColor: c.border, overflow: "hidden", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    avatarEmoji:    { fontSize: 44 },
    identName:      { fontSize: 26, fontWeight: "700", color: c.text, letterSpacing: -0.5, lineHeight: 30 },
    identCourse:    { fontSize: 12, color: c.textSecondary, fontWeight: "500", marginTop: 4 },
    lookingText:    { fontSize: 14, color: c.text, lineHeight: 20, marginTop: 8 },

    // Chips
    chipsWrap:      { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 20, paddingBottom: 18 },

    // Vibe
    vibeBlock:      { paddingHorizontal: 20 },
    vibeRow:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border },
    vibeKey:        { fontSize: 13, color: c.textSecondary, fontWeight: "500" },
    vibeVal:        { fontSize: 13, color: c.text, fontWeight: "600" },

    // Break the ice
    iceCard:        { margin: 16, marginTop: 16, borderWidth: 1, borderColor: isDark ? "#1A5229" : "#C6E4CA", borderRadius: 16, padding: 16, backgroundColor: isDark ? "#0A2410" : "#EEF8F0" },
    iceLabel:       { fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: isDark ? "#4ADE80" : "#1F6E39", fontWeight: "700", marginBottom: 8 },
    iceBody:        { fontSize: 15, color: c.text, fontWeight: "600", lineHeight: 20, flex: 1 },
    iceRow:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    iceBtn:         { flexShrink: 0, backgroundColor: c.card, borderWidth: 1, borderColor: isDark ? "#1A5229" : "#C6E4CA", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
    iceBtnText:     { fontSize: 13, fontWeight: "600", color: isDark ? "#4ADE80" : "#1F6E39" },

    // Day in the life
    dayHead:        { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 18 },
    dayKicker:      { fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: c.textSecondary, fontWeight: "600", marginBottom: 6 },
    dayTitle:       { fontSize: 28, fontWeight: "800", color: c.text, letterSpacing: -0.5, lineHeight: 32 },
    dayTitleItalic: { fontStyle: "italic", fontWeight: "700" },
    photoBlock:     { paddingHorizontal: 20, paddingBottom: 20 },
    photoFrame:     { width: "100%", aspectRatio: 4 / 3, borderRadius: 16, overflow: "hidden", backgroundColor: c.cardAlt, borderWidth: 1, borderColor: c.border },
    photoImg:       { width: "100%", height: "100%" },
    photoDesc:      { fontSize: 14, fontStyle: "italic", color: c.text, marginTop: 10, lineHeight: 20 },
  }), [c, isDark]);

  return (
    <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} nestedScrollEnabled>

      {/* ── Identity ── */}
      <View style={s.identRow}>
        <View style={s.avatar}>
          {photos[0]
            ? <Image source={{ uri: photos[0] }} style={{ width: 130, height: 130 }} />
            : <Text style={s.avatarEmoji}>👤</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.identName} numberOfLines={2}>
            {profile.name || profile.email.split("@")[0]}
          </Text>
          <Text style={s.identCourse}>
            {profile.major} · {profile.semester}
            <Text style={{ fontSize: 9 }}>
              {["st","nd","rd"][profile.semester - 1] ?? "th"}
            </Text>
            {" semester"}
          </Text>
          {!!(profile.status ?? (profile as any).bio) && (
            <Text style={s.lookingText} numberOfLines={4}>
              {profile.status ?? (profile as any).bio}
            </Text>
          )}
        </View>
      </View>

      <View style={s.sep} />

      {/* ── Interests (all shown, shared ones lit up) ── */}
      {interests.length > 0 && (
        <>
          <Text style={[s.sectionLabel, { paddingTop: 14 }]}>Interests</Text>
          <View style={s.chipsWrap}>
            {interests.map((tag, i) => {
              const isTagShared = myLower.includes(tag.toLowerCase());
              const family = chips[i % chips.length];
              return isTagShared ? (
                <View key={tag} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: family.bg, borderWidth: 1, borderColor: family.border }}>
                  <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: family.text, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 9, color: "#fff", fontWeight: "700", lineHeight: 14 }}>✓</Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: family.text }}>{tag}</Text>
                </View>
              ) : (
                <View key={tag} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: c.cardAlt, borderWidth: 1, borderColor: c.borderStrong }}>
                  <Text style={{ fontSize: 13, fontWeight: "500", color: c.textSecondary }}>{tag}</Text>
                </View>
              );
            })}
          </View>
          <View style={s.sep} />
        </>
      )}

      {/* ── Vibe ── */}
      {vibeRows.length > 0 && (
        <>
          <View style={[s.vibeBlock, { paddingTop: 8 }]}>
            {vibeRows.map((row, i) => {
              const isVibeShared = row.myValue !== undefined && row.myValue === row.value;
              const family = chips[i % chips.length];
              return (
                <View key={row.label} style={[s.vibeRow, i === vibeRows.length - 1 && { borderBottomWidth: 0, paddingBottom: 14 }]}>
                  <Text style={s.vibeKey}>{row.label}</Text>
                  {isVibeShared ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: family.bg, borderWidth: 1, borderColor: family.border }}>
                      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: family.text, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 8, color: "#fff", fontWeight: "700", lineHeight: 12 }}>✓</Text>
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: family.text }}>{row.value}</Text>
                    </View>
                  ) : (
                    <Text style={s.vibeVal}>{row.value}</Text>
                  )}
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* ── Break the ice ── (commented out, doesn't fit pre-match flow)
      {!!(profile.status ?? (profile as any).bio) && (
        <View style={s.iceCard}>
          <Text style={s.iceLabel}>Break the ice</Text>
          <View style={s.iceRow}>
            <Text style={s.iceBody}>
              {"Ask about: " + (profile.status ?? (profile as any).bio ?? "").split(/[.,!?]/)[0].trim()}
            </Text>
            <View style={s.iceBtn}>
              <Text style={s.iceBtnText}>Use →</Text>
            </View>
          </View>
        </View>
      )}
      */}

      {/* ── Day in the life ── */}
      {dayItems.length > 0 && (
        <>
          <View style={s.sep} />
          {dayItems.length >= 2 ? (
            <View style={s.dayHead}>
              <Text style={s.dayKicker}>A day in the life</Text>
              <Text style={s.dayTitle}>
                Every photo{"\n"}
                <Text style={s.dayTitleItalic}>tells a story</Text>
              </Text>
            </View>
          ) : (
            <View style={{ height: 20 }} />
          )}
          {dayItems.map(({ photo, prompt }, i) => (
            <React.Fragment key={i}>
              <View style={s.photoBlock}>
                <View style={s.photoFrame}>
                  <Image source={{ uri: photo }} style={s.photoImg} resizeMode="cover" />
                </View>
                {!!prompt?.answer && (
                  <Text style={s.photoDesc}>{prompt.answer}</Text>
                )}
              </View>
              {i < dayItems.length - 1 && <View style={s.dashedSep} />}
            </React.Fragment>
          ))}
        </>
      )}

      {/* Space so floating buttons don't cover last content */}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// ─── SwipeScreen ─────────────────────────────────────────────────────────────
export default function SwipeScreen() {
  const c = useTheme();
  const uid = auth.currentUser!.uid;
  const [candidates, setCandidates] = useState<UserProfile[]>([]);
  const [myInterests, setMyInterests] = useState<string[]>([]);
  const [myVibes, setMyVibes] = useState<import("../constants/vibes").Vibes>({});
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastSwiped, setLastSwiped] = useState<UserProfile | null>(null);

  const styles = useMemo(() => StyleSheet.create({
    container:      { flex: 1, backgroundColor: c.background },
    centered:       { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.background },
    headerRow:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 60, paddingBottom: 12, paddingHorizontal: 20 },
    headerBrand:    { fontSize: 22, fontWeight: "700", color: c.text, letterSpacing: -0.4 },
    undoButton:     { backgroundColor: c.cardAlt, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: c.border },
    undoText:       { color: c.textSecondary, fontWeight: "600", fontSize: 14 },
    cardWrapper:    {
      flex: 1, marginHorizontal: 16, marginBottom: 4, borderRadius: 24, overflow: "hidden",
      backgroundColor: c.card,
      shadowColor: "#0F0F0F", shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 6,
    },
    buttonRow:      { position: "absolute", bottom: 24, left: 0, right: 0, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 28 },
    passButton:     { width: 62, height: 62, borderRadius: 31, backgroundColor: c.card, borderWidth: 1.5, borderColor: c.borderStrong, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
    passText:       { fontSize: 22, color: c.text },
    likeButton:     { width: 62, height: 62, borderRadius: 31, backgroundColor: c.card, borderWidth: 1.5, borderColor: "#EFCAC3", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
    likeText:       { fontSize: 26, color: "#D9456A" },
    emptyTitle:     { fontSize: 20, fontWeight: "700", color: c.text, marginBottom: 8 },
    emptySubtitle:  { fontSize: 15, color: c.textSecondary, textAlign: "center", paddingHorizontal: 40 },
  }), [c]);

  useFocusEffect(useCallback(() => { loadCandidates(); }, []));

  async function loadCandidates() {
    setLoading(true);
    try {
      const [myProfileSnap, filtersSnap, likedSnap] = await Promise.all([
        getDoc(doc(db, "users", uid)),
        getDoc(doc(db, "filters", uid)),
        getDocs(collection(db, "likes", uid, "sent")),
      ]);
      if (!myProfileSnap.exists()) return;
      const me = myProfileSnap.data() as UserProfile;
      setMyInterests(me.interests ?? []);
      setMyVibes(me.vibes ?? {});

      const fd = filtersSnap.exists() ? filtersSnap.data() : {};
      const filters: Filters = {
        genders: fd.genders ?? (fd.gender && fd.gender !== "Any" ? [fd.gender] : []),
        interests: fd.interests ?? [],
        semesterRange: fd.semesterRange ?? [1, 20],
        programFilter: fd.programFilter ?? "any",
      };

      const seenUids = new Set<string>(likedSnap.docs.map((d) => d.id));
      seenUids.add(uid);

      const snap = await getDocs(query(collection(db, "users"), where("university", "==", me.university)));
      const allProfiles: UserProfile[] = [];
      snap.forEach((d) => {
        if (!d.exists()) return;
        const raw = d.data();
        const p: UserProfile = { ...raw, semester: raw.semester ?? raw.year ?? 0 } as UserProfile;
        allProfiles.push(p);
      });

      const results = filterCandidates(allProfiles, me, filters, seenUids);
      setCandidates(results);
      setCurrentIndex(0);
      setLastSwiped(null);
    } catch (e: any) {
      Alert.alert("Error loading profiles", e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLike() {
    const target = candidates[currentIndex];
    if (!target) return;
    setLastSwiped(target);
    setCurrentIndex((i) => i + 1);
    await setDoc(doc(db, "likes", uid, "sent", target.uid), { timestamp: Date.now() });
    const theirLike = await getDoc(doc(db, "likes", target.uid, "sent", uid));
    if (theirLike.exists()) {
      const matchId = [uid, target.uid].sort().join("_");
      await setDoc(doc(db, "matches", matchId), { users: [uid, target.uid], createdAt: Date.now(), seenBy: [] });
      Alert.alert("It's a match!", `You and ${target.name || target.email.split("@")[0]} matched!`);
    }
  }

  async function handlePass() {
    const target = candidates[currentIndex];
    if (!target) return;
    setLastSwiped(target);
    setCurrentIndex((i) => i + 1);
    await setDoc(doc(db, "likes", uid, "sent", target.uid), { passed: true, timestamp: Date.now() });
  }

  async function handleUndo() {
    if (!lastSwiped) return;
    await deleteDoc(doc(db, "likes", uid, "sent", lastSwiped.uid));
    setCurrentIndex((i) => Math.max(0, i - 1));
    setLastSwiped(null);
  }

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={c.accent} /></View>;

  const current = candidates[currentIndex];
  const isEmpty = !current;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerBrand}>UniFriend</Text>
        {lastSwiped && (
          <TouchableOpacity style={styles.undoButton} onPress={handleUndo}>
            <Text style={styles.undoText}>↩ Undo</Text>
          </TouchableOpacity>
        )}
      </View>

      {isEmpty ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>No one around yet</Text>
          <Text style={styles.emptySubtitle}>
            {lastSwiped ? "Undo your last swipe or adjust your filters" : "Try adjusting your filters"}
          </Text>
        </View>
      ) : (
        <View style={styles.cardWrapper}>
          <ProfileCard profile={current} myInterests={myInterests} myVibes={myVibes} />
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.passButton} onPress={handlePass} activeOpacity={0.7}>
              <Text style={styles.passText}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.likeButton} onPress={handleLike} activeOpacity={0.7}>
              <Text style={styles.likeText}>♥</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
