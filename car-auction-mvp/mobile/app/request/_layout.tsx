import { Stack, useRouter, useNavigation } from "expo-router";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
};

export default function RequestLayout() {
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.card },
        headerTintColor: COLORS.foreground,
        headerTitleStyle: { color: COLORS.foreground },
        contentStyle: { backgroundColor: COLORS.background },
        headerLeft: () => (
          <Pressable
            // Use router.back() to navigate up the parent stack
            onPress={() => router.back()}
            style={{ paddingHorizontal: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.foreground} />
          </Pressable>
        ),
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
