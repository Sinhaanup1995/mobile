import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { apiFetch } from "../../src/lib/api";
import { colors, radius } from "../../src/lib/theme";

type InterestLevel = "HOT" | "WARM" | "COLD" | null;
type Customer = {
  id: string;
  profileId: string;
  name: string;
  mobile: string;
  city: string | null;
  isLocked: boolean;
  interestLevel: InterestLevel;
};

export default function CustomersScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);

  const search = useCallback(async (text: string) => {
    setQuery(text);
    try {
      const result = await apiFetch<{ customers: Customer[] }>(`/customers?q=${encodeURIComponent(text)}`);
      setCustomers(result.customers);
    } catch {
      // Keep the previous list on transient errors.
    }
  }, []);

  useEffect(() => {
    search("");
  }, [search]);

  function maskMobile(mobile: string) {
    return mobile.length > 4 ? `${"*".repeat(mobile.length - 4)}${mobile.slice(-4)}` : mobile;
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Customers</Text>
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={search}
        placeholder="Search by name, mobile or profile ID"
        placeholderTextColor={colors.muted}
      />
      <FlatList
        data={customers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>Search to find a customer.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity onPress={() => router.push(`/(app)/customers/${item.id}`)}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSubtitle}>
                {item.profileId} · {maskMobile(item.mobile)}
              </Text>
            </TouchableOpacity>
            {item.isLocked ? <Text style={styles.lockedTag}>Onboarding complete</Text> : null}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingTop: 60, paddingHorizontal: 20 },
  title: { color: colors.ink, fontFamily: "Manrope_700Bold", fontSize: 20, marginBottom: 14 },
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
    marginBottom: 14,
  },
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
  lockedTag: { color: colors.blue, fontFamily: "Manrope_500Medium", fontSize: 11, marginTop: 6 },
});
