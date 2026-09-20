import { Redirect } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ApiError } from "../src/lib/api";
import { useAuth } from "../src/lib/auth-context";
import { colors, radius } from "../src/lib/theme";

export default function LoginScreen() {
  const { user, isLoading, signIn } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isLoading && user) return <Redirect href="/(app)" />;

  async function handleSubmit() {
    setError(null);
    if (!identifier.trim() || !password) {
      setError("Enter your staff code or email and password.");
      return;
    }
    setSubmitting(true);
    try {
      await signIn(identifier.trim(), password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign in. Check your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.brandMark}>
          <Text style={styles.brandLetter}>P</Text>
        </View>
        <Text style={styles.title}>Propways Field</Text>
        <Text style={styles.subtitle}>Sign in with your staff code, email or phone.</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.field}>
          <Text style={styles.label}>Staff code, email or phone</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="EM-260020"
            placeholderTextColor={colors.muted}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            placeholderTextColor={colors.muted}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Sign in</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.navy950 },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 28 },
  brandMark: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.navy700,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  brandLetter: { color: colors.white, fontFamily: "Manrope_700Bold", fontSize: 24 },
  title: { color: colors.white, fontFamily: "Manrope_700Bold", fontSize: 26, marginBottom: 6 },
  subtitle: { color: colors.navy100, fontFamily: "Manrope_400Regular", fontSize: 14, marginBottom: 28 },
  field: { marginBottom: 16 },
  label: { color: colors.navy100, fontFamily: "Manrope_500Medium", fontSize: 13, marginBottom: 6 },
  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    color: colors.white,
    fontFamily: "Manrope_400Regular",
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  button: {
    backgroundColor: colors.navy700,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: colors.white, fontFamily: "Manrope_600SemiBold", fontSize: 15 },
  errorBox: {
    backgroundColor: "rgba(168,50,42,0.18)",
    borderRadius: radius.sm,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: "#f5b8b2", fontFamily: "Manrope_500Medium", fontSize: 13 },
});
