import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ApiError, apiFetch } from "../../../src/lib/api";
import { colors, radius } from "../../../src/lib/theme";

type Developer = { id: string; name: string };
type Employee = { id: string; name: string; phone: string };

export default function NewProjectScreen() {
  const router = useRouter();
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [developerId, setDeveloperId] = useState<string | null>(null);
  const [rmIds, setRmIds] = useState<string[]>([]);

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [description, setDescription] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiFetch<{ developers: Developer[] }>("/developers")
      .then((result) => setDevelopers(result.developers))
      .catch(() => undefined);
    apiFetch<{ employees: Employee[] }>("/employees")
      .then((result) => setEmployees(result.employees))
      .catch(() => undefined);
  }, []);

  function toggleRm(id: string) {
    setRmIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit() {
    setError(null);
    if (name.trim().length < 2 || city.trim().length < 2 || !developerId) {
      setError("Enter the project name, city and select a developer.");
      return;
    }
    setBusy(true);
    try {
      await apiFetch("/projects", {
        method: "POST",
        body: {
          name,
          city,
          developerId,
          address: address || undefined,
          minPrice: minPrice ? Number(minPrice) : undefined,
          maxPrice: maxPrice ? Number(maxPrice) : undefined,
          description: description || undefined,
          rmIds: rmIds.length ? rmIds : undefined,
        },
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit this project.");
    } finally {
      setBusy(false);
    }
  }

  if (success) {
    return (
      <View style={styles.centered}>
        <Text style={styles.successTitle}>Submitted for approval</Text>
        <Text style={styles.helpText}>
          A Super Admin will review this project before it goes live in the app.
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => router.replace("/(app)/projects")}>
          <Text style={styles.buttonText}>Back to projects</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Propose a new project</Text>
      <Text style={styles.helpText}>A Super Admin approves this before it becomes visible in the app.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.label}>Project name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Cedar Residences" placeholderTextColor={colors.muted} />

      <Text style={styles.label}>Developer</Text>
      <View style={styles.chipRow}>
        {developers.map((developer) => (
          <TouchableOpacity
            key={developer.id}
            style={[styles.chip, developerId === developer.id && styles.chipActive]}
            onPress={() => setDeveloperId(developer.id)}
          >
            <Text style={[styles.chipText, developerId === developer.id && styles.chipTextActive]}>
              {developer.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>City</Text>
      <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="Pune" placeholderTextColor={colors.muted} />

      <Text style={styles.label}>Address (optional)</Text>
      <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Street, locality" placeholderTextColor={colors.muted} />

      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.label}>Min price (₹)</Text>
          <TextInput style={styles.input} value={minPrice} onChangeText={setMinPrice} keyboardType="numeric" placeholderTextColor={colors.muted} />
        </View>
        <View style={styles.half}>
          <Text style={styles.label}>Max price (₹)</Text>
          <TextInput style={styles.input} value={maxPrice} onChangeText={setMaxPrice} keyboardType="numeric" placeholderTextColor={colors.muted} />
        </View>
      </View>

      <Text style={styles.label}>Description (optional)</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        placeholder="Amenities, unit types, possession date…"
        placeholderTextColor={colors.muted}
        multiline
      />

      <Text style={styles.label}>Relationship managers (optional)</Text>
      <View style={styles.chipRow}>
        {employees.map((employee) => (
          <TouchableOpacity
            key={employee.id}
            style={[styles.chip, rmIds.includes(employee.id) && styles.chipActive]}
            onPress={() => toggleRm(employee.id)}
          >
            <Text style={[styles.chipText, rmIds.includes(employee.id) && styles.chipTextActive]}>
              {employee.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={submit} disabled={busy}>
        {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Submit for approval</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 60, paddingBottom: 60 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, padding: 24 },
  title: { color: colors.ink, fontFamily: "Manrope_700Bold", fontSize: 20, marginBottom: 4 },
  successTitle: { color: colors.ink, fontFamily: "Manrope_700Bold", fontSize: 18, marginBottom: 8, textAlign: "center" },
  helpText: { color: colors.muted, fontFamily: "Manrope_400Regular", fontSize: 12, marginBottom: 16, textAlign: "center" },
  error: { color: colors.red, fontFamily: "Manrope_500Medium", fontSize: 13, marginBottom: 12 },
  label: { color: colors.ink, fontFamily: "Manrope_600SemiBold", fontSize: 13, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.ink,
    fontFamily: "Manrope_400Regular",
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  multiline: { minHeight: 90, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: colors.navy700, borderColor: colors.navy700 },
  chipText: { color: colors.ink, fontFamily: "Manrope_500Medium", fontSize: 12 },
  chipTextActive: { color: colors.white },
  button: { backgroundColor: colors.navy700, borderRadius: radius.md, paddingVertical: 14, alignItems: "center", marginTop: 22 },
  buttonText: { color: colors.white, fontFamily: "Manrope_600SemiBold", fontSize: 15 },
});
