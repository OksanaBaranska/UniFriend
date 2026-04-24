import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import { compressToBase64 } from "../firebase/imageUtils";
import { getUniversityName, getMajorsForUniversity } from "../firebase/universities";
import { UserProfile } from "../types";
import { VIBE_CATEGORIES, Vibes } from "../constants/vibes";
import { useTheme } from "../hooks/useTheme";

const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];

function TagInput({
  label,
  placeholder,
  tags,
  onAdd,
  onRemove,
}: {
  label: string;
  placeholder: string;
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
}) {
  const c = useTheme();
  const [input, setInput] = useState("");
  function submit() {
    const t = input.trim();
    if (t && !tags.includes(t)) onAdd(t);
    setInput("");
  }
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ fontSize: 14, fontWeight: "600", color: c.textSecondary, marginBottom: 8 }}>{label}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          style={{ flex: 1, borderWidth: 1, borderColor: c.inputBorder, borderRadius: 12, padding: 12, fontSize: 15, color: c.text, backgroundColor: c.inputBg }}
          placeholder={placeholder}
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

function MajorInput({ value, onChange, majors }: { value: string; onChange: (v: string) => void; majors: string[] }) {
  const c = useTheme();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const ALIASES: Record<string, string> = {
    winfo: "Wirtschaftsinformatik", wiwi: "Wirtschaftswissenschaften",
    bwl: "Betriebswirtschaftslehre (BWL)", vwl: "Volkswirtschaftslehre (VWL)",
    wingw: "Wirtschaftsingenieurwesen", wima: "Wirtschaftsmathematik",
    cs: "Computer Science", ml: "Artificial Intelligence",
    mech: "Mechanical Engineering", ee: "Electrical and Computer Engineering",
    ce: "Civil Engineering",
  };
  const aliasMatch = ALIASES[value.toLowerCase().trim()];
  const suggestions = value.length > 0
    ? majors.filter((m) => m.toLowerCase().includes(value.toLowerCase()) || (aliasMatch && m === aliasMatch)).slice(0, 6)
    : [];
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ fontSize: 14, fontWeight: "600", color: c.textSecondary, marginBottom: 8 }}>Major</Text>
      <TextInput
        style={{ borderWidth: 1, borderColor: c.inputBorder, borderRadius: 12, padding: 14, fontSize: 16, color: c.text, backgroundColor: c.inputBg }}
        placeholder="Start typing your major..."
        placeholderTextColor={c.placeholder}
        value={value}
        onChangeText={(t) => { onChange(t); setShowSuggestions(true); }}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        returnKeyType="done"
      />
      {showSuggestions && suggestions.length > 0 && (
        <View style={{ borderWidth: 1, borderColor: c.inputBorder, borderRadius: 12, marginTop: 4, backgroundColor: c.inputBg, overflow: "hidden" }}>
          {suggestions.map((s) => (
            <TouchableOpacity key={s} style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: c.border }} onPress={() => { onChange(s); setShowSuggestions(false); }}>
              <Text style={{ fontSize: 15, color: c.text }}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

function PhotoPromptPair({
  index,
  photoUri,
  prompt,
  onPickPhoto,
  onChangeQuestion,
  onChangeAnswer,
  usedQuestions,
}: {
  index: number;
  photoUri: string | null;
  prompt: { question: string; answer: string } | null;
  onPickPhoto: () => void;
  onChangeQuestion: (q: string) => void;
  onChangeAnswer: (a: string) => void;
  usedQuestions: string[];
}) {
  const c = useTheme();
  const isRequired = index === 0;
  const showPrompt = prompt !== null && photoUri !== null;

  return (
    <View style={{ marginBottom: 20, borderWidth: 1, borderColor: c.border, borderRadius: 16, overflow: "hidden", backgroundColor: c.cardAlt }}>
      <Text style={{ fontSize: 14, fontWeight: "600", color: c.textSecondary, padding: 14, paddingBottom: 10 }}>
        Photo {index + 1}
        <Text style={{ fontWeight: "400", color: c.textMuted }}>{isRequired ? "  required" : "  optional"}</Text>
      </Text>

      <TouchableOpacity style={{ marginHorizontal: 14, borderRadius: 12, overflow: "hidden", aspectRatio: 3 / 4, backgroundColor: c.accentLight }} onPress={onPickPhoto}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={{ width: "100%", height: "100%" }} />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: c.accent, borderStyle: "dashed", borderRadius: 12 }}>
            <Text style={{ fontSize: 28, marginBottom: 6 }}>{isRequired ? "📷" : "+"}</Text>
            {isRequired && <Text style={{ fontSize: 12, color: c.accent, fontWeight: "500" }}>Add photo</Text>}
          </View>
        )}
      </TouchableOpacity>

      {showPrompt && prompt && (
        <View style={{ padding: 14, paddingTop: 12 }}>
          <Text style={{ fontSize: 12, color: c.textMuted, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Photo description</Text>
          <TextInput
            style={{ borderWidth: 1, borderColor: c.inputBorder, borderRadius: 10, padding: 12, fontSize: 15, color: c.text, minHeight: 70, textAlignVertical: "top", backgroundColor: c.inputBg }}
            placeholder="Tell people what's in this photo..."
            placeholderTextColor={c.placeholder}
            value={prompt.answer}
            onChangeText={onChangeAnswer}
            maxLength={150}
            multiline
          />
          <Text style={{ fontSize: 12, color: c.textMuted, textAlign: "right", marginTop: 4 }}>{prompt.answer.length}/150</Text>
        </View>
      )}
    </View>
  );
}

export default function CreateProfileScreen() {
  const c = useTheme();
  const user = auth.currentUser!;
  const university = getUniversityName(user.email!);
  const majors = getMajorsForUniversity(university);

  const styles = useMemo(() => StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: c.card, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
    title: { fontSize: 26, fontWeight: "800", color: c.text, marginBottom: 4 },
    university: { fontSize: 14, color: c.accent, fontWeight: "600", marginBottom: 28 },
    fieldGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: "600", color: c.textSecondary, marginBottom: 8 },
    sublabel: { fontWeight: "400", color: c.textMuted },
    input: { borderWidth: 1, borderColor: c.inputBorder, borderRadius: 12, padding: 14, fontSize: 16, color: c.text, backgroundColor: c.inputBg },
    bioInput: { height: 100, textAlignVertical: "top" },
    charCount: { fontSize: 12, color: c.textMuted, textAlign: "right", marginTop: 4 },
    genderRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    genderChip: { borderWidth: 1, borderColor: c.inputBorder, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
    genderChipSelected: { backgroundColor: c.accent, borderColor: c.accent },
    genderChipText: { fontSize: 14, color: c.textSecondary },
    genderChipTextSelected: { color: "#fff", fontWeight: "600" },
    vibeQuestion: { fontSize: 14, color: c.textSecondary, marginBottom: 10, lineHeight: 20 },
    button: { backgroundColor: c.accent, borderRadius: 12, padding: 16, alignItems: "center", marginTop: 10 },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  }), [c]);

  const [photoUris, setPhotoUris] = useState<(string | null)[]>([null, null, null]);
  const [prompts, setPrompts] = useState<{ question: string; answer: string }[]>([
    { question: "", answer: "" },
    { question: "", answer: "" },
  ]);
  const [name, setName] = useState("");
  const [semester, setSemester] = useState("");
  const [major, setMajor] = useState("");
  const [gender, setGender] = useState("");
  const [status, setStatus] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [showTo, setShowTo] = useState<string[]>([]);
  const [vibes, setVibes] = useState<Vibes>({});
  const [loading, setLoading] = useState(false);

  async function pickPhoto(index: number) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission needed", "Allow access to your photo library."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.7,
    });
    if (!result.canceled) {
      const updated = [...photoUris];
      updated[index] = result.assets[0].uri;
      setPhotoUris(updated);
    }
  }

  function updatePromptQuestion(index: number, question: string) {
    const updated = [...prompts];
    updated[index] = { ...updated[index], question };
    setPrompts(updated);
  }

  function updatePromptAnswer(index: number, answer: string) {
    const updated = [...prompts];
    updated[index] = { ...updated[index], answer };
    setPrompts(updated);
  }

  async function handleSave() {
    if (!photoUris[0]) { Alert.alert("Photo required", "Please add your first photo."); return; }
    if (!name.trim()) { Alert.alert("Please enter your name"); return; }
    if (!semester || !major || !gender) { Alert.alert("Please fill in semester, major, and gender"); return; }
    const semNum = parseInt(semester);
    if (isNaN(semNum) || semNum < 1 || semNum > 20) { Alert.alert("Please enter a valid semester number"); return; }

    for (let i = 0; i <= 1; i++) {
      if (photoUris[i + 1] && !prompts[i].answer.trim()) {
        Alert.alert("Prompt required", `Please answer the prompt for photo ${i + 2}.`);
        return;
      }
    }

    setLoading(true);
    try {
      const photoUrls = await Promise.all(
        photoUris.filter(Boolean).map((uri) => compressToBase64(uri!))
      );
      const savedPrompts = [0, 1]
        .filter((i) => photoUris[i + 1] && prompts[i].answer.trim())
        .map((i) => ({ question: prompts[i].question, answer: prompts[i].answer.trim() }));

      const profile: UserProfile = {
        uid: user.uid,
        email: user.email!,
        name: name.trim(),
        university,
        semester: semNum,
        major: major.trim(),
        gender,
        status: status.trim(),
        vibes,
        interests,
        photos: photoUrls,
        prompts: savedPrompts,
        showTo,
        createdAt: Date.now(),
      };
      await setDoc(doc(db, "users", user.uid), profile);
    } catch (e: any) {
      Alert.alert("Error saving profile", e.message);
    } finally {
      setLoading(false);
    }
  }

  const usedQuestions = prompts.map((p) => p.question);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Set up your profile</Text>
        <Text style={styles.university}>{university}</Text>

        <PhotoPromptPair
          key={0}
          index={0}
          photoUri={photoUris[0]}
          prompt={null}
          onPickPhoto={() => pickPhoto(0)}
          onChangeQuestion={() => {}}
          onChangeAnswer={() => {}}
          usedQuestions={[]}
        />

        {[1, 2].map((i) => (
          <PhotoPromptPair
            key={i}
            index={i}
            photoUri={photoUris[i]}
            prompt={prompts[i - 1]}
            onPickPhoto={() => pickPhoto(i)}
            onChangeQuestion={(q) => updatePromptQuestion(i - 1, q)}
            onChangeAnswer={(a) => updatePromptAnswer(i - 1, a)}
            usedQuestions={usedQuestions.filter((_, j) => j !== i - 1)}
          />
        ))}

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Name</Text>
          <TextInput style={styles.input} placeholder="Your first name" placeholderTextColor={c.placeholder}
            value={name} onChangeText={setName} maxLength={40} />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Semester</Text>
          <TextInput style={styles.input} placeholder="e.g. 3" placeholderTextColor={c.placeholder}
            keyboardType="number-pad" value={semester} onChangeText={setSemester} maxLength={2} />
        </View>

        <MajorInput value={major} onChange={setMajor} majors={majors} />

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Gender</Text>
          <View style={styles.genderRow}>
            {GENDERS.map((g) => (
              <TouchableOpacity key={g}
                style={[styles.genderChip, gender === g && styles.genderChipSelected]}
                onPress={() => setGender(g)}>
                <Text style={[styles.genderChipText, gender === g && styles.genderChipTextSelected]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Status <Text style={styles.sublabel}>(optional)</Text></Text>
          <TextInput style={[styles.input, styles.bioInput]}
            placeholder={"I'm looking for someone to join me for...\nAnyone up for...\nCurrently obsessed with..."}
            placeholderTextColor={c.placeholder} multiline value={status} onChangeText={setStatus} maxLength={160} />
          <Text style={styles.charCount}>{status.length}/160</Text>
        </View>

        <TagInput label="Interests & activities" placeholder="e.g. hiking, chess, football"
          tags={interests}
          onAdd={(t) => setInterests([...interests, t])}
          onRemove={(t) => setInterests(interests.filter((i) => i !== t))}
        />

        {VIBE_CATEGORIES.map((cat) => (
          <View key={cat.key} style={styles.fieldGroup}>
            <Text style={styles.label}>{cat.label}</Text>
            <Text style={styles.vibeQuestion}>{cat.question}</Text>
            <View style={styles.genderRow}>
              {cat.options.map((opt) => {
                const selected = vibes[cat.key] === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.genderChip, selected && styles.genderChipSelected]}
                    onPress={() => setVibes({ ...vibes, [cat.key]: selected ? undefined : opt })}
                  >
                    <Text style={[styles.genderChipText, selected && styles.genderChipTextSelected]}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Show my profile to... <Text style={styles.sublabel}>(leave empty for everyone)</Text></Text>
          <View style={styles.genderRow}>
            {GENDERS.map((g) => {
              const selected = showTo.includes(g);
              return (
                <TouchableOpacity key={g}
                  style={[styles.genderChip, selected && styles.genderChipSelected]}
                  onPress={() => setShowTo(selected ? showTo.filter((x) => x !== g) : [...showTo, g])}>
                  <Text style={[styles.genderChipText, selected && styles.genderChipTextSelected]}>{g}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? "Saving..." : "Let's go"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
