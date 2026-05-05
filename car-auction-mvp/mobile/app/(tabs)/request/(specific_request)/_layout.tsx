import { Stack } from "expo-router";

const COLORS = {
  background: "#14181F",
};

export default function SpecificRequestLayout() {
  // This layout will apply to all screens within the (tabs)/request/(specific_request) directory
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen name="make" />
      <Stack.Screen name="model" />
      <Stack.Screen name="year" />
    </Stack>
  );
}
