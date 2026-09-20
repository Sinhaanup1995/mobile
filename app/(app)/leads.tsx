import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { ApiError, apiFetch } from "../../src/lib/api";
import { colors, radius } from "../../src/lib/theme";

type Lead = {
  id: string;
  name: string | null;
  maskedPhone: string;
  city: string | null;
  source: string | null;
  status: string;
  note: string | null;
};

export default function LeadsScreen() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [active, setActive] = useState<Lead | null>(null);
  const [outcome, setOutcome] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await apiFetch<{ leads: Lead[] }>("/leads");
      setLeads(result.leads);
    } catch {
      // Keep the previous list.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function logCall() {
    if (!active) return;
    if (!outcome.trim() || !remarks.trim()) {
      setError("Enter the outcome and a short note.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/leads/${active.id}/call`, { method: "POST", body: { outcome, remarks } });
      setActive(null);
      setOutcome("");
      setRemarks("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the call.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Your leads</Text>
      <FlatList
        data={leads}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>No leads assigned to you yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.name ?? "Unnamed lead"}</Text>
            <Text style={styles.cardSubtitle}>
              {item.maskedPhone} · {item.city ?? "—"}
            </Text>
            <Text style={styles.status}>{item.status}</Text>
            <TouchableOpacity style={styles.callButton} onPress={() => setActive(item)}>
              <Text style={styles.callButtonText}>Log call outcome</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <Modal visible={!!active} animationType="slide" transparent onRequestClose={() => setActive(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.cardTitle}>Log call — {active?.name ?? "Lead"}</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TextInput
              style={styles.input}
              value={outcome}
              onChangeText={setOutcome}
              placeholder="Outcome (e.g. Interested, No answer)"
              placeholderTextColor={colors.muted}
            />
            <TextInput
              style={[styles.input, styles.multiline]}
              value={remarks}
              onChangeText={setRemarks}
              placeholder="Notes"
              placeholderTextColor={colors.muted}
              multiline
            />
            <TouchableOpacity style={styles.button} onPress={logCall} disabled={submitting}>
              <Text style={styles.buttonText}>{submitting ? "Saving…" : "Save"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setActive(null)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingTop: 60, paddingHorizontal: 20 },
  title: { color: colors.ink, fontFamily: "Manrope_700Bold", fontSize: 20, marginBottom: 14 },
  list: { paddingBottom: 24 },
  emptyText: { color: colors.muted, fontFamily: "Manrope_400Regular", fontSize: 13, marginTop: 20 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 10,
  },
  cardTitle: { color: colors.ink, fontFamily: "Manrope_600SemiBold", fontSize: 14 },
  cardSubtitle: { color: colors.muted, fontFamily: "Manrope_400Regular", fontSize: 12, marginTop: 2 },
  status: { color: colors.blue, fontFamily: "Manrope_500Medium", fontSize: 11, marginTop: 6 },
  callButton: {
    backgroundColor: colors.navy700,
    borderRadius: radius.sm,
    paddingVertical: 9,
    alignItems: "center",
    marginTop: 10,
  },
  callButtonText: { color: colors.white, fontFamily: "Manrope_600SemiBold", fontSize: 12 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(8,25,47,0.55)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.white, borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md, padding: 20 },
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
    marginTop: 12,
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  button: { backgroundColor: colors.navy700, borderRadius: radius.md, paddingVertical: 14, alignItems: "center", marginTop: 14 },
  buttonText: { color: colors.white, fontFamily: "Manrope_600SemiBold", fontSize: 15 },
  cancelButton: { alignItems: "center", paddingVertical: 12 },
  cancelButtonText: { color: colors.muted, fontFamily: "Manrope_500Medium", fontSize: 13 },
  error: { color: colors.red, fontFamily: "Manrope_500Medium", fontSize: 13, marginTop: 10 },
});
