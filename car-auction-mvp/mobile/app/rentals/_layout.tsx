import { Stack } from "expo-router";

const COLORS = {
  card: "#1C212B",
  foreground: "#F8F8F8",
};

export default function RentalDetailLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
