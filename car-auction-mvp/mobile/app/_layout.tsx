import { Stack } from "expo-router";
import { useAuth } from "@/hooks/useAuth";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  mutedForeground: "#8A94A3",
};

export default function RootLayout() {
  const { token } = useAuth();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.card },
        headerTintColor: COLORS.foreground,
        headerTitleStyle: { color: COLORS.foreground },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="request/[id]" options={{ title: "Request" }} />
      <Stack.Screen name="deal/[id]" options={{ title: "Deal Summary" }} />
      <Stack.Screen
        name="(details)/dealers/public/[id]"
        options={{ presentation: "modal" }}
      />
      <Stack.Screen
        name="(details)/dealers/[id]"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}
