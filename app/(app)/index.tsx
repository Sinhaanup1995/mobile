import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ApiError, apiFetch } from "../../src/lib/api";
import { useAuth } from "../../src/lib/auth-context";
import { colors, radius } from "../../src/lib/theme";

type TodayVisit = {
  id: string;
  checkInAt: string;
  status: string;
  customer: { name: string; profileId: string; interestLevel: "HOT" | "WARM" | "COLD" | null };
  project: { name: string; city: string };
  customerOtpVerified: boolean;
  rmOtpVerified: boolean;
};

type Lead = { id: string; status: string };

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [visits, setVisits] = useState<TodayVisit[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEmployee = user?.role === "EMPLOYEE";
  const isBroker = user?.role === "BROKER";

  const load = useCallback(async () => {
    setError(null);
    try {
      if (isEmployee) {
        const result = await apiFetch<{ visits: TodayVisit[] }>("/visits/today");
        setVisits(result.visits);
      }
      if (isBroker) {
        const result = await apiFetch<{ leads: Lead[] }>("/leads");
        setLeads(result.leads);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load your data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isEmployee, isBroker]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const verifiedCount = visits.filter((v) => v.status === "VERIFIED").length;
  const openLeads = leads.filter((l) => l.status === "NEW" || l.status === "ASSIGNED").length;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
        />
      }
    >
      <View style={styles.topBand}>
        <Text style={styles.kicker}>{user?.staffCode}</Text>
        <Text style={styles.greeting}>Hi, {user?.name?.split(" ")[0]}.</Text>

        {isEmployee ? (
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{visits.length}</Text>
              <Text style={styles.summaryLabel}>VISITS TODAY</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{verifiedCount}</Text>
              <Text style={styles.summaryLabel}>VERIFIED</Text>
            </View>
          </View>
        ) : null}

        {isBroker ? (
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{openLeads}</Text>
              <Text style={styles.summaryLabel}>OPEN LEADS</Text>
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {isEmployee ? (
          <TouchableOpacity style={styles.cta} onPress={() => router.push("/(app)/visits/new")}>
            <Text style={styles.ctaText}>Log a new site visit</Text>
          </TouchableOpacity>
        ) : null}

        {isEmployee ? (
          <>
            <Text style={styles.sectionTitle}>Today&apos;s visits</Text>
            {!loading && visits.length === 0 ? (
              <Text style={styles.emptyText}>No visits logged yet today.</Text>
            ) : null}
            {visits.map((visit) => (
              <TouchableOpacity
                key={visit.id}
                style={styles.card}
                onPress={() => router.push(`/(app)/visits/${visit.id}`)}
              >
                <Text style={styles.cardTitle}>{visit.customer.name}</Text>
                <Text style={styles.cardSubtitle}>
                  {visit.project.name} · {visit.project.city}
                </Text>
                {visit.customer.interestLevel ? (
                  <Text style={[styles.temperature, { color: visit.customer.interestLevel === "HOT" ? colors.red : visit.customer.interestLevel === "WARM" ? colors.amber : colors.blue }]}>
                    {visit.customer.interestLevel} lead
                  </Text>
                ) : null}
                <Text style={styles.cardStatus}>{visit.status.replace("_", " ")}</Text>
                {!visit.customerOtpVerified || !visit.rmOtpVerified ? (
                  <Text style={styles.pendingTag}>OTP pending — tap to complete</Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </>
        ) : null}

        {isBroker ? (
          <>
            <Text style={styles.sectionTitle}>Your leads</Text>
            <Text style={styles.emptyText}>Open the Leads tab to see and call your assigned leads.</Text>
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1 },
  topBand: { backgroundColor: colors.navy950, paddingTop: 64, paddingBottom: 26, paddingHorizontal: 22 },
  kicker: { color: colors.navy100, fontFamily: "Manrope_500Medium", fontSize: 11, letterSpacing: 0.4 },
  greeting: { color: colors.white, fontFamily: "Manrope_700Bold", fontSize: 22, marginTop: 4, marginBottom: 18 },
  summaryRow: { flexDirection: "row", alignItems: "center" },
  summaryItem: { marginRight: 24 },
  summaryValue: { color: colors.white, fontFamily: "Manrope_700Bold", fontSize: 24 },
  summaryLabel: { color: colors.navy100, fontFamily: "Manrope_500Medium", fontSize: 10, letterSpacing: 0.4, marginTop: 2 },
  summaryDivider: { width: 1, height: 30, backgroundColor: "rgba(255,255,255,0.2)", marginRight: 24 },
  body: { padding: 20 },
  cta: {
    backgroundColor: colors.navy700,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 22,
  },
  ctaText: { color: colors.white, fontFamily: "Manrope_600SemiBold", fontSize: 15 },
  sectionTitle: { color: colors.ink, fontFamily: "Manrope_600SemiBold", fontSize: 15, marginBottom: 10 },
  emptyText: { color: colors.muted, fontFamily: "Manrope_400Regular", fontSize: 13 },
  error: { color: colors.red, fontFamily: "Manrope_500Medium", fontSize: 13, marginBottom: 12 },
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
  temperature: { fontFamily: "Manrope_600SemiBold", fontSize: 11, marginTop: 6 },
  cardStatus: { color: colors.blue, fontFamily: "Manrope_500Medium", fontSize: 11, marginTop: 6 },
  pendingTag: { color: colors.amber, fontFamily: "Manrope_600SemiBold", fontSize: 11, marginTop: 6 },
});
