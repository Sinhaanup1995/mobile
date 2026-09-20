import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";

import { useAuth } from "../../src/lib/auth-context";
import { colors } from "../../src/lib/theme";

export default function AppLayout() {
  const { user, isLoading } = useAuth();

  if (!isLoading && !user) return <Redirect href="/login" />;
  if (!user) return null;

  const isEmployee = user.role === "EMPLOYEE";
  const isBroker = user.role === "BROKER";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.navy700,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { borderTopColor: colors.line },
        tabBarLabelStyle: { fontFamily: "Manrope_500Medium", fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="visits"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: "Customers",
          href: isEmployee || isBroker ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="customers/[id]" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen
        name="leads"
        options={{
          title: "Leads",
          href: isBroker ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="call-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: "Projects",
          tabBarIcon: ({ color, size }) => <Ionicons name="business-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="commissions"
        options={{
          title: "Earnings",
          tabBarIcon: ({ color, size }) => <Ionicons name="cash-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
