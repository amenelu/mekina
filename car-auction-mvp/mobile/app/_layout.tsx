import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, router, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getFocusedRouteNameFromRoute,
  ThemeProvider,
  DarkTheme,
} from "@react-navigation/native";
import { SocketProvider } from "../contexts/SocketContext";
import { PUBLIC_HOME_ROUTE } from "@/lib/roleRoutes";

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

    const isRecoverableHydrationError = (message?: string) =>
      Boolean(
        message &&
          (message.includes("Minified React error #418") ||
            message.toLowerCase().includes("hydration"))
      );

    const onError = (event: ErrorEvent) => {
      const message =
        event.error?.message || event.message || "Unknown web error";
      if (isRecoverableHydrationError(message)) {
        return;
      }

      setRuntimeError({
        message,
        stack: event.error?.stack,
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason?.message ||
        (typeof reason === "string" ? reason : "Unhandled promise rejection");
      if (isRecoverableHydrationError(message)) {
        return;
      }

      setRuntimeError({
        message,
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

function WebInputFocusStyles() {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      return;
    }

    const styleId = "mekina-web-input-focus-reset";
    if (document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      input:focus,
      textarea:focus,
      [contenteditable="true"]:focus {
        outline: none !important;
        box-shadow: none !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, []);

  return null;
}

function WebGlobalPullToRefresh() {
  const pathname = usePathname();
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullRefreshDisabled =
    pathname.includes("/place-offer") ||
    pathname.includes("/dealer-place-offer");

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      return;
    }
    if (pullRefreshDisabled) {
      setPullDistance(0);
      return;
    }

    const threshold = 78;
    let startY = 0;
    let startX = 0;
    let pulling = false;
    let rafId: number | null = null;

    const getScrollableParent = (target: EventTarget | null) => {
      let element = target instanceof HTMLElement ? target : null;
      while (element && element !== document.body) {
        const style = window.getComputedStyle(element);
        const canScroll =
          /(auto|scroll)/.test(style.overflowY) &&
          element.scrollHeight > element.clientHeight;
        if (canScroll) {
          return element;
        }
        element = element.parentElement;
      }
      return document.scrollingElement || document.documentElement;
    };

    const isAtTop = (target: EventTarget | null) => {
      const scrollable = getScrollableParent(target);
      return (scrollable?.scrollTop || 0) <= 0;
    };

    const isTextEntry = (target: EventTarget | null) => {
      const element = target instanceof HTMLElement ? target : null;
      return Boolean(
        element?.closest("input, textarea, select, [contenteditable='true']")
      );
    };

    const isInsideHorizontalScroller = (target: EventTarget | null) => {
      let element = target instanceof HTMLElement ? target : null;
      while (element && element !== document.body) {
        const style = window.getComputedStyle(element);
        const canScrollHorizontally =
          /(auto|scroll)/.test(style.overflowX) &&
          element.scrollWidth > element.clientWidth;
        if (canScrollHorizontally) {
          return true;
        }
        element = element.parentElement;
      }
      return false;
    };

    const pageHasInAppRefresh = () =>
      Number((window as any).__mekinaWebPullRefreshHandlers || 0) > 0;
    const isImageViewerOpen = () =>
      Boolean((window as any).__mekinaImageViewerOpen);
    const isDealerProfileOpen = () =>
      Boolean((window as any).__mekinaDealerProfileOpen);

    const updatePullDistance = (distance: number) => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      rafId = window.requestAnimationFrame(() => {
        setPullDistance(distance);
        rafId = null;
      });
    };

    const onTouchStart = (event: TouchEvent) => {
      if (
        refreshing ||
        isImageViewerOpen() ||
        isDealerProfileOpen() ||
        pageHasInAppRefresh() ||
        isTextEntry(event.target) ||
        isInsideHorizontalScroller(event.target) ||
        !isAtTop(event.target)
      ) {
        pulling = false;
        return;
      }

      const touch = event.touches[0];
      startY = touch.clientY;
      startX = touch.clientX;
      pulling = true;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (
        !pulling ||
        refreshing ||
        isImageViewerOpen() ||
        isDealerProfileOpen() ||
        event.touches.length !== 1
      ) {
        return;
      }

      const touch = event.touches[0];
      const deltaY = touch.clientY - startY;
      const deltaX = Math.abs(touch.clientX - startX);

      if (deltaY <= 0 || deltaX > Math.abs(deltaY)) {
        pulling = false;
        updatePullDistance(0);
        return;
      }

      if (!isAtTop(event.target)) {
        pulling = false;
        updatePullDistance(0);
        return;
      }

      updatePullDistance(Math.min(112, deltaY * 0.55));
    };

    const onTouchEnd = () => {
      if (!pulling) {
        return;
      }

      pulling = false;
      setPullDistance((currentDistance) => {
        if (currentDistance >= threshold && !refreshing) {
          setRefreshing(true);
          window.location.reload();
          return 52;
        }
        return 0;
      });
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [pullRefreshDisabled, refreshing]);

  if (Platform.OS !== "web" || pullRefreshDisabled) {
    return null;
  }

  const visibleHeight = refreshing ? 52 : pullDistance;
  if (visibleHeight <= 8) {
    return null;
  }

  return (
    <View style={[styles.webPullIndicator, { height: visibleHeight }]}>
      {refreshing ? (
        <View style={styles.webPullRow}>
          <ActivityIndicator size="small" color={COLORS.accent} />
          <Text style={styles.webPullText}>Refreshing...</Text>
        </View>
      ) : (
        <Text style={styles.webPullText}>
          {pullDistance >= 78 ? "Release to refresh" : "Pull to refresh"}
        </Text>
      )}
    </View>
  );
}

function MessagesHeaderBackButton() {
  return (
    <Pressable
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace(PUBLIC_HOME_ROUTE as any);
        }
      }}
      style={styles.rootHeaderBackButton}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <Ionicons name="chevron-back" size={28} color={COLORS.foreground} />
    </Pressable>
  );
}

export default function RootLayout() {
  return (
    <RootErrorBoundary>
      <WebRuntimeMonitor>
        <WebInputFocusStyles />
        <WebGlobalPullToRefresh />
        <SocketProvider>
          <ThemeProvider value={MyDarkTheme}>
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: COLORS.card },
                headerTintColor: COLORS.foreground,
                headerTitleStyle: { color: COLORS.foreground },
                headerTitleAlign: "center",
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
              <Stack.Screen
                name="messages"
                options={{
                  title: "messages",
                  headerLeft: () => <MessagesHeaderBackButton />,
                }}
              />
              <Stack.Screen name="deal/[id]" options={{ title: "Deal Summary" }} />
              <Stack.Screen
                name="(details)/dealers/public/[id]"
                options={{
                  presentation: "transparentModal",
                  animation: "fade",
                  headerShown: false,
                  contentStyle: { backgroundColor: "transparent" },
                }}
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
  webPullIndicator: {
    position: "fixed" as any,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: "#313843",
    overflow: "hidden",
  },
  webPullRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  webPullText: {
    color: COLORS.mutedForeground,
    fontSize: 12,
    fontWeight: "700",
  },
  rootHeaderBackButton: {
    width: 44,
    height: 44,
    alignItems: "flex-start",
    justifyContent: "center",
  },
});
