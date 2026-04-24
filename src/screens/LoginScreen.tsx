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
} from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/config";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import { useTheme } from "../hooks/useTheme";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Login">;
};

export default function LoginScreen({ navigation }: Props) {
  const c = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 28,
    },
    title: { fontSize: 36, fontWeight: "800", color: c.accent, marginBottom: 6 },
    subtitle: { fontSize: 16, color: c.textSecondary, marginBottom: 40 },
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

  async function handleLogin() {
    if (!email || !password) { Alert.alert("Please fill in all fields"); return; }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    } catch (e: any) {
      Alert.alert("Login failed", e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Text style={styles.title}>UniFriend</Text>
      <Text style={styles.subtitle}>Find your people at uni</Text>
      <TextInput style={styles.input} placeholder="University email" placeholderTextColor={c.placeholder}
        keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Password" placeholderTextColor={c.placeholder}
        secureTextEntry value={password} onChangeText={setPassword} />
      <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleLogin} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Logging in..." : "Log in"}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
        <Text style={styles.link}>Don't have an account? Sign up</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}
