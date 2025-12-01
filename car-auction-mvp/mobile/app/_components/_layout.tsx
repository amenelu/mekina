import { Stack } from "expo-router";

const COLORS = {
  card: "#1C212B",
  foreground: "#F8F8F8",
};

export default function MessagesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
