import { Stack } from "expo-router";

export default function MessagesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: "#1C212B" },
        headerTintColor: "#F8F8F8",
        headerTitleStyle: { color: "#F8F8F8", fontWeight: "800" },
        headerTitleAlign: "center",
        contentStyle: { backgroundColor: "#14181F" },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
