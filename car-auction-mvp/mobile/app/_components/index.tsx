import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { Link, Stack } from "expo-router";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  mutedForeground: "#8A94A3",
  border: "#313843",
};

// Mock data based on buyer_messages.html
const mockConversations = [
  {
    id: "conv1",
    dealer: { username: "Prestige Auto" },
    car: { year: 2022, make: "Hyundai", model: "Ioniq 5" },
    created_at: "Oct 28, 2023",
  },
  {
    id: "conv2",
    dealer: { username: "Addis Cars" },
    car: { year: 2023, make: "Toyota", model: "RAV4" },
    created_at: "Oct 25, 2023",
  },
];

const ConversationItem = ({
  conv,
}: {
  conv: (typeof mockConversations)[0];
}) => (
  <Link href={`/messages/${conv.id}`} asChild>
    <Pressable style={styles.notificationItem}>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationText}>
          Conversation with{" "}
          <Text style={styles.boldText}>{conv.dealer.username}</Text> about{" "}
          <Text style={styles.boldText}>
            {conv.car.year} {conv.car.make} {conv.car.model}
          </Text>
        </Text>
        <Text style={styles.notificationTime}>
          Started on: {conv.created_at}
        </Text>
      </View>
      <View style={styles.notificationAction}>
        <Text style={styles.viewChatText}>View Chat</Text>
      </View>
    </Pressable>
  </Link>
);

const MessagesScreen = () => {
  return (
    <>
      <Stack.Screen options={{ title: "My Messages" }} />
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.pageDescription}>
            Here are all your conversations with dealers.
          </Text>
          <View style={styles.notificationList}>
            {mockConversations.length > 0 ? (
              mockConversations.map((conv) => (
                <ConversationItem key={conv.id} conv={conv} />
              ))
            ) : (
              <Text style={styles.noItemsText}>
                You have not started any conversations yet.
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
  pageDescription: {
    color: COLORS.mutedForeground,
    fontSize: 16,
    marginBottom: 20,
  },
  notificationList: { gap: 10 },
  notificationItem: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  notificationContent: { flex: 1, marginRight: 10 },
  notificationText: { color: COLORS.foreground, fontSize: 16, lineHeight: 24 },
  boldText: { fontWeight: "bold" },
  notificationTime: {
    color: COLORS.mutedForeground,
    fontSize: 12,
    marginTop: 4,
  },
  notificationAction: {},
  viewChatText: { color: COLORS.accent, fontWeight: "600" },
  noItemsText: {
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginTop: 40,
  },
});

export default MessagesScreen;
