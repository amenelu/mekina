import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "../../contexts/SocketContext";
import ConversationItem from "@/components/_components/ConversationItem";
import { getMyMessages } from "@/lib/api/messages";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  mutedForeground: "#8A94A3",
  border: "#313843",
};

const MessagesScreen = () => {
  const { token } = useAuth();
  const { socket, refreshCounts } = useSocket();
  const { width } = useWindowDimensions();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isWideWeb = Platform.OS === "web" && width >= 1000;

  const fetchConversations = useCallback(async () => {
    if (!token) return;
    try {
      const response = await getMyMessages();
      setConversations(response.data.conversations);
      refreshCounts();
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshCounts, token]);

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [fetchConversations])
  );

  useEffect(() => {
    if (socket) {
      const handleConversationUpdate = () => {
        fetchConversations();
      };

      socket.on("conversation_list_update", handleConversationUpdate);
      socket.on("message_count_update", handleConversationUpdate);
      socket.on("new_chat_message", handleConversationUpdate);

      return () => {
        socket.off("conversation_list_update", handleConversationUpdate);
        socket.off("message_count_update", handleConversationUpdate);
        socket.off("new_chat_message", handleConversationUpdate);
      };
    }
  }, [fetchConversations, socket]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  return (
    <>
      <Stack.Screen options={{ title: "My Messages" }} />
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={[styles.content, isWideWeb && styles.contentWide]}>
          {isWideWeb && (
            <View style={styles.pageIntro}>
              <Text style={styles.pageTitle}>My Messages</Text>
              <Text style={styles.pageSubtitle}>
                Continue active conversations with sellers and dealers.
              </Text>
            </View>
          )}
          <View style={styles.notificationList}>
            {loading && !refreshing ? (
              <ActivityIndicator size="large" color={COLORS.accent} />
            ) : conversations.length > 0 ? (
              conversations.map((conv) => (
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
  notificationList: { gap: 10 },
  noItemsText: {
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginTop: 40,
  },
});

export default MessagesScreen;
