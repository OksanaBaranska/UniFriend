import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, useColorScheme,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { collection, deleteDoc, doc, getDocs, getDoc, updateDoc } from "firebase/firestore";
import { deleteUser, signOut } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { compressToBase64 } from "../firebase/imageUtils";
import { UserProfile, RootStackParamList } from "../types";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { VIBE_CATEGORIES, Vibes } from "../constants/vibes";
import { useTheme } from "../hooks/useTheme";

const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];
const VIBE_LABEL: Record<string, string> = {
  hangout: "Hangout vibe",
  lifeFeelsLike: "Life right now",
  showUpAs: "I show up as",
};

const CHIP_LIGHT = [
  { bg: "#EDFAF1", border: "#A7E3BB", text: "#15803D" },
  { bg: "#EEF4FF", border: "#BFCFFB", text: "#3B5FD9" },
  { bg: "#F3EFFE", border: "#C9B8F8", text: "#6D28D9" },
  { bg: "#FFF0F6", border: "#F9C0D8", text: "#BE185D" },
  { bg: "#FEFCE8", border: "#FDE047", text: "#854D0E" },
];
const CHIP_DARK = [
  { bg: "#052E10", border: "#166534", text: "#4ADE80" },
  { bg: "#0B1740", border: "#1E3A8A", text: "#93C5FD" },
  { bg: "#1A0B40", border: "#4C1D95", text: "#C4B5FD" },
  { bg: "#2D0A1A", border: "#831843", text: "#F9A8D4" },
  { bg: "#1C1300", border: "#713F12", text: "#FDE68A" },
];

function TagInput({ tags, onAdd, onRemove }: { tags: string[]; onAdd: (t: string) => void; onRemove: (t: string) => void }) {
  const c = useTheme();
  const [input, setInput] = useState("");
  function submit() {
    const t = input.trim();
    if (t && !tags.includes(t)) onAdd(t);
    setInput("");
  }
  return (
    <View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          style={{ flex: 1, borderWidth: 1, borderColor: c.inputBorder, borderRadius: 12, padding: 12, fontSize: 15, color: c.text, backgroundColor: c.inputBg }}
          placeholder="Add interest..." placeholderTextColor={c.placeholder}
          value={input} onChangeText={setInput} onSubmitEditing={submit} returnKeyType="done" />
        <TouchableOpacity style={{ backgroundColor: c.accent, borderRadius: 12, paddingHorizontal: 16, justifyContent: "center" }} onPress={submit}>
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Add</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
        {tags.map((tag) => (
          <TouchableOpacity key={tag} style={{ backgroundColor: c.accentLight, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }} onPress={() => onRemove(tag)}>
            <Text style={{ color: c.accentTag, fontSize: 13, fontWeight: "500" }}>{tag} ×</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const c = useTheme();
  const isDark = useColorScheme() === "dark";
  const chips = isDark ? CHIP_DARK : CHIP_LIGHT;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = auth.currentUser!;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [semester, setSemester] = useState("");
  const [major, setMajor] = useState("");
  const [gender, setGender] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [showTo, setShowTo] = useState<string[]>([]);
  const [vibes, setVibes] = useState<Vibes>({});
  const [newPhotoUris, setNewPhotoUris] = useState<(string | null)[]>([null, null, null]);
  const [descriptions, setDescriptions] = useState<string[]>(["", ""]);

  const s = useMemo(() => StyleSheet.create({
    screen:       { flex: 1, backgroundColor: c.background },
    centered:     { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.background },
    headerRow:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20 },
    headerBrand:  { fontSize: 22, fontWeight: "700", color: c.text, letterSpacing: -0.4 },
    headerAction: { fontSize: 16, fontWeight: "500", color: c.accent },
    card:         { marginHorizontal: 16, backgroundColor: c.card, borderRadius: 24, overflow: "hidden", shadowColor: "#0F0F0F", shadowOpacity: 0.07, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 4, marginBottom: 16 },
    sep:          { height: 1, backgroundColor: c.border, marginHorizontal: 16 },
    sectionLabel: { fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: c.textSecondary, fontWeight: "600", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
    identRow:     { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
    avatar:       { width: 92, height: 92, borderRadius: 20, backgroundColor: c.cardAlt, borderWidth: 1, borderColor: c.border, overflow: "hidden", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    identName:    { fontSize: 26, fontWeight: "800", color: c.text, letterSpacing: -0.5, lineHeight: 30 },
    identMeta:    { fontSize: 13, color: c.textSecondary, fontWeight: "500", marginTop: 3 },
    identEmail:   { fontSize: 12, color: c.textMuted, marginTop: 2 },
    statusText:   { fontSize: 15, fontWeight: "600", color: c.text, lineHeight: 22, paddingHorizontal: 16, paddingBottom: 14 },
    chipsWrap:    { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, paddingBottom: 16 },
    vibeBlock:    { paddingHorizontal: 16 },
    vibeRow:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: c.border },
    vibeKey:      { fontSize: 14, color: c.textSecondary, fontWeight: "500" },
    vibeVal:      { fontSize: 14, color: c.text, fontWeight: "700" },
    // Edit mode
    editBlock:    { padding: 16, gap: 14 },
    fieldLabel:   { fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: c.textSecondary, fontWeight: "600", marginBottom: 6 },
    input:        { borderWidth: 1, borderColor: c.inputBorder, borderRadius: 12, padding: 12, fontSize: 15, color: c.text, backgroundColor: c.inputBg },
    chipRow:      { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip:         { borderWidth: 1, borderColor: c.inputBorder, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
    chipSelected: { backgroundColor: c.accent, borderColor: c.accent },
    chipText:     { fontSize: 14, color: c.textSecondary },
    chipTextSel:  { color: "#fff", fontWeight: "600" },
    photoRow:     { flexDirection: "row", gap: 10 },
    photoSlot:    { flex: 1, aspectRatio: 3 / 4, borderRadius: 12, overflow: "hidden" },
    photoThumb:   { width: "100%", height: "100%" },
    photoEmpty:   { flex: 1, backgroundColor: c.cardAlt, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: c.accent, borderStyle: "dashed" },
    saveBtn:      { backgroundColor: c.accent, borderRadius: 12, padding: 16, alignItems: "center", margin: 16, marginTop: 4 },
    saveBtnText:  { color: "#fff", fontSize: 16, fontWeight: "700" },
    actionBtn:    { alignItems: "center", paddingVertical: 14, marginHorizontal: 16 },
    actionText:   { color: c.textSecondary, fontSize: 15 },
    dangerText:   { color: c.danger, fontSize: 15 },
    charCount:    { fontSize: 12, color: c.textMuted, textAlign: "right", marginTop: 4 },
  }), [c]);

  useEffect(() => {
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        setProfile(data);
        resetFields(data);
      }
      setLoading(false);
    });
  }, []);

  function resetFields(p: UserProfile) {
    setName(p.name ?? "");
    setStatus(p.status ?? (p as any).bio ?? "");
    setSemester(String(p.semester));
    setMajor(p.major);
    setGender(p.gender);
    setInterests(p.interests ?? []);
    setShowTo(p.showTo ?? []);
    setVibes(p.vibes ?? {});
    setNewPhotoUris([null, null, null]);
    setDescriptions([p.prompts?.[0]?.answer ?? "", p.prompts?.[1]?.answer ?? ""]);
  }

  async function pickPhoto(index: number) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission needed"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [3, 4], quality: 0.7 });
    if (!result.canceled) {
      const updated = [...newPhotoUris];
      updated[index] = result.assets[0].uri;
      setNewPhotoUris(updated);
    }
  }

  async function handleSave() {
    const semNum = parseInt(semester);
    if (isNaN(semNum) || semNum < 1 || semNum > 20) { Alert.alert("Please enter a valid semester number"); return; }
    setSaving(true);
    try {
      const existingPhotos = profile!.photos ?? [];
      const photos: string[] = [];
      for (let i = 0; i < 3; i++) {
        if (newPhotoUris[i]) photos.push(await compressToBase64(newPhotoUris[i]!));
        else if (existingPhotos[i]) photos.push(existingPhotos[i]);
        else break;
      }
      const savedPrompts = [0, 1]
        .filter((i) => photos[i + 1] && descriptions[i]?.trim())
        .map((i) => ({ question: "", answer: descriptions[i].trim() }));
      const updates = { name: name.trim(), status: status.trim(), semester: semNum, major: major.trim(), gender, interests, prompts: savedPrompts, showTo, vibes, photos };
      await updateDoc(doc(db, "users", user.uid), updates);
      setProfile({ ...profile!, ...updates });
      setEditing(false);
    } catch (e: any) {
      Alert.alert("Error saving", e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    Alert.alert("Log out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => signOut(auth) },
    ]);
  }

  async function handleDeleteProfile() {
    Alert.alert("Delete account", "This will permanently delete your profile. This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          const uid = user.uid;
          await deleteDoc(doc(db, "users", uid));
          await deleteDoc(doc(db, "filters", uid));
          const sentSnap = await getDocs(collection(db, "likes", uid, "sent"));
          await Promise.all(sentSnap.docs.map((d) => deleteDoc(d.ref)));
          await deleteUser(user);
        } catch (e: any) { Alert.alert("Error", e.message); }
      }},
    ]);
  }

  if (loading) return <View style={s.centered}><ActivityIndicator size="large" color={c.accent} /></View>;
  if (!profile) return null;

  const existingPhotos = profile.photos ?? [];
  const displayUris = [0, 1, 2].map((i) => newPhotoUris[i] ?? existingPhotos[i] ?? null);

  // ── VIEW MODE ─────────────────────────────────────────────────────────────
  if (!editing) {
    const vibeRows = VIBE_CATEGORIES
      .filter((cat) => profile.vibes?.[cat.key])
      .map((cat) => ({ label: VIBE_LABEL[cat.key] ?? cat.label, value: profile.vibes![cat.key]! }));

    return (
      <View style={s.screen}>
        <View style={s.headerRow}>
          <Text style={s.headerBrand}>My Profile</Text>
          <TouchableOpacity onPress={() => setEditing(true)}>
            <Text style={s.headerAction}>Edit</Text>
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

          {/* ── Main info card ── */}
          <View style={s.card}>
            {/* Identity */}
            <View style={s.identRow}>
              <View style={s.avatar}>
                {existingPhotos[0]
                  ? <Image source={{ uri: existingPhotos[0] }} style={{ width: 92, height: 92 }} />
                  : <Text style={{ fontSize: 36 }}>👤</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.identName}>{profile.name || "—"}</Text>
                <Text style={s.identMeta}>{profile.major} · Sem {profile.semester}</Text>
                <Text style={s.identEmail}>{profile.university} · {profile.email}</Text>
              </View>
            </View>

            <View style={s.sep} />

            {/* Status */}
            {!!(profile.status ?? (profile as any).bio) && (
              <>
                <Text style={s.sectionLabel}>Status</Text>
                <Text style={s.statusText}>{profile.status ?? (profile as any).bio}</Text>
                <View style={s.sep} />
              </>
            )}

            {/* Interests */}
            {(profile.interests ?? []).length > 0 && (
              <>
                <Text style={s.sectionLabel}>Interests & activities</Text>
                <View style={s.chipsWrap}>
                  {profile.interests.map((tag, i) => {
                    const f = chips[i % chips.length];
                    return (
                      <View key={tag} style={{ paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999, backgroundColor: f.bg, borderWidth: 1, borderColor: f.border }}>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: f.text }}>{tag}</Text>
                      </View>
                    );
                  })}
                </View>
                <View style={s.sep} />
              </>
            )}

            {/* Vibe + meta rows */}
            <View style={s.vibeBlock}>
              {vibeRows.map((row, i) => (
                <View key={row.label} style={s.vibeRow}>
                  <Text style={s.vibeKey}>{row.label}</Text>
                  <Text style={s.vibeVal}>{row.value}</Text>
                </View>
              ))}
              <View style={s.vibeRow}>
                <Text style={s.vibeKey}>Gender</Text>
                <Text style={s.vibeVal}>{profile.gender || "—"}</Text>
              </View>
              <View style={[s.vibeRow, { borderBottomWidth: 0, paddingBottom: 14 }]}>
                <Text style={s.vibeKey}>Show my profile to</Text>
                <Text style={s.vibeVal}>{(profile.showTo ?? []).length > 0 ? profile.showTo.join(", ") : "Everyone"}</Text>
              </View>
            </View>
          </View>

          {/* ── Photos card ── */}
          {existingPhotos.length > 0 && (
            <View style={[s.card, { padding: 16 }]}>
              <Text style={[s.sectionLabel, { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 12 }]}>Photos</Text>
              <View style={s.photoRow}>
                {existingPhotos.map((uri, i) => (
                  <View key={i} style={s.photoSlot}>
                    <Image source={{ uri }} style={s.photoThumb} />
                  </View>
                ))}
              </View>
              {(profile.prompts ?? []).length > 0 && (
                <View style={{ marginTop: 14, gap: 10 }}>
                  {profile.prompts!.map((p, i) => p.answer ? (
                    <Text key={i} style={{ fontSize: 13, fontStyle: "italic", color: c.textSecondary, lineHeight: 18 }}>
                      {`Photo ${i + 2}: `}<Text style={{ color: c.text }}>{p.answer}</Text>
                    </Text>
                  ) : null)}
                </View>
              )}
            </View>
          )}

          {/* ── Action buttons ── */}
          <TouchableOpacity style={s.actionBtn} onPress={() => navigation.navigate("EditFilters")}>
            <Text style={s.actionText}>Change filters</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={handleLogout}>
            <Text style={s.actionText}>Log out</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={handleDeleteProfile}>
            <Text style={s.dangerText}>Delete account</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── EDIT MODE ─────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.headerRow}>
        <Text style={s.headerBrand}>Edit Profile</Text>
        <TouchableOpacity onPress={() => { if (profile) resetFields(profile); setEditing(false); }}>
          <Text style={[s.headerAction, { color: c.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 48 }}>
        <View style={s.card}>
          <View style={s.editBlock}>

            <View>
              <Text style={s.fieldLabel}>Name</Text>
              <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Your first name" placeholderTextColor={c.placeholder} maxLength={40} />
            </View>

            <View>
              <Text style={s.fieldLabel}>Status</Text>
              <TextInput style={[s.input, { height: 80, textAlignVertical: "top" }]} value={status} onChangeText={setStatus} multiline maxLength={160}
                placeholder={"I'm looking for someone to..."} placeholderTextColor={c.placeholder} />
              <Text style={s.charCount}>{status.length}/160</Text>
            </View>

            <View>
              <Text style={s.fieldLabel}>Semester</Text>
              <TextInput style={s.input} value={semester} onChangeText={setSemester} keyboardType="number-pad" maxLength={2} />
            </View>

            <View>
              <Text style={s.fieldLabel}>Major</Text>
              <TextInput style={s.input} value={major} onChangeText={setMajor} placeholder="Major" placeholderTextColor={c.placeholder} />
            </View>

            <View>
              <Text style={s.fieldLabel}>Gender</Text>
              <View style={s.chipRow}>
                {GENDERS.map((g) => (
                  <TouchableOpacity key={g} style={[s.chip, gender === g && s.chipSelected]} onPress={() => setGender(g)}>
                    <Text style={[s.chipText, gender === g && s.chipTextSel]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View>
              <Text style={s.fieldLabel}>Interests & activities</Text>
              <TagInput tags={interests} onAdd={(t) => setInterests([...interests, t])} onRemove={(t) => setInterests(interests.filter((i) => i !== t))} />
            </View>

            {VIBE_CATEGORIES.map((cat) => (
              <View key={cat.key}>
                <Text style={s.fieldLabel}>{cat.label}</Text>
                <View style={s.chipRow}>
                  {cat.options.map((opt) => {
                    const sel = vibes[cat.key] === opt;
                    return (
                      <TouchableOpacity key={opt} style={[s.chip, sel && s.chipSelected]}
                        onPress={() => setVibes({ ...vibes, [cat.key]: sel ? undefined : opt })}>
                        <Text style={[s.chipText, sel && s.chipTextSel]}>{opt}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}

            <View>
              <Text style={s.fieldLabel}>Show my profile to <Text style={{ fontWeight: "400", color: c.textMuted }}>(empty = everyone)</Text></Text>
              <View style={s.chipRow}>
                {GENDERS.map((g) => {
                  const sel = showTo.includes(g);
                  return (
                    <TouchableOpacity key={g} style={[s.chip, sel && s.chipSelected]}
                      onPress={() => setShowTo(sel ? showTo.filter((x) => x !== g) : [...showTo, g])}>
                      <Text style={[s.chipText, sel && s.chipTextSel]}>{g}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View>
              <Text style={s.fieldLabel}>Photos <Text style={{ fontWeight: "400", color: c.textMuted }}>(tap to change)</Text></Text>
              <View style={s.photoRow}>
                {[0, 1, 2].map((i) => (
                  <TouchableOpacity key={i} style={s.photoSlot} onPress={() => pickPhoto(i)}>
                    {displayUris[i]
                      ? <Image source={{ uri: displayUris[i]! }} style={s.photoThumb} />
                      : <View style={s.photoEmpty}><Text style={{ fontSize: 22 }}>{i === 0 ? "📷" : "+"}</Text></View>}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {[0, 1].map((i) => {
              const hasPhoto = !!displayUris[i + 1];
              if (!hasPhoto) return null;
              return (
                <View key={i}>
                  <Text style={s.fieldLabel}>Photo {i + 2} description</Text>
                  <TextInput
                    style={[s.input, { height: 70, textAlignVertical: "top" }]}
                    placeholder="Tell people what's in this photo..."
                    placeholderTextColor={c.placeholder}
                    value={descriptions[i]}
                    onChangeText={(t) => { const d = [...descriptions]; d[i] = t; setDescriptions(d); }}
                    maxLength={150} multiline
                  />
                </View>
              );
            })}
          </View>
        </View>

        <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          <Text style={s.saveBtnText}>{saving ? "Saving..." : "Save changes"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.actionBtn} onPress={() => navigation.navigate("EditFilters")}>
          <Text style={s.actionText}>Change filters</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.actionBtn} onPress={handleLogout}>
          <Text style={s.actionText}>Log out</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.actionBtn} onPress={handleDeleteProfile}>
          <Text style={s.dangerText}>Delete account</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
