import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  mutedForeground: "#8A94A3",
  border: "#313843",
};

// Define a type for the conversation prop for better type safety
interface Conversation {
  id: number | string;
  other_party: {
    username: string;
    is_dealer: boolean;
  } | null;
  car: {
    year: number;
    make: string;
    model: string;
  } | null;
  last_message_body: string;
  last_message_timestamp: string;
  unread_count?: number;
}

const ConversationItem = ({ conv }: { conv: Conversation }) => {
  const router = useRouter();

  // Defensive check in case a null item is passed
  if (!conv) {
    return null;
  }

  let formattedDate = "";
  if (conv.last_message_timestamp) {
    const date = new Date(conv.last_message_timestamp);
    if (!isNaN(date.getTime())) {
      const dateString = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      if (dateString !== "Invalid Date") {
        formattedDate = dateString;
      }
    }
  }

  const isUnread = (conv.unread_count || 0) > 0;

  const handlePress = () => {
    router.push(`/messages/${conv.id}`);
  };

  return (
    <TouchableOpacity style={styles.notificationItem} onPress={handlePress}>
      <View style={styles.notificationContent}>
        <View style={styles.headerRow}>
          <Text style={styles.notificationText}>
            {conv.other_party?.username || "User"}
          </Text>
          <Text style={styles.dateText}>{formattedDate}</Text>
        </View>
        <Text style={styles.subText}>
          ({conv.other_party?.is_dealer ? "Dealer" : "Buyer"})
        </Text>
        <Text style={styles.carText}>
          <Text style={styles.boldText}>
            {conv.car?.year} {conv.car?.make} {conv.car?.model}
          </Text>
        </Text>
        <Text
          style={[styles.lastMessage, isUnread && styles.unreadMessage]}
          numberOfLines={1}
        >
          {conv.last_message_body}
        </Text>
      </View>
      <View style={styles.rightColumn}>
        {isUnread && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{conv.unread_count}</Text>
          </View>
        )}
        <View style={styles.notificationAction}>
          <Text style={styles.viewChatText}>View Chat</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  notificationItem: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  notificationContent: { flex: 1, marginRight: 10 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  notificationText: { color: COLORS.accent, fontSize: 16, fontWeight: "bold" },
  subText: {
    color: COLORS.mutedForeground,
    fontSize: 12,
    fontWeight: "normal",
  },
  dateText: { color: COLORS.mutedForeground, fontSize: 12 },
  carText: { color: COLORS.foreground, fontSize: 14, marginTop: 2 },
  boldText: { fontWeight: "bold" },
  lastMessage: {
    color: COLORS.mutedForeground,
    fontSize: 13,
    marginTop: 6,
  },
  unreadMessage: {
    color: COLORS.foreground,
    fontWeight: "bold",
  },
  notificationAction: {},
  rightColumn: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 6,
  },
  unreadBadge: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
  },
  unreadText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  viewChatText: { color: COLORS.accent, fontWeight: "600" },
});

export default ConversationItem;
