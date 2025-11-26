import { Redirect } from "expo-router";

export default function Index() {
  // This component will automatically redirect to the login screen.
  return <Redirect href="/login" />;
}
