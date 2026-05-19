import Constants from "expo-constants";
import { Platform } from "react-native";

const PORT = "5001";
const explicitApiUrl = process.env.EXPO_PUBLIC_API_URL;

/**
 * A robust function to determine the development server's URL.
 * It tries multiple methods to ensure the best chance of connecting.
 */
function getDevServerUrl(): string {
  if (explicitApiUrl) {
    return explicitApiUrl;
  }

  // Method 1: Modern Expo Config (SDK 48+)
  // The `hostUri` is the most reliable source if available.
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(":")[0];
    return `http://${host}:${PORT}`;
  }

  // Method 2: Classic Manifest (Older SDKs)
  // Falls back to the debugger host from the classic manifest.
  const manifest = Constants.manifest as any;
  const debuggerHost = manifest?.debuggerHost;
  if (typeof debuggerHost === "string") {
    const host = debuggerHost.split(":")[0];
    return `http://${host}:${PORT}`;
  }

  // Method 3: Fallback for Android Emulator
  // If running in an Android emulator, this special IP connects to the host machine.
  if (Platform.OS === "android") {
    return `http://10.0.2.2:${PORT}`;
  }

  // --- Method 4: Fallback for iOS Simulator ---
  if (Platform.OS === "ios") {
    return `http://localhost:${PORT}`;
  }

  return `http://localhost:${PORT}`;
}

function getProductionApiUrl(): string {
  if (!explicitApiUrl) {
    throw new Error(
      "EXPO_PUBLIC_API_URL must be set when building the production web app."
    );
  }
  return explicitApiUrl;
}

const API_URL = __DEV__ ? getDevServerUrl() : getProductionApiUrl();

if (__DEV__) {
  console.log("[API_URL]", API_URL);
}

export default API_URL;
