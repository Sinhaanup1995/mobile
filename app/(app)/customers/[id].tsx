import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
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

type Customer = {
  id: string;
  profileId: string;
  name: string;
  mobile: string;
  email: string | null;
  altMobile: string | null;
  dateOfBirth: string | null;
  anniversary: string | null;
  panNumber: string | null;
  aadhaarLast4: string | null;
  address: string | null;
  city: string | null;
  occupation: string | null;
  budgetMin: string | number | null;
  budgetMax: string | number | null;
  preferredCity: string | null;
  requirementNote: string | null;
  isLocked: boolean;
  status: "OPEN" | "CLOSED";
  closedProjectId: string | null;
  interestLevel: "HOT" | "WARM" | "COLD" | null;
};

type FormState = {
  name: string;
  email: string;
  altMobile: string;
  dateOfBirth: string;
  anniversary: string;
  panNumber: string;
  aadhaarLast4: string;
  address: string;
  city: string;
  occupation: string;
  budgetMin: string;
  budgetMax: string;
  preferredCity: string;
  requirementNote: string;
  status: "OPEN" | "CLOSED";
  closedProjectId: string;
  dealValue: string;
  discountPercentage: string;
};

type Project = { id: string; name: string; city: string };

const INTEREST_OPTIONS: { value: Exclude<Customer["interestLevel"], null>; label: string; color: string }[] = [
  { value: "HOT", label: "Hot", color: colors.red },
  { value: "WARM", label: "Warm", color: colors.amber },
  { value: "COLD", label: "Cold", color: colors.blue },
];

function emptyForm(): FormState {
  return {
    name: "",
    email: "",
    altMobile: "",
    dateOfBirth: "",
    anniversary: "",
    panNumber: "",
    aadhaarLast4: "",
    address: "",
    city: "",
    occupation: "",
    budgetMin: "",
    budgetMax: "",
    preferredCity: "",
    requirementNote: "",
    status: "OPEN",
    closedProjectId: "",
    dealValue: "",
    discountPercentage: "0",
  };
}

function formFromCustomer(customer: Customer): FormState {
  return {
    name: customer.name,
    email: customer.email ?? "",
    altMobile: customer.altMobile ?? "",
    dateOfBirth: customer.dateOfBirth?.slice(0, 10) ?? "",
    anniversary: customer.anniversary?.slice(0, 10) ?? "",
    panNumber: customer.panNumber ?? "",
    aadhaarLast4: customer.aadhaarLast4 ?? "",
    address: customer.address ?? "",
    city: customer.city ?? "",
    occupation: customer.occupation ?? "",
    budgetMin: customer.budgetMin?.toString() ?? "",
    budgetMax: customer.budgetMax?.toString() ?? "",
    preferredCity: customer.preferredCity ?? "",
    requirementNote: customer.requirementNote ?? "",
    status: customer.status,
    closedProjectId: customer.closedProjectId ?? "",
    dealValue: "",
    discountPercentage: "0",
  };
}

function maskMobile(mobile: string) {
  return mobile.length > 4 ? `${"*".repeat(mobile.length - 4)}${mobile.slice(-4)}` : mobile;
}

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await apiFetch<{ customer: Customer }>(`/customers/${id}`);
      setCustomer(result.customer);
      setForm(formFromCustomer(result.customer));
      const projectResult = await apiFetch<{ projects: Project[] }>(`/projects?customerId=${encodeURIComponent(id)}`);
      setProjects(projectResult.projects);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load this customer.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function updateField(field: keyof FormState, value: string) {
    setSaved(false);
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function save() {
    if (!customer || customer.isLocked) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const result = await apiFetch<{ customer: Customer }>(`/customers/${customer.id}`, {
        method: "PATCH",
        body: {
          ...form,
          email: form.email || null,
          altMobile: form.altMobile || null,
          dateOfBirth: form.dateOfBirth ? `${form.dateOfBirth}T00:00:00.000Z` : null,
          anniversary: form.anniversary ? `${form.anniversary}T00:00:00.000Z` : null,
          panNumber: form.panNumber || null,
          aadhaarLast4: form.aadhaarLast4 || null,
          address: form.address || null,
          city: form.city || null,
          occupation: form.occupation || null,
          budgetMin: form.budgetMin ? Number(form.budgetMin.replace(/,/g, "")) : null,
          budgetMax: form.budgetMax ? Number(form.budgetMax.replace(/,/g, "")) : null,
          preferredCity: form.preferredCity || null,
          requirementNote: form.requirementNote || null,
          status: form.status,
          closedProjectId: form.status === "CLOSED" ? form.closedProjectId : null,
          dealValue: form.status === "CLOSED" ? Number(form.dealValue.replace(/,/g, "")) : null,
          discountPercentage: form.status === "CLOSED" ? Number(form.discountPercentage) : 0,
        },
      });
      setCustomer(result.customer);
      setForm(formFromCustomer(result.customer));
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this customer.");
    } finally {
      setSaving(false);
    }
  }

  async function setInterest(level: Exclude<Customer["interestLevel"], null>) {
    const currentCustomer = customer;
    if (!currentCustomer || currentCustomer.isLocked) return;
    const next = currentCustomer.interestLevel === level ? null : level;
    setError(null);
    try {
      const result = await apiFetch<{ customer: Customer }>(`/customers/${currentCustomer.id}`, {
        method: "PATCH",
        body: { interestLevel: next },
      });
      setCustomer(result.customer);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update the lead temperature.");
    }
  }

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={colors.navy700} /></View>;
  }

  if (!customer) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error ?? "Customer not found."}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>‹ Customers</Text>
      </TouchableOpacity>
      <Text style={styles.eyebrow}>{customer.profileId}</Text>
      <View style={styles.titleRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{customer.name}</Text>
          <Text style={styles.subtitle}>Customer number: {maskMobile(customer.mobile)}</Text>
        </View>
        {customer.interestLevel ? <Text style={styles.temperature}>{customer.interestLevel} lead</Text> : null}
      </View>
      {customer.isLocked ? <Text style={styles.locked}>This profile is locked after onboarding.</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {saved ? <Text style={styles.success}>Customer details saved.</Text> : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Customer outcome</Text>
        <Text style={styles.helpText}>Closing a customer creates a deal for dashboard approval.</Text>
        <View style={styles.choiceRow}>
          {(["OPEN", "CLOSED"] as const).map((status) => (
            <TouchableOpacity key={status} style={[styles.choice, form.status === status && styles.choiceActive]} onPress={() => updateField("status", status)} disabled={customer.isLocked}>
              <Text style={[styles.choiceText, form.status === status && styles.choiceTextActive]}>{status === "OPEN" ? "Open" : "Closed"}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {form.status === "CLOSED" ? (
          <>
            <Text style={styles.label}>Select project</Text>
            {projects.map((project) => (
              <TouchableOpacity key={project.id} style={[styles.projectRow, form.closedProjectId === project.id && styles.selectedProject]} onPress={() => updateField("closedProjectId", project.id)} disabled={customer.isLocked}>
                <Text style={styles.projectName}>{project.name}</Text>
                <Text style={styles.helpText}>{project.city}</Text>
              </TouchableOpacity>
            ))}
            <Field label="Deal value" value={form.dealValue} onChangeText={(value) => updateField("dealValue", value)} keyboardType="numeric" disabled={customer.isLocked} />
            <Field label="Discount percentage" value={form.discountPercentage} onChangeText={(value) => updateField("discountPercentage", value)} keyboardType="numeric" disabled={customer.isLocked} />
          </>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Lead temperature</Text>
        <Text style={styles.helpText}>Set the customer&apos;s current purchase interest.</Text>
        <View style={styles.interestRow}>
          {INTEREST_OPTIONS.map((option) => {
            const active = customer.interestLevel === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.interestChip, { borderColor: option.color }, active && { backgroundColor: option.color }]}
                onPress={() => setInterest(option.value)}
                disabled={customer.isLocked}
              >
                <Text style={[styles.interestChipText, { color: active ? colors.white : option.color }]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Customer details</Text>
        <Field label="Full name" value={form.name} onChangeText={(value) => updateField("name", value)} disabled={customer.isLocked} />
        <Field label="Email" value={form.email} onChangeText={(value) => updateField("email", value)} keyboardType="email-address" disabled={customer.isLocked} />
        <Field label="Alternate mobile" value={form.altMobile} onChangeText={(value) => updateField("altMobile", value)} keyboardType="phone-pad" maxLength={10} disabled={customer.isLocked} />
        <Field label="City" value={form.city} onChangeText={(value) => updateField("city", value)} disabled={customer.isLocked} />
        <Field label="Address" value={form.address} onChangeText={(value) => updateField("address", value)} multiline disabled={customer.isLocked} />
        <Field label="Occupation" value={form.occupation} onChangeText={(value) => updateField("occupation", value)} disabled={customer.isLocked} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Additional details</Text>
        <Field label="Date of birth (YYYY-MM-DD)" value={form.dateOfBirth} onChangeText={(value) => updateField("dateOfBirth", value)} disabled={customer.isLocked} />
        <Field label="Anniversary (YYYY-MM-DD)" value={form.anniversary} onChangeText={(value) => updateField("anniversary", value)} disabled={customer.isLocked} />
        <Field label="PAN" value={form.panNumber} onChangeText={(value) => updateField("panNumber", value)} autoCapitalize="characters" disabled={customer.isLocked} />
        <Field label="Aadhaar last 4 digits" value={form.aadhaarLast4} onChangeText={(value) => updateField("aadhaarLast4", value)} keyboardType="number-pad" maxLength={4} disabled={customer.isLocked} />
        <Field label="Budget minimum" value={form.budgetMin} onChangeText={(value) => updateField("budgetMin", value)} keyboardType="numeric" disabled={customer.isLocked} />
        <Field label="Budget maximum" value={form.budgetMax} onChangeText={(value) => updateField("budgetMax", value)} keyboardType="numeric" disabled={customer.isLocked} />
        <Field label="Preferred city" value={form.preferredCity} onChangeText={(value) => updateField("preferredCity", value)} disabled={customer.isLocked} />
        <Field label="Requirement" value={form.requirementNote} onChangeText={(value) => updateField("requirementNote", value)} multiline disabled={customer.isLocked} />
      </View>

      {!customer.isLocked ? (
        <TouchableOpacity style={styles.button} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Save customer details</Text>}
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

function Field({ label, multiline, ...props }: { label: string; multiline?: boolean; value: string; onChangeText: (value: string) => void; [key: string]: unknown }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...props} multiline={multiline} style={[styles.input, multiline && styles.multiline]} placeholderTextColor={colors.muted} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 58, paddingBottom: 50 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, padding: 20 },
  back: { marginBottom: 18 },
  backText: { color: colors.navy700, fontFamily: "Manrope_600SemiBold", fontSize: 14 },
  eyebrow: { color: colors.muted, fontFamily: "Manrope_600SemiBold", fontSize: 11, letterSpacing: 1 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginTop: 6, marginBottom: 4 },
  titleBlock: { flex: 1 },
  title: { color: colors.ink, fontFamily: "Manrope_700Bold", fontSize: 22 },
  subtitle: { color: colors.muted, fontFamily: "Manrope_400Regular", fontSize: 12, marginTop: 4 },
  temperature: { color: colors.red, fontFamily: "Manrope_700Bold", fontSize: 12, marginTop: 6 },
  locked: { color: colors.amber, fontFamily: "Manrope_500Medium", fontSize: 12, marginBottom: 12 },
  error: { color: colors.red, fontFamily: "Manrope_500Medium", fontSize: 13, marginBottom: 12 },
  success: { color: colors.green, fontFamily: "Manrope_600SemiBold", fontSize: 13, marginBottom: 12 },
  card: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 14, marginTop: 14 },
  sectionTitle: { color: colors.ink, fontFamily: "Manrope_700Bold", fontSize: 15, marginBottom: 12 },
  helpText: { color: colors.muted, fontFamily: "Manrope_400Regular", fontSize: 12, marginBottom: 10 },
  choiceRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  choice: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingVertical: 11, alignItems: "center" },
  choiceActive: { backgroundColor: colors.navy700, borderColor: colors.navy700 },
  choiceText: { color: colors.muted, fontFamily: "Manrope_600SemiBold", fontSize: 13 },
  choiceTextActive: { color: colors.white },
  projectRow: { borderTopWidth: 1, borderTopColor: colors.line, paddingVertical: 10 },
  selectedProject: { backgroundColor: colors.bg, paddingHorizontal: 8 },
  projectName: { color: colors.ink, fontFamily: "Manrope_600SemiBold", fontSize: 13 },
  interestRow: { flexDirection: "row", gap: 8 },
  interestChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  interestChipText: { fontFamily: "Manrope_600SemiBold", fontSize: 11 },
  field: { marginBottom: 12 },
  label: { color: colors.muted, fontFamily: "Manrope_500Medium", fontSize: 12, marginBottom: 5 },
  input: { backgroundColor: colors.bg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, color: colors.ink, fontFamily: "Manrope_400Regular", fontSize: 14, paddingHorizontal: 12, paddingVertical: 11 },
  multiline: { minHeight: 76, textAlignVertical: "top" },
  button: { backgroundColor: colors.navy700, borderRadius: radius.md, paddingVertical: 14, alignItems: "center", marginTop: 18 },
  buttonText: { color: colors.white, fontFamily: "Manrope_600SemiBold", fontSize: 14 },
});
