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
  ScrollView,
} from "react-native";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { auth } from "../firebase/config";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import { useTheme } from "../hooks/useTheme";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "SignUp">;
};

function isUniEmail(email: string): boolean {
  const blocked = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com"];
  const domain = email.split("@")[1];
  if (!domain) return false;
  return !blocked.includes(domain.toLowerCase());
}

export default function SignUpScreen({ navigation }: Props) {
  const c = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flexGrow: 1,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 28,
      paddingVertical: 40,
    },
    title: { fontSize: 30, fontWeight: "800", color: c.accent, marginBottom: 6 },
    subtitle: { fontSize: 15, color: c.textSecondary, marginBottom: 36, textAlign: "center" },
    input: {
      width: "100%",
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      marginBottom: 14,
      color: c.text,
      backgroundColor: c.inputBg,
    },
    button: {
      width: "100%",
      backgroundColor: c.accent,
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
      marginTop: 6,
      marginBottom: 20,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    link: { color: c.accent, fontSize: 14 },
  }), [c]);

  async function handleSignUp() {
    if (!email || !password || !confirm) { Alert.alert("Please fill in all fields"); return; }
    if (!isUniEmail(email.trim())) { Alert.alert("Please use your university email address"); return; }
    if (password !== confirm) { Alert.alert("Passwords do not match"); return; }
    if (password.length < 6) { Alert.alert("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      await sendEmailVerification(user);
      Alert.alert("Verify your email",
        "We sent a verification link to your university email. Check your inbox then come back to log in.",
        [{ text: "OK", onPress: () => navigation.navigate("Login") }]
      );
    } catch (e: any) {
      Alert.alert("Sign up failed", e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.card }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Use your university email to join</Text>
        <TextInput style={styles.input} placeholder="University email" placeholderTextColor={c.placeholder}
          keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Password" placeholderTextColor={c.placeholder}
          secureTextEntry value={password} onChangeText={setPassword} />
        <TextInput style={styles.input} placeholder="Confirm password" placeholderTextColor={c.placeholder}
          secureTextEntry value={confirm} onChangeText={setConfirm} />
        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSignUp} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? "Creating account..." : "Sign up"}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate("Login")}>
          <Text style={styles.link}>Already have an account? Log in</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
