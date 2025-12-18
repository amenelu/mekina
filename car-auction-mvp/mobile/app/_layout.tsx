import { Stack, useNavigationContainerRef } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  mutedForeground: "#8A94A3",
};

export default function RootLayout() {
  const navigationRef = useNavigationContainerRef();

  const { token } = useAuth();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.card },
        headerTintColor: COLORS.foreground,
        headerTitleStyle: { color: COLORS.foreground },
      }}
    >
      <Stack.Screen
        name="(tabs)"
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? "Home";
          const titles: Record<string, string> = {
            index: "Home",
            rentals: "Rentals",
            request: "Find Car",
            "my-requests": "My Requests",
            notifications: "Notifications",
          };
          return {
            headerTitle: titles[routeName] || "Mekina",
            headerShown: false,
          };
        }}
      />
      <Stack.Screen
        name="request/[id]"
        options={{ title: "Request", headerBackTitle: "" }}
      />
      <Stack.Screen name="deal/[id]" options={{ title: "Deal Summary" }} />
      <Stack.Screen
        name="(details)/dealers/public/[id]"
        options={{ presentation: "modal", title: "Dealer Profile" }}
      />
      <Stack.Screen
        name="(details)/dealers/[id]"
        options={{ headerShown: false }}
      />
      <Stack.Screen name="trade-in" options={{ headerShown: false }} />
    </Stack>
  );
}
