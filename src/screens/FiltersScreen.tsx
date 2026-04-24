import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
} from "react-native";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { auth, db } from "../firebase/config";
import { Filters, RootStackParamList } from "../types";
import { useTheme } from "../hooks/useTheme";

const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];
const PROGRAM_OPTIONS: { value: Filters["programFilter"]; label: string }[] = [
  { value: "any", label: "Any programme" },
  { value: "sameProgram", label: "Same study programme" },
  { value: "sameLehrstuhl", label: "Same Lehrstuhl" },
];
const DEFAULT_FILTERS: Filters = { genders: [], interests: [], semesterRange: [1, 20], programFilter: "any" };

function TagInput({ tags, onAdd, onRemove, c }: { tags: string[]; onAdd: (tag: string) => void; onRemove: (tag: string) => void; c: any }) {
  const [input, setInput] = useState("");
  function submit() {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) onAdd(trimmed);
    setInput("");
  }
  return (
    <View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          style={{ flex: 1, borderWidth: 1, borderColor: c.inputBorder, borderRadius: 12, padding: 12, fontSize: 15, color: c.text, backgroundColor: c.inputBg }}
          placeholder="e.g. hiking, chess..."
          placeholderTextColor={c.placeholder}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={submit}
          returnKeyType="done"
        />
        <TouchableOpacity style={{ backgroundColor: c.accent, borderRadius: 12, paddingHorizontal: 16, justifyContent: "center" }} onPress={submit}>
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Add</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
        {tags.map((tag) => (
          <TouchableOpacity key={tag} style={{ backgroundColor: c.accentTagBg, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }} onPress={() => onRemove(tag)}>
            <Text style={{ color: c.accentTag, fontSize: 13, fontWeight: "500" }}>{tag} ×</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function FiltersScreen() {
  const c = useTheme();
  const uid = auth.currentUser!.uid;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [semMin, setSemMin] = useState("1");
  const [semMax, setSemMax] = useState("20");
  const [loading, setLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: c.card, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
    title: { fontSize: 24, fontWeight: "800", color: c.text, marginBottom: 6 },
    subtitle: { fontSize: 14, color: c.textMuted, marginBottom: 32 },
    section: { marginBottom: 28 },
    label: { fontSize: 14, fontWeight: "600", color: c.textSecondary, marginBottom: 12 },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { borderWidth: 1, borderColor: c.inputBorder, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
    chipSelected: { backgroundColor: c.accent, borderColor: c.accent },
    chipText: { fontSize: 14, color: c.textSecondary },
    chipTextSelected: { color: "#fff", fontWeight: "600" },
    rangeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    rangeInput: { borderWidth: 1, borderColor: c.inputBorder, borderRadius: 12, padding: 12, fontSize: 16, color: c.text, backgroundColor: c.inputBg, width: 70, textAlign: "center" },
    rangeSeparator: { fontSize: 15, color: c.textSecondary },
    button: { backgroundColor: c.accent, borderRadius: 12, padding: 16, alignItems: "center", marginTop: 10 },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  }), [c]);

  useEffect(() => {
    getDoc(doc(db, "filters", uid)).then((snap) => {
      if (snap.exists()) {
        setIsEdit(true);
        const data = snap.data();
        const loaded: Filters = {
          genders: data.genders ?? (data.gender && data.gender !== "Any" ? [data.gender] : []),
          interests: data.interests ?? [],
          semesterRange: data.semesterRange ?? [1, 20],
          programFilter: data.programFilter ?? "any",
        };
        setFilters(loaded);
        setSemMin(String(loaded.semesterRange[0]));
        setSemMax(String(loaded.semesterRange[1]));
      }
    });
  }, []);

  async function handleSave() {
    const min = parseInt(semMin) || 1;
    const max = parseInt(semMax) || 20;
    if (min > max) { Alert.alert("Semester range is invalid"); return; }
    const updated: Filters = { ...filters, semesterRange: [min, max] };
    setLoading(true);
    try {
      await setDoc(doc(db, "filters", uid), updated);
      if (isEdit) navigation.goBack();
    } catch (e: any) {
      Alert.alert("Error saving filters", e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Who are you looking for?</Text>
      {!isEdit && <Text style={styles.subtitle}>You can change this later in your profile</Text>}

      <View style={styles.section}>
        <Text style={styles.label}>Gender (leave empty for any)</Text>
        <View style={styles.chipRow}>
          {GENDERS.map((g) => {
            const selected = filters.genders.includes(g);
            return (
              <TouchableOpacity key={g} style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setFilters({ ...filters, genders: selected ? filters.genders.filter((x) => x !== g) : [...filters.genders, g] })}>
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{g}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Study programme</Text>
        <View style={styles.chipRow}>
          {PROGRAM_OPTIONS.map((opt) => (
            <TouchableOpacity key={opt.value} style={[styles.chip, filters.programFilter === opt.value && styles.chipSelected]}
              onPress={() => setFilters({ ...filters, programFilter: opt.value })}>
              <Text style={[styles.chipText, filters.programFilter === opt.value && styles.chipTextSelected]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Semester range</Text>
        <View style={styles.rangeRow}>
          <TextInput style={styles.rangeInput} keyboardType="number-pad" value={semMin} onChangeText={setSemMin} maxLength={2} placeholder="1" placeholderTextColor={c.placeholder} />
          <Text style={styles.rangeSeparator}>to</Text>
          <TextInput style={styles.rangeInput} keyboardType="number-pad" value={semMax} onChangeText={setSemMax} maxLength={2} placeholder="20" placeholderTextColor={c.placeholder} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Interests (leave empty for any)</Text>
        <TagInput c={c} tags={filters.interests}
          onAdd={(t) => setFilters({ ...filters, interests: [...filters.interests, t] })}
          onRemove={(t) => setFilters({ ...filters, interests: filters.interests.filter((i) => i !== t) })}
        />
      </View>

      <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSave} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Saving..." : isEdit ? "Save" : "Let's find friends →"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
