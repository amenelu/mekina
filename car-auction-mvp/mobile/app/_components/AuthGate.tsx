import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";

import { useAuth, type User } from "@/hooks/useAuth";
import { getPostLoginRoute, LOGIN_ROUTE } from "@/lib/roleRoutes";

const COLORS = {
  background: "#14181F",
  accent: "#A370F7",
};

type Role = "admin" | "dealer" | "rental";

function hasRole(user: User | null, role: Role) {
  if (!user) return false;
  if (role === "admin") return user.is_admin;
  if (role === "dealer") return user.is_dealer || user.is_admin;
  return user.is_rental_company || user.is_admin;
}

export default function AuthGate({
  children,
  role,
}: React.PropsWithChildren<{ role: Role }>) {
  const { user, token, isLoading, hasHydrated } = useAuth();

  if (!hasHydrated || isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (!token || !user) {
    return <Redirect href={LOGIN_ROUTE as any} />;
  }

  if (!hasRole(user, role)) {
    return <Redirect href={getPostLoginRoute(user) as any} />;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
});
