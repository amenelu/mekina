import { Pressable } from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PUBLIC_HOME_ROUTE } from "@/lib/roleRoutes";

const COLORS = {
  background: "#14181F",
  card: "#1C212B",
  foreground: "#F8F8F8",
};

function HeaderBackButton({ fallback }: { fallback: string }) {
  return (
    <Pressable
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace(fallback as any);
        }
      }}
      style={{
        width: 44,
        height: 44,
        alignItems: "flex-start",
        justifyContent: "center",
      }}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <Ionicons name="chevron-back" size={28} color={COLORS.foreground} />
    </Pressable>
  );
}

export default function MessagesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: COLORS.card },
        headerTintColor: COLORS.foreground,
        headerTitleStyle: { color: COLORS.foreground, fontWeight: "800" },
        headerTitleAlign: "center",
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "My Messages",
          headerLeft: () => <HeaderBackButton fallback={PUBLIC_HOME_ROUTE} />,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: "Chat",
          headerLeft: () => <HeaderBackButton fallback="/messages" />,
        }}
      />
    </Stack>
  );
}
