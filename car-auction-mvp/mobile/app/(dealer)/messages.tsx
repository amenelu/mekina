import React, { useState, useEffect } from "react";
import ConversationItem from "../_components/ConversationItem";

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
  SafeAreaView,
} from "react-native";
import axios from "axios";
import { useAuth } from "@/hooks/useAuth";
import API_BASE_URL from "@/constants/Api";

const COLORS = {
  background: "#14181F",
  card: "#1C212B",
  text: "#F8F8F8",
  textSecondary: "#8A94A3",
};

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
}

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
        renderItem={({ item }) => <ConversationItem conv={item} />}
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
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 30,
  },
});

export default MessagesScreen;
