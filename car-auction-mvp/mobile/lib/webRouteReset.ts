import { Platform } from "react-native";

export function replaceWebRoute(route: string) {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.location.replace(route);
    return true;
  }

  return false;
}

export function isWebRuntime() {
  return Platform.OS === "web" && typeof window !== "undefined";
}
