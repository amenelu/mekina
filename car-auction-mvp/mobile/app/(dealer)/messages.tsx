import React, { useState, useCallback } from "react";
import ConversationItem from "@/components/_components/ConversationItem";

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "../../contexts/SocketContext";
import { getMyMessages } from "@/lib/api/messages";
import { useFocusEffect } from "expo-router";

const COLORS = {
  background: "#14181F",
  card: "#1C212B",
  text: "#F8F8F8",
  textSecondary: "#8A94A3",
  accent: "#6118D7",
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
  const { width } = useWindowDimensions();
  const { token } = useAuth();
  const { socket, refreshCounts } = useSocket();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const isWideWeb = Platform.OS === "web" && width >= 1000;

  const fetchMessages = useCallback(async (options?: {
    isRefresh?: boolean;
    refreshBadges?: boolean;
  }) => {
    if (!token) return;
    const isRefresh = options?.isRefresh ?? false;
    if (!isRefresh) setLoading(true);
    try {
      const response = await getMyMessages();
      setConversations(response.data.conversations);
      if (options?.refreshBadges) {
        await refreshCounts();
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, [refreshCounts, token]);

  useFocusEffect(
    useCallback(() => {
      fetchMessages({ refreshBadges: true });
    }, [fetchMessages])
  );

  useFocusEffect(
    useCallback(() => {
      if (!socket) return;

      const handleConversationUpdate = () => {
        fetchMessages();
      };
      socket.on("conversation_list_update", handleConversationUpdate);
      socket.on("new_chat_message", handleConversationUpdate);

      return () => {
        socket.off("conversation_list_update", handleConversationUpdate);
        socket.off("new_chat_message", handleConversationUpdate);
      };
    }, [fetchMessages, socket])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchMessages({ isRefresh: true, refreshBadges: true });
  };

  if (loading && !refreshing) {
    return <ActivityIndicator size="large" style={styles.centered} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, isWideWeb && styles.headerWide]}>
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
        contentContainerStyle={[
          styles.listContent,
          isWideWeb && styles.listContentWide,
        ]}
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
  headerWide: {
    maxWidth: 1040,
    width: "100%",
    alignSelf: "center",
    paddingTop: 36,
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: COLORS.text },
  listContent: { padding: 20 },
  listContentWide: {
    maxWidth: 1040,
    width: "100%",
    alignSelf: "center",
    paddingTop: 10,
  },
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
