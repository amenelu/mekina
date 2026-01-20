import React, { useState, useEffect, useCallback } from "react";
import ConversationItem from "../_components/ConversationItem";

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  RefreshControl,
} from "react-native";
import axios from "axios";
import { useAuth } from "@/hooks/useAuth";
import API_BASE_URL from "@/constants/Api";
import { useSocket } from "../../contexts/SocketContext";

const COLORS = {
  background: "#14181F",
  card: "#1C212B",
  text: "#F8F8F8",
  textSecondary: "#8A94A3",
  accent: "#A370F7",
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
  unread_count?: number;
  lead_score?: number;
}

const MessagesScreen = () => {
  const { token } = useAuth();
  const { socket } = useSocket();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const fetchMessages = async (isRefresh = false) => {
    if (!token) return;
    if (!isRefresh) setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/my-messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConversations(response.data.conversations);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [token]);

  useEffect(() => {
    if (socket) {
      const handleConversationUpdate = () => {
        console.log("Received conversation_list_update, refetching...");
        fetchMessages();
      };

      socket.on("conversation_list_update", handleConversationUpdate);

      return () => {
        socket.off("conversation_list_update", handleConversationUpdate);
      };
    }
  }, [socket]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMessages(true);
  };

  if (loading && !refreshing) {
    return <ActivityIndicator size="large" style={styles.centered} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Messages</Text>
      </View>
      <FlatList
        data={conversations}
        renderItem={({ item }) => (
          <View>
            <ConversationItem conv={item} />
            {item.lead_score !== undefined && (
              <View style={styles.leadScoreBadge}>
                <Text style={styles.leadScoreText}>
                  Score: {item.lead_score}
                </Text>
              </View>
            )}
          </View>
        )}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={
          <Text style={styles.emptyText}>You have no messages yet.</Text>
        }
        contentContainerStyle={{ padding: 20 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
          />
        }
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
  leadScoreBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
  },
  leadScoreText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
});

export default MessagesScreen;
