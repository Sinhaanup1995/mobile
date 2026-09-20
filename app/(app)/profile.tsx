import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useAuth } from "../../src/lib/auth-context";
import { colors, radius } from "../../src/lib/theme";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  EMPLOYEE: "Employee",
  BROKER: "Broker",
};

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.card}>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.role}>{user ? ROLE_LABELS[user.role] : ""}</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Staff code</Text>
          <Text style={styles.value}>{user?.staffCode}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>{user?.phone}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSignOut}>
        <Text style={styles.buttonText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingTop: 60, paddingHorizontal: 20 },
  title: { color: colors.ink, fontFamily: "Manrope_700Bold", fontSize: 20, marginBottom: 16 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
    marginBottom: 20,
  },
  name: { color: colors.ink, fontFamily: "Manrope_700Bold", fontSize: 18 },
  role: { color: colors.blue, fontFamily: "Manrope_500Medium", fontSize: 12, marginTop: 2, marginBottom: 16 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  label: { color: colors.muted, fontFamily: "Manrope_400Regular", fontSize: 13 },
  value: { color: colors.ink, fontFamily: "Manrope_500Medium", fontSize: 13 },
  button: { backgroundColor: colors.red, borderRadius: radius.md, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: colors.white, fontFamily: "Manrope_600SemiBold", fontSize: 15 },
});
