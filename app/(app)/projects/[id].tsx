import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { ApiError, apiFetch } from "../../../src/lib/api";
import { colors, radius } from "../../../src/lib/theme";

type ProjectDetail = {
  id: string;
  name: string;
  code: string;
  city: string;
  address: string | null;
  minPrice: string | null;
  maxPrice: string | null;
  description: string | null;
  developer: { name: string; contactPhone: string | null };
  relationshipManagers: { id: string; name: string; phone: string }[];
};

function formatPrice(value: string | null) {
  if (!value) return "—";
  const amount = Number(value);
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await apiFetch<{ project: ProjectDetail }>(`/projects/${id}`);
      setProject(result.project);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load this project.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.navy700} />
      </View>
    );
  }

  if (!project) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error ?? "Project not found."}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>{project.code}</Text>
      <Text style={styles.title}>{project.name}</Text>
      <Text style={styles.subtitle}>
        {project.developer.name} · {project.city}
      </Text>

      <View style={styles.priceCard}>
        <Text style={styles.priceLabel}>Price range</Text>
        <Text style={styles.priceValue}>
          {formatPrice(project.minPrice)} – {formatPrice(project.maxPrice)}
        </Text>
      </View>

      {project.address ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Address</Text>
          <Text style={styles.bodyText}>{project.address}</Text>
        </View>
      ) : null}

      {project.description ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>About this project</Text>
          <Text style={styles.bodyText}>{project.description}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Relationship managers</Text>
        {project.relationshipManagers.length ? (
          project.relationshipManagers.map((rm) => (
            <Text key={rm.id} style={styles.bodyText}>
              {rm.name} · {rm.phone}
            </Text>
          ))
        ) : (
          <Text style={styles.bodyText}>No relationship manager assigned yet.</Text>
        )}
      </View>

      {project.developer.contactPhone ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Developer contact</Text>
          <Text style={styles.bodyText}>{project.developer.contactPhone}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 60, paddingBottom: 60 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  error: { color: colors.red, fontFamily: "Manrope_500Medium", fontSize: 13 },
  eyebrow: { color: colors.blue, fontFamily: "Manrope_600SemiBold", fontSize: 11, letterSpacing: 0.4 },
  title: { color: colors.ink, fontFamily: "Manrope_700Bold", fontSize: 22, marginTop: 4 },
  subtitle: { color: colors.muted, fontFamily: "Manrope_400Regular", fontSize: 13, marginTop: 4, marginBottom: 16 },
  priceCard: {
    backgroundColor: colors.navy950,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 16,
  },
  priceLabel: { color: colors.navy100, fontFamily: "Manrope_500Medium", fontSize: 11, letterSpacing: 0.4 },
  priceValue: { color: colors.white, fontFamily: "Manrope_700Bold", fontSize: 20, marginTop: 4 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 14,
  },
  sectionTitle: { color: colors.ink, fontFamily: "Manrope_600SemiBold", fontSize: 14, marginBottom: 6 },
  bodyText: { color: colors.muted, fontFamily: "Manrope_400Regular", fontSize: 13, lineHeight: 19 },
});
