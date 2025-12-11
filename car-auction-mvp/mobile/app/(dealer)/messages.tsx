import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";
import { useAuth } from "@/hooks/useAuth";
import { API_BASE_URL } from "@/apiConfig";

const COLORS = {
  background: "#14181F",
  card: "#1C212B",
  text: "#F8F8F8",
  textSecondary: "#8A94A3",
};

interface Conversation {
  id: number;
  buyer: { username: string };
  car: { year: number; make: string; model: string };
  created_at: string;
}

const MessageItem = ({ item }: { item: Conversation }) => (
  <Pressable style={styles.itemCard}>
    <Text style={styles.itemTitle}>Chat with {item.buyer.username}</Text>
    <Text style={styles.itemSubtitle}>
      Regarding: {item.car.year} {item.car.make} {item.car.model}
    </Text>
    <Text style={styles.itemNotes}>
      Started on: {new Date(item.created_at).toLocaleDateString()}
    </Text>
    <View style={styles.viewChatButton}>
      <Text style={styles.buttonText}>View Chat</Text>
    </View>
  </Pressable>
);

const MessagesScreen = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!token) return;
      try {
        const response = await axios.get(`${API_BASE_URL}/api/my-messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setConversations(response.data.conversations);
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, [token]);

  if (loading) {
    return <ActivityIndicator size="large" style={styles.centered} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Messages</Text>
      </View>
      <FlatList
        data={conversations}
        renderItem={({ item }) => <MessageItem item={item} />}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={
          <Text style={styles.emptyText}>You have no messages yet.</Text>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  header: { padding: 20 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: COLORS.text },
  itemCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 15,
    borderRadius: 8,
  },
  itemTitle: { fontSize: 16, fontWeight: "bold", color: COLORS.text },
  itemSubtitle: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4 },
  itemNotes: { color: COLORS.textSecondary, marginTop: 8 },
  viewChatButton: {
    backgroundColor: "rgba(138, 148, 163, 0.5)",
    alignSelf: "flex-start",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 12,
  },
  buttonText: { color: "white", fontWeight: "bold" },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 30,
  },
});

export default MessagesScreen;
