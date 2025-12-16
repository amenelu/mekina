import { Stack } from "expo-router";

export default function SpecificRequestLayout() {
  // This layout will apply to all screens within the (tabs)/request/(specific_request) directory
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="make" />
      <Stack.Screen name="model" />
      <Stack.Screen name="year" />
    </Stack>
  );
}
