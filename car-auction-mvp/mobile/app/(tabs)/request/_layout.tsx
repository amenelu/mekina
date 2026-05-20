import { Stack, useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
};

export default function RequestLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.card },
          headerTintColor: COLORS.foreground,
          headerTitleStyle: { color: COLORS.foreground },
          headerTitleAlign: "center",
          contentStyle: { backgroundColor: COLORS.background },
          headerLeft: () => (
            <Pressable
              // Use router.back() to navigate up the parent stack
              onPress={() => router.back()}
              style={{ paddingHorizontal: 10 }}
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color={COLORS.foreground}
              />
            </Pressable>
          ),
        }}
      >
        <Stack.Screen name="index" />
        {/* These groups are part of the stack but don't have a tab bar icon */}
        <Stack.Screen name="(general_request)" options={{ headerShown: false }} />
        <Stack.Screen
          name="(specific_request)"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="upload" options={{ headerShown: false }} />
      </Stack>

      <Pressable
        style={[styles.homeButton, { top: insets.top + 12 }]}
        onPress={() => router.replace("/(tabs)")}
      >
        <Ionicons name="home-outline" size={20} color={COLORS.foreground} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  homeButton: {
    position: "absolute",
    right: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(28, 33, 43, 0.94)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
    zIndex: 100,
  },
});
