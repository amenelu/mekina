import { Stack } from "expo-router";

export default function GeneralRequestLayout() {
  // The parent layout in ../_layout.tsx provides the header styling and back button.
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="budget" />
      <Stack.Screen name="body-type" />
      <Stack.Screen name="fuel-type" />
      <Stack.Screen name="equipment" />
      <Stack.Screen name="brand" />
    </Stack>
  );
}
