import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

import { ApiError, apiFetch } from "../../src/lib/api";
import { colors, radius } from "../../src/lib/theme";

type LedgerEntry = {
  id: string;
  type: "INCENTIVE" | "COMMISSION" | "DEDUCTION";
  amount: string;
  note: string | null;
  dealReference: string | null;
  createdAt: string;
};

type CommissionSummary = {
  netEarned: string;
  byType: Record<string, string>;
  currentRate: { percentage: string; source: string };
  entries: LedgerEntry[];
};

function formatMoney(value: string) {
  const amount = Number(value);
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

const TYPE_LABELS: Record<string, string> = {
  INCENTIVE: "Incentive",
  COMMISSION: "Commission",
  DEDUCTION: "Deduction",
};

export default function CommissionsScreen() {
  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await apiFetch<CommissionSummary>("/commissions");
      setSummary(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load your commissions.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={styles.root}>
      <FlatList
        data={summary?.entries ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Commissions</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {summary ? (
              <>
                <View style={styles.heroCard}>
                  <Text style={styles.heroLabel}>NET EARNED</Text>
                  <Text style={styles.heroValue}>{formatMoney(summary.netEarned)}</Text>
                  <Text style={styles.heroRate}>
                    Current rate: {summary.currentRate.percentage}% ({summary.currentRate.source})
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  {Object.entries(summary.byType).map(([type, amount]) => (
                    <View key={type} style={styles.breakdownCard}>
                      <Text style={styles.breakdownLabel}>{TYPE_LABELS[type] ?? type}</Text>
                      <Text style={styles.breakdownValue}>{formatMoney(amount)}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}
            <Text style={styles.sectionTitle}>Recent history</Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.emptyText}>No ledger entries yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.cardTitle}>{TYPE_LABELS[item.type] ?? item.type}</Text>
              <Text style={[styles.cardAmount, item.type === "DEDUCTION" ? styles.negative : styles.positive]}>
                {item.type === "DEDUCTION" ? "-" : "+"}
                {formatMoney(item.amount)}
              </Text>
            </View>
            {item.dealReference ? <Text style={styles.cardSubtitle}>Deal {item.dealReference}</Text> : null}
            {item.note ? <Text style={styles.cardSubtitle}>{item.note}</Text> : null}
            <Text style={styles.cardTime}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  list: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 24 },
  title: { color: colors.ink, fontFamily: "Manrope_700Bold", fontSize: 20, marginBottom: 14 },
  error: { color: colors.red, fontFamily: "Manrope_500Medium", fontSize: 13, marginBottom: 12 },
  heroCard: { backgroundColor: colors.navy950, borderRadius: radius.md, padding: 18, marginBottom: 14 },
  heroLabel: { color: colors.navy100, fontFamily: "Manrope_500Medium", fontSize: 11, letterSpacing: 0.4 },
  heroValue: { color: colors.white, fontFamily: "Manrope_700Bold", fontSize: 28, marginTop: 4 },
  heroRate: { color: colors.navy100, fontFamily: "Manrope_400Regular", fontSize: 12, marginTop: 8 },
  breakdownRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  breakdownCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
  },
  breakdownLabel: { color: colors.muted, fontFamily: "Manrope_500Medium", fontSize: 11 },
  breakdownValue: { color: colors.ink, fontFamily: "Manrope_700Bold", fontSize: 15, marginTop: 4 },
  sectionTitle: { color: colors.ink, fontFamily: "Manrope_600SemiBold", fontSize: 14, marginBottom: 10 },
  emptyText: { color: colors.muted, fontFamily: "Manrope_400Regular", fontSize: 13, marginTop: 10 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 10,
  },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { color: colors.ink, fontFamily: "Manrope_600SemiBold", fontSize: 13 },
  cardAmount: { fontFamily: "Manrope_700Bold", fontSize: 14 },
  positive: { color: colors.green },
  negative: { color: colors.red },
  cardSubtitle: { color: colors.muted, fontFamily: "Manrope_400Regular", fontSize: 12, marginTop: 4 },
  cardTime: { color: colors.muted, fontFamily: "Manrope_400Regular", fontSize: 11, marginTop: 6 },
});
