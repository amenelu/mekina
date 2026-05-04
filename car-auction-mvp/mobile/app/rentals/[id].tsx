import { Redirect, useLocalSearchParams } from "expo-router";

export default function LegacyRentalDetailRedirect() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  if (!id) {
    return <Redirect href="/(tabs)/rentals" />;
  }

  return <Redirect href={`/${id}`} />;
}
