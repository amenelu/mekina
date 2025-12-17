import Constants from "expo-constants";
import { Platform } from "react-native";

const PORT = "5001";

/**
 * A robust function to determine the development server's URL.
 * It tries multiple methods to ensure the best chance of connecting.
 */
function getDevServerUrl(): string {
  // Method 1: Modern Expo Config (SDK 48+)
  // The `hostUri` is the most reliable source if available.
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(":")[0];
    console.log(`Connecting to API via hostUri: http://${host}:${PORT}`);
    return `http://${host}:${PORT}`;
  }

  // Method 2: Classic Manifest (Older SDKs)
  // Falls back to the debugger host from the classic manifest.
  const manifest = Constants.manifest as any;
  const debuggerHost = manifest?.debuggerHost;
  if (typeof debuggerHost === "string") {
    const host = debuggerHost.split(":")[0];
    console.log(`Connecting to API via debuggerHost: http://${host}:${PORT}`);
    return `http://${host}:${PORT}`;
  }

  // Method 3: Fallback for Android Emulator
  // If running in an Android emulator, this special IP connects to the host machine.
  if (Platform.OS === "android") {
    console.log(
      `Connecting to API via Android Emulator fallback: http://10.0.2.2:${PORT}`
    );
    return `http://10.0.2.2:${PORT}`;
  }

  // --- Method 4: Fallback for iOS Simulator ---
  if (Platform.OS === "ios") {
    console.log(
      `Connecting to API via iOS Simulator fallback: http://localhost:${PORT}`
    );
    return `http://localhost:${PORT}`;
  }

  // --- Last Resort: Hardcoded IP ---
  // If all dynamic methods fail, log a warning and use a hardcoded IP.
  // You might need to change this IP to your computer's current IP address.
  // This is common for physical devices. You might need to change this IP.
  console.warn(
    "Could not dynamically determine server address. Falling back to hardcoded IP. Please check your network configuration and ensure this IP is correct."
  );
  return `http://192.168.8.233:${PORT}`; // <-- CHANGE THIS IF NEEDED
}

// This is a placeholder for your future production API URL.
const prodApiUrl = "https://api.your-production-domain.com";

const API_URL = __DEV__ ? getDevServerUrl() : prodApiUrl;

export default API_URL;
