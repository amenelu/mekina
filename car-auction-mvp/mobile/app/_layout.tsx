import React, { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack } from "expo-router";
import {
  getFocusedRouteNameFromRoute,
  ThemeProvider,
  DarkTheme,
} from "@react-navigation/native";
import { SocketProvider } from "../contexts/SocketContext";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  mutedForeground: "#8A94A3",
};

const MyDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: COLORS.background,
    card: COLORS.card,
    text: COLORS.foreground,
    border: "#313843",
    notification: COLORS.accent,
  },
};

type RuntimeDebug = {
  message: string;
  stack?: string;
};

class RootErrorBoundary extends React.Component<
  React.PropsWithChildren,
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("RootErrorBoundary caught an error:", error);
  }

  render() {
    if (this.state.error) {
      return (
        <RuntimeErrorScreen
          title="Runtime crash"
          message={this.state.error.message}
          stack={this.state.error.stack}
        />
      );
    }

    return this.props.children;
  }
}

function RuntimeErrorScreen({
  title,
  message,
  stack,
}: {
  title: string;
  message: string;
  stack?: string;
}) {
  return (
    <View style={styles.errorShell}>
      <View style={styles.errorCard}>
        <Text style={styles.errorTitle}>{title}</Text>
        <Text style={styles.errorMessage}>{message}</Text>
        {stack ? (
          <ScrollView style={styles.errorStackBox}>
            <Text style={styles.errorStack}>{stack}</Text>
          </ScrollView>
        ) : null}
      </View>
    </View>
  );
}

function WebRuntimeMonitor({ children }: React.PropsWithChildren) {
  const [runtimeError, setRuntimeError] = useState<RuntimeDebug | null>(null);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      return;
    }

    const onError = (event: ErrorEvent) => {
      setRuntimeError({
        message: event.error?.message || event.message || "Unknown web error",
        stack: event.error?.stack,
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      setRuntimeError({
        message:
          reason?.message ||
          (typeof reason === "string" ? reason : "Unhandled promise rejection"),
        stack: reason?.stack,
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  if (runtimeError) {
    return (
      <View style={styles.errorShell}>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Web runtime error</Text>
          <Text style={styles.errorMessage}>{runtimeError.message}</Text>
          {runtimeError.stack ? (
            <ScrollView style={styles.errorStackBox}>
              <Text style={styles.errorStack}>{runtimeError.stack}</Text>
            </ScrollView>
          ) : null}
          <Pressable
            style={styles.errorButton}
            onPress={() => setRuntimeError(null)}
          >
            <Text style={styles.errorButtonText}>Dismiss</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <RootErrorBoundary>
      <WebRuntimeMonitor>
        <SocketProvider>
          <ThemeProvider value={MyDarkTheme}>
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: COLORS.card },
                headerTintColor: COLORS.foreground,
                headerTitleStyle: { color: COLORS.foreground },
                contentStyle: { backgroundColor: COLORS.background },
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen
                name="(tabs)"
                options={({ route }) => {
                  const routeName = getFocusedRouteNameFromRoute(route) ?? "Home";
                  const titles: Record<string, string> = {
                    index: "Home",
                    rentals: "Rentals",
                    request: "Find Car",
                    "my-requests": "My Requests",
                    notifications: "Notifications",
                  };
                  return {
                    headerTitle: titles[routeName] || "Mekina",
                    headerShown: false,
                  };
                }}
              />
              <Stack.Screen
                name="request/[id]"
                options={{ title: "Request", headerBackTitle: "" }}
              />
              <Stack.Screen
                name="dealer-points"
                options={{ headerShown: false }}
              />
              <Stack.Screen name="deal/[id]" options={{ title: "Deal Summary" }} />
              <Stack.Screen
                name="(details)/dealers/public/[id]"
                options={{ presentation: "modal", title: "Dealer Profile" }}
              />
              <Stack.Screen
                name="(details)/dealers/[id]"
                options={{ headerShown: false }}
              />
              <Stack.Screen name="trade-in" options={{ headerShown: false }} />
              <Stack.Screen
                name="(admin)"
                options={{ headerShown: false, title: "", headerBackTitle: "" }}
              />
              <Stack.Screen
                name="(dealer)"
                options={{ headerShown: false, title: "", headerBackTitle: "" }}
              />
              <Stack.Screen
                name="(rental)"
                options={{ headerShown: false, title: "", headerBackTitle: "" }}
              />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen
                name="compare"
                options={{ presentation: "modal", title: "Compare Vehicles" }}
              />
            </Stack>
          </ThemeProvider>
        </SocketProvider>
      </WebRuntimeMonitor>
    </RootErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorShell: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorCard: {
    width: "100%",
    maxWidth: 980,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#5a2230",
    padding: 20,
  },
  errorTitle: {
    color: "#ff9aa7",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },
  errorMessage: {
    color: COLORS.foreground,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  errorStackBox: {
    maxHeight: 320,
    backgroundColor: "#101317",
    borderRadius: 12,
    padding: 12,
  },
  errorStack: {
    color: COLORS.mutedForeground,
    fontSize: 12,
    lineHeight: 18,
  },
  errorButton: {
    alignSelf: "flex-start",
    marginTop: 14,
    backgroundColor: COLORS.accent,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  errorButtonText: {
    color: COLORS.foreground,
    fontWeight: "700",
  },
});
