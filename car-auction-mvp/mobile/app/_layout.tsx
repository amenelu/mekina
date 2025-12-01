import { Stack } from "expo-router";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  card: "#1C212B",
  foreground: "#F8F8F8",
};

export default function RootLayout() {
  return (
    <Stack
      screenOptions={({ navigation }) => ({
        headerStyle: { backgroundColor: COLORS.card },
        headerTintColor: COLORS.foreground,
        // Replace the default back button with a custom one to guarantee no text
        headerLeft: () => (
          <Pressable
            onPress={() => navigation.goBack()}
            style={{ paddingHorizontal: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.foreground} />
          </Pressable>
        ),
      })}
    >
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="trade-in" options={{ headerShown: false }} />
      <Stack.Screen name="rentals" options={{ headerShown: false }} />
      {/* The detail page, which will have a back button */}
      <Stack.Screen
        name="[id]"
        options={
          {
            // The title is set dynamically inside the [id].tsx file
          }
        }
      />
      <Stack.Screen name="messages" options={{ title: "Messages" }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="compare" options={{ presentation: "modal" }} />
    </Stack>
  );
}
