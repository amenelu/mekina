import { Stack } from "expo-router";
import {
  getFocusedRouteNameFromRoute,
  ThemeProvider,
  DarkTheme,
} from "@react-navigation/native";
import { SocketProvider } from "../contexts/SocketContext";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  mutedForeground: "#8A94A3",
};

const MyDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: COLORS.background,
    card: COLORS.card,
    text: COLORS.foreground,
    border: "#313843",
    notification: COLORS.accent,
  },
};

export default function RootLayout() {
  return (
    <SocketProvider>
      <ThemeProvider value={MyDarkTheme}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: COLORS.card },
            headerTintColor: COLORS.foreground,
            headerTitleStyle: { color: COLORS.foreground },
            contentStyle: { backgroundColor: COLORS.background },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
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
          <Stack.Screen
            name="dealer-points"
            options={{ headerShown: false }}
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
          <Stack.Screen
            name="(admin)"
            options={{ headerShown: false, title: "", headerBackTitle: "" }}
          />
          <Stack.Screen
            name="(dealer)"
            options={{ headerShown: false, title: "", headerBackTitle: "" }}
          />
          <Stack.Screen
            name="(rental)"
            options={{ headerShown: false, title: "", headerBackTitle: "" }}
          />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen
            name="compare"
            options={{ presentation: "modal", title: "Compare Vehicles" }}
          />
        </Stack>
      </ThemeProvider>
    </SocketProvider>
  );
}
