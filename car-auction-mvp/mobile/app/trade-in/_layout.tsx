import { Stack, useRouter } from "expo-router";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
};

export default function TradeInLayout() {
  const router = useRouter();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.card },
        headerTintColor: COLORS.foreground,
        headerTitleStyle: { color: COLORS.foreground },
        headerLeft: () => (
          <Pressable
            onPress={() => router.back()}
            style={{ paddingHorizontal: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.foreground} />
          </Pressable>
        ),
      }}
    >
      <Stack.Screen name="index" options={{ title: "Get a Trade-in Offer" }} />
    </Stack>
  );
}
