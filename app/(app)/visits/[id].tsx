import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ApiError, apiFetch } from "../../../src/lib/api";
import { colors, radius } from "../../../src/lib/theme";

type RelationshipManager = { id: string; name: string; phone: string };

type VisitDetail = {
  id: string;
  checkInAt: string;
  status: "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED";
  remarks: string | null;
  reviewNote: string | null;
  customer: { name: string; mobile: string; profileId: string; interestLevel: "HOT" | "WARM" | "COLD" | null };
  project: { name: string; city: string };
  relationshipManagers: RelationshipManager[];
  rm: RelationshipManager | null;
  customerOtpVerified: boolean;
  rmOtpVerified: boolean;
  photoUrl: string;
};

const STATUS_COLORS: Record<string, string> = {
  VERIFIED: colors.green,
  REJECTED: colors.red,
  PENDING_VERIFICATION: colors.amber,
};

export default function VisitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [visit, setVisit] = useState<VisitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [remarks, setRemarks] = useState("");

  const [customerCode, setCustomerCode] = useState("");
  const [customerChallengeId, setCustomerChallengeId] = useState<string | null>(null);
  const [customerDevCode, setCustomerDevCode] = useState<string | null>(null);

  const [rmCode, setRmCode] = useState("");
  const [rmChallengeId, setRmChallengeId] = useState<string | null>(null);
  const [rmDevCode, setRmDevCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await apiFetch<{ visit: VisitDetail }>(`/visits/${id}`);
      setVisit(result.visit);
      setRemarks(result.visit.remarks ?? "");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load this visit.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const editable = visit?.status === "PENDING_VERIFICATION";

  async function saveRemarks() {
    setBusy(true);
    setError(null);
    try {
      const result = await apiFetch<{ visit: VisitDetail }>(`/visits/${id}`, {
        method: "PATCH",
        body: { remarks },
      });
      setVisit((prev) => (prev ? { ...prev, remarks: result.visit.remarks } : prev));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save your changes.");
    } finally {
      setBusy(false);
    }
  }

  async function requestCustomerOtp() {
    if (!visit) return;
    setBusy(true);
    setError(null);
    try {
      const result = await apiFetch<{ challengeId: string; devCode?: string }>("/otp/request", {
        method: "POST",
        body: { mobile: visit.customer.mobile, purpose: "VISIT_CUSTOMER" },
      });
      setCustomerChallengeId(result.challengeId);
      setCustomerDevCode(result.devCode ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send the OTP.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmCustomerOtp() {
    if (!customerChallengeId) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/otp/verify", { method: "POST", body: { challengeId: customerChallengeId, code: customerCode } });
      await apiFetch(`/visits/${id}`, {
        method: "PATCH",
        body: { customerOtpChallengeId: customerChallengeId },
      });
      setCustomerChallengeId(null);
      setCustomerCode("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Incorrect code.");
    } finally {
      setBusy(false);
    }
  }

  async function selectRm(candidate: RelationshipManager) {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/visits/${id}`, { method: "PATCH", body: { rmId: candidate.id } });
      setRmChallengeId(null);
      setRmCode("");
      setRmDevCode(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not attach this relationship manager.");
    } finally {
      setBusy(false);
    }
  }

  async function requestRmOtp() {
    if (!visit?.rm) return;
    setBusy(true);
    setError(null);
    try {
      const result = await apiFetch<{ challengeId: string; devCode?: string }>("/otp/request", {
        method: "POST",
        body: { mobile: visit.rm.phone, purpose: "VISIT_RM" },
      });
      setRmChallengeId(result.challengeId);
      setRmDevCode(result.devCode ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send the OTP.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmRmOtp() {
    if (!rmChallengeId) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/otp/verify", { method: "POST", body: { challengeId: rmChallengeId, code: rmCode } });
      await apiFetch(`/visits/${id}`, { method: "PATCH", body: { rmOtpChallengeId: rmChallengeId } });
      setRmChallengeId(null);
      setRmCode("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Incorrect code.");
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete() {
    Alert.alert("Delete this visit?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: deleteVisit },
    ]);
  }

  async function deleteVisit() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/visits/${id}`, { method: "DELETE" });
      router.replace("/(app)");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete this visit.");
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.navy700} />
      </View>
    );
  }

  if (!visit) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error ?? "Visit not found."}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{visit.customer.name}</Text>
        <Text style={[styles.status, { color: STATUS_COLORS[visit.status] }]}>
          {visit.status.replace("_", " ")}
        </Text>
      </View>
      <Text style={styles.subtitle}>
        {visit.project.name} · {visit.project.city}
      </Text>
      <Text style={styles.timestamp}>{new Date(visit.checkInAt).toLocaleString()}</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {visit.reviewNote ? (
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>Reviewer note: {visit.reviewNote}</Text>
        </View>
      ) : null}

      <View style={styles.photoCard}>
        <Text style={styles.photoTitle}>Customer site photo</Text>
        <Image source={{ uri: visit.photoUrl }} style={styles.photo} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Customer OTP</Text>
        {visit.customerOtpVerified ? (
          <Text style={styles.verifiedText}>Verified</Text>
        ) : editable ? (
          customerChallengeId ? (
            <View>
              <Text style={styles.helpText}>
                A 6-digit code was sent to {visit.customer.mobile}.
                {customerDevCode ? ` (Dev code: ${customerDevCode})` : ""}
              </Text>
              <TextInput
                style={styles.input}
                value={customerCode}
                onChangeText={setCustomerCode}
                placeholder="6-digit code"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                maxLength={6}
              />
              <TouchableOpacity style={styles.button} onPress={confirmCustomerOtp} disabled={busy}>
                <Text style={styles.buttonText}>Verify code</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.button} onPress={requestCustomerOtp} disabled={busy}>
              <Text style={styles.buttonText}>Send OTP now</Text>
            </TouchableOpacity>
          )
        ) : (
          <Text style={styles.pendingText}>Not verified</Text>
        )}
      </View>

      {visit.rm ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Relationship manager — {visit.rm.name}</Text>
          {visit.rmOtpVerified ? (
            <Text style={styles.verifiedText}>Verified</Text>
          ) : editable ? (
            rmChallengeId ? (
              <View>
                <Text style={styles.helpText}>
                  A 6-digit code was sent to {visit.rm.phone}.
                  {rmDevCode ? ` (Dev code: ${rmDevCode})` : ""}
                </Text>
                <TextInput
                  style={styles.input}
                  value={rmCode}
                  onChangeText={setRmCode}
                  placeholder="6-digit code"
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <TouchableOpacity style={styles.button} onPress={confirmRmOtp} disabled={busy}>
                  <Text style={styles.buttonText}>Verify code</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.button} onPress={requestRmOtp} disabled={busy}>
                <Text style={styles.buttonText}>Send OTP now</Text>
              </TouchableOpacity>
            )
          ) : (
            <Text style={styles.pendingText}>Not verified</Text>
          )}
          {editable && !visit.rmOtpVerified && visit.relationshipManagers.length > 1 ? (
            <View style={styles.changeRmSection}>
              <Text style={styles.helpText}>Wrong RM selected? Choose the correct one below.</Text>
              {visit.relationshipManagers.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.rmRow, item.id === visit.rm?.id && styles.selectedRmRow]}
                  onPress={() => selectRm(item)}
                  disabled={busy || item.id === visit.rm?.id}
                >
                  <Text style={styles.rmName}>{item.name}{item.id === visit.rm?.id ? " (selected)" : ""}</Text>
                  <Text style={styles.helpText}>{item.phone}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
      ) : editable && visit.relationshipManagers.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Relationship manager</Text>
          <Text style={styles.helpText}>No RM was recorded at check-in. Add one now to verify their OTP.</Text>
          <FlatList
            data={visit.relationshipManagers}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.rmRow} onPress={() => selectRm(item)} disabled={busy}>
                <Text style={styles.rmName}>{item.name}</Text>
                <Text style={styles.helpText}>{item.phone}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Remarks</Text>
        {editable ? (
          <>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={remarks}
              onChangeText={setRemarks}
              placeholder="Add a remark"
              placeholderTextColor={colors.muted}
              multiline
            />
            <TouchableOpacity style={styles.button} onPress={saveRemarks} disabled={busy}>
              {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Save remarks</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.helpText}>{visit.remarks || "No remarks."}</Text>
        )}
      </View>

      {editable ? (
        <TouchableOpacity style={styles.deleteButton} onPress={confirmDelete} disabled={busy}>
          <Text style={styles.deleteButtonText}>Delete this visit</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 60, paddingBottom: 60 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: colors.ink, fontFamily: "Manrope_700Bold", fontSize: 20 },
  status: { fontFamily: "Manrope_600SemiBold", fontSize: 12 },
  subtitle: { color: colors.muted, fontFamily: "Manrope_400Regular", fontSize: 13, marginTop: 4 },
  timestamp: { color: colors.muted, fontFamily: "Manrope_400Regular", fontSize: 11, marginTop: 2, marginBottom: 16 },
  error: { color: colors.red, fontFamily: "Manrope_500Medium", fontSize: 13, marginBottom: 12 },
  noteBox: { backgroundColor: "rgba(168,50,42,0.08)", borderRadius: radius.sm, padding: 12, marginBottom: 16 },
  noteText: { color: colors.red, fontFamily: "Manrope_500Medium", fontSize: 13 },
  photo: { width: "100%", height: 220, borderRadius: radius.md, marginBottom: 16 },
  photoCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 14,
  },
  photoTitle: { color: colors.ink, fontFamily: "Manrope_600SemiBold", fontSize: 14, marginBottom: 10 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 14,
  },
  sectionTitle: { color: colors.ink, fontFamily: "Manrope_600SemiBold", fontSize: 14, marginBottom: 8 },
  rmRow: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line },
  selectedRmRow: { backgroundColor: colors.bg },
  changeRmSection: { marginTop: 14, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 },
  rmName: { color: colors.ink, fontFamily: "Manrope_500Medium", fontSize: 13 },
  verifiedText: { color: colors.green, fontFamily: "Manrope_600SemiBold", fontSize: 13 },
  pendingText: { color: colors.amber, fontFamily: "Manrope_600SemiBold", fontSize: 13 },
  helpText: { color: colors.muted, fontFamily: "Manrope_400Regular", fontSize: 12, marginBottom: 10 },
  input: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.ink,
    fontFamily: "Manrope_400Regular",
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  multiline: { minHeight: 70, textAlignVertical: "top" },
  button: { backgroundColor: colors.navy700, borderRadius: radius.md, paddingVertical: 12, alignItems: "center" },
  buttonText: { color: colors.white, fontFamily: "Manrope_600SemiBold", fontSize: 14 },
  deleteButton: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.red,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
  },
  deleteButtonText: { color: colors.red, fontFamily: "Manrope_600SemiBold", fontSize: 15 },
});
