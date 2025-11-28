import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      {/* Define modal/full-screen routes before the main tab navigator */}
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="request" options={{ headerShown: false }} />
      <Stack.Screen name="(listings)" options={{ headerShown: false }} />
      <Stack.Screen name="trade-in" options={{ headerShown: false }} />
      {/* The default tab-based layout */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
