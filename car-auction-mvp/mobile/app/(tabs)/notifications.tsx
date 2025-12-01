import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { Link } from "expo-router";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  mutedForeground: "#8A94A3",
  border: "#313843",
};

// Mock data based on notifications.html
const mockNotifications = [
  {
    id: "1",
    message:
      "A dealer has placed an offer on your request for a 'Toyota RAV4'.",
    timestamp: "Oct 28, 2023 14:30",
    is_read: false,
    link: "/my-requests", // Example link
  },
  {
    id: "2",
    message: "Your auction for the '2021 Volkswagen ID.4' has ended.",
    timestamp: "Oct 27, 2023 18:00",
    is_read: true,
    link: "/1", // Example link to a car detail page
  },
  {
    id: "3",
    message:
      "A new message received from 'Prestige Auto' regarding your inquiry.",
    timestamp: "Oct 27, 2023 11:15",
    is_read: true,
    link: "/messages/conv1", // Example link to a conversation
  },
  {
    id: "4",
    message: "Welcome to Mekina! Your account has been successfully created.",
    timestamp: "Oct 26, 2023 09:00",
    is_read: true,
    link: null,
  },
];

const NotificationItem = ({
  notification,
}: {
  notification: (typeof mockNotifications)[0];
}) => (
  <View
    style={[styles.notificationItem, !notification.is_read && styles.unread]}
  >
    <View style={styles.notificationContent}>
      <Text style={styles.notificationText}>{notification.message}</Text>
      <Text style={styles.notificationTime}>{notification.timestamp}</Text>
    </View>
    {notification.link && (
      <Link href={notification.link as any} asChild>
        <Pressable style={styles.notificationAction}>
          <Text style={styles.viewText}>View</Text>
        </Pressable>
      </Link>
    )}
  </View>
);

const NotificationsScreen = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.notificationList}>
          {mockNotifications.length > 0 ? (
            mockNotifications.map((item) => (
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
