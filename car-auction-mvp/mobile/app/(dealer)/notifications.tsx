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
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useFocusEffect } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import axios from "axios";
import { useSocket } from "../../contexts/SocketContext";
import API_URL from "@/constants/Api";

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

  // Handle Requests: /requests/123 -> /request/123
  if (webLink.includes("/requests/") && !webLink.includes("/deal/")) {
    const match = webLink.match(/\/requests\/(\d+)/);
    if (match) return `/(dealer_actions)/place-offer?request_id=${match[1]}`;
  }

  // Handle Dealer Messages
  if (webLink.includes("/dealer/messages/")) {
    const match = webLink.match(/\/dealer\/messages\/(\d+)/);
    if (match) return `/messages/${match[1]}`;
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
    } catch (e) {
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
  const { token } = useAuth();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(response.data.notifications);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [token])
  );

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
  }, [socket]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 20, paddingBottom: 10 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: COLORS.foreground },
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
    borderLeftColor: "transparent",
  },
  unread: {
    backgroundColor: "#252c3a",
    borderLeftColor: COLORS.accent,
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
