import { Redirect } from "expo-router";

export default function Index() {
  // This component will automatically redirect to the main app screen.
  return <Redirect href="/(tabs)" />;
}
