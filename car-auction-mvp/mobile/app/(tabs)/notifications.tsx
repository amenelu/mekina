import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
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
  accent: "#A370F7",
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

  if (webLink.includes("/(admin)/dealers") || webLink.includes("/admin-dealers")) {
    return ADMIN_ROUTES.dealers;
  }

  // Handle Requests: /requests/123 -> /request/123
  if (webLink.includes("/requests/") && !webLink.includes("/deal/")) {
    const match = webLink.match(/\/requests\/(\d+)/);
    if (match) return `/request/${match[1]}`;
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
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const response = await getNotifications();
      setNotifications(response.data.notifications);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      if (token) {
        fetchNotifications();
      }
    }, [fetchNotifications, token])
  );

  // Listen for real-time notifications
  useEffect(() => {
    if (socket) {
      const handleNewNotification = () => {
        fetchNotifications();
      };

      socket.on("new_notification", handleNewNotification);

      return () => {
        socket.off("new_notification", handleNewNotification);
      };
    }
  }, [fetchNotifications, socket]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
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
          <Pressable
            style={{
              backgroundColor: COLORS.accent,
              padding: 10,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: COLORS.foreground, fontWeight: "bold" }}>
              Login
            </Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{ title: "Notifications", headerTitleAlign: "left" }}
      />
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.content}>
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
