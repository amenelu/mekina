import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Link, Stack, useFocusEffect } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "../../contexts/SocketContext";
import { ADMIN_ROUTES } from "@/lib/roleRoutes";
import { getNotifications } from "@/lib/api/notifications";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#6118D7",
  mutedForeground: "#8A94A3",
  border: "#313843",
};

interface Notification {
  id: number;
  message: string;
  timestamp: string;
  is_read: boolean;
  link?: string | null;
}

const getMobileRoute = (webLink: string | null) => {
  if (!webLink) return null;

  const appendBidParam = (route: string) => {
    const bidMatch = webLink.match(/[?&]bid_id=(\d+)/);
    return bidMatch ? `${route}?bid_id=${bidMatch[1]}` : route;
  };

  if (webLink.includes("/(admin)/dealers") || webLink.includes("/admin-dealers")) {
    return ADMIN_ROUTES.dealers;
  }

  if (webLink.includes("/trade-in/")) {
    const match = webLink.match(/\/trade-in\/(\d+)/);
    if (match) return `/trade-in/${match[1]}`;
  }

  // Handle Expo app links already targeting the mobile request screen.
  if (webLink.includes("/request/") && !webLink.includes("/requests/")) {
    const match = webLink.match(/\/request\/(\d+)/);
    if (match) return appendBidParam(`/request/${match[1]}`);
  }

  // Handle Requests: /requests/123 -> /request/123
  if (webLink.includes("/requests/") && !webLink.includes("/deal/")) {
    const match = webLink.match(/\/requests\/(\d+)/);
    if (match) return appendBidParam(`/request/${match[1]}`);
  }

  // Handle Messages: /my-messages/123 -> /messages/123
  if (webLink.includes("/my-messages/")) {
    const match = webLink.match(/\/my-messages\/(\d+)/);
    if (match) return `/messages/${match[1]}`;
  }

  // Handle Dealer Messages: /dealer/messages/123 -> /messages/123
  if (webLink.includes("/dealer/messages/")) {
    const match = webLink.match(/\/dealer\/messages\/(\d+)/);
    if (match) return `/messages/${match[1]}`;
  }

  // Handle Deals: /requests/deal/123 -> /deal/123
  if (webLink.includes("/deal/")) {
    const match = webLink.match(/\/deal\/(\d+)/);
    if (match) return `/deal/${match[1]}`;
  }

  return null;
};

const NotificationItem = ({ notification }: { notification: Notification }) => {
  const mobileLink = getMobileRoute(notification.link || null);

  const formatTime = (timestamp: string) => {
    if (!timestamp) return "";
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return "";
      const dateString = date.toLocaleString();
      return dateString === "Invalid Date" ? "" : dateString;
    } catch {
      return "";
    }
  };

  return (
    <View
      style={[styles.notificationItem, !notification.is_read && styles.unread]}
    >
      <View style={styles.notificationContent}>
        <Text style={styles.notificationText}>{notification.message}</Text>
        <Text style={styles.notificationTime}>
          {formatTime(notification.timestamp)}
        </Text>
      </View>
      {mobileLink && (
        <Link href={mobileLink as any} asChild>
          <Pressable style={styles.notificationAction}>
            <Text style={styles.viewText}>View</Text>
          </Pressable>
        </Link>
      )}
    </View>
  );
};

const NotificationsScreen = () => {
  const { token, isLoading } = useAuth() as any;
  const { socket, refreshCounts } = useSocket();
  const { width } = useWindowDimensions();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isWideWeb = Platform.OS === "web" && width >= 1000;

  const fetchNotifications = useCallback(async (options?: {
    refreshBadges?: boolean;
  }) => {
    if (!token) return;
    try {
      const response = await getNotifications();
      setNotifications(response.data.notifications);
      if (options?.refreshBadges) {
        await refreshCounts();
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshCounts, token]);

  useFocusEffect(
    useCallback(() => {
      if (token) {
        fetchNotifications({ refreshBadges: true });
      }
    }, [fetchNotifications, token])
  );

  // Refresh visible notifications in real time only while this screen is focused.
  useFocusEffect(
    useCallback(() => {
      if (socket) {
        const handleNewNotification = () => {
          fetchNotifications();
        };

        socket.on("new_notification", handleNewNotification);

        return () => {
          socket.off("new_notification", handleNewNotification);
        };
      }
    }, [fetchNotifications, socket])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications({ refreshBadges: true });
  };

  if (!isLoading && !token) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center", padding: 20 },
        ]}
      >
        <Text
          style={{
            color: COLORS.mutedForeground,
            fontSize: 16,
            textAlign: "center",
            marginBottom: 20,
          }}
        >
          Please log in to view notifications.
        </Text>
        <Link href="/(auth)/login" asChild>
          <Pressable style={styles.loginButton}>
            <Text style={styles.loginButtonText}>Login</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{ title: "Notifications", headerTitleAlign: "center" }}
      />
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={[styles.content, isWideWeb && styles.contentWide]}>
          {isWideWeb && (
            <View style={styles.pageIntro}>
              <Text style={styles.pageTitle}>Notifications</Text>
              <Text style={styles.pageSubtitle}>
                Updates from dealer offers, answers, messages, and account
                activity.
              </Text>
            </View>
          )}
          <View style={styles.notificationList}>
            {loading && !refreshing ? (
              <ActivityIndicator size="large" color={COLORS.accent} />
            ) : notifications.length > 0 ? (
              notifications.map((item) => (
                <NotificationItem key={item.id} notification={item} />
              ))
            ) : (
              <Text style={styles.noItemsText}>
                You have no notifications yet.
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20 },
  contentWide: {
    maxWidth: 1040,
    width: "100%",
    alignSelf: "center",
    paddingTop: 42,
  },
  pageIntro: {
    alignItems: "center",
    marginBottom: 28,
  },
  pageTitle: {
    color: COLORS.foreground,
    fontSize: 36,
    fontWeight: "800",
    textAlign: "center",
  },
  pageSubtitle: {
    color: COLORS.mutedForeground,
    fontSize: 18,
    marginTop: 10,
    textAlign: "center",
  },
  loginButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    minWidth: 120,
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  loginButtonText: {
    color: COLORS.foreground,
    fontSize: 15,
    fontWeight: "700",
  },
  notificationList: { gap: 10 },
  notificationItem: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderLeftWidth: 3,
    borderLeftColor: "transparent", // Default border
  },
  unread: {
    backgroundColor: "#252c3a", // Slightly different background for unread
    borderLeftColor: COLORS.accent, // Purple border for unread
  },
  notificationContent: { flex: 1, marginRight: 10 },
  notificationText: {
    color: COLORS.foreground,
    fontSize: 15,
    lineHeight: 22,
  },
  notificationTime: {
    color: COLORS.mutedForeground,
    fontSize: 12,
    marginTop: 5,
  },
  notificationAction: {},
  viewText: {
    color: COLORS.accent,
    fontWeight: "600",
    fontSize: 16,
  },
  noItemsText: {
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginTop: 40,
  },
});

export default NotificationsScreen;
