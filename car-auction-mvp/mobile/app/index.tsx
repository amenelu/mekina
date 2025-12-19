import { Redirect } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const { user } = useAuth();

  if (user?.is_admin) {
    return <Redirect href="/(admin)/dashboard" />;
  }

  if (user?.is_dealer) {
    return <Redirect href="/(dealer)/dashboard" />;
  }

  return <Redirect href="/(tabs)" />;
}
