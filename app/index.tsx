import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "../src/lib/auth-context";
import { colors } from "../src/lib/theme";

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.navy950 }}>
        <ActivityIndicator color={colors.white} />
      </View>
    );
  }

  return <Redirect href={user ? "/(app)" : "/login"} />;
}
