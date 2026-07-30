import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "../../contexts/SocketContext";
import ConversationItem from "@/components/_components/ConversationItem";
import { getMyMessages } from "@/lib/api/messages";
import { LOGIN_ROUTE } from "@/lib/roleRoutes";
import { resetMessagesHeaderTitle } from "@/lib/messagesHeaderTitle";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#6118D7",
  mutedForeground: "#8A94A3",
  border: "#313843",
};

const MessagesScreen = () => {
  const { token, isLoading, hasHydrated } = useAuth() as any;
  const { socket, refreshCounts } = useSocket();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = useCallback(async (options?: {
    refreshBadges?: boolean;
  }) => {
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const response = await getMyMessages();
      setConversations(response.data.conversations);
      if (options?.refreshBadges) {
        await refreshCounts();
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshCounts, token]);

  useFocusEffect(
    useCallback(() => {
      resetMessagesHeaderTitle();
      fetchConversations({ refreshBadges: true });
    }, [fetchConversations])
  );

  useFocusEffect(
    useCallback(() => {
      if (!socket) return;

      const handleConversationUpdate = () => {
        fetchConversations();
      };
      socket.on("conversation_list_update", handleConversationUpdate);
      socket.on("new_chat_message", handleConversationUpdate);

      return () => {
        socket.off("conversation_list_update", handleConversationUpdate);
        socket.off("new_chat_message", handleConversationUpdate);
      };
    }, [fetchConversations, socket])
  );

  const onRefresh = () => {
    if (!token) return;
    setRefreshing(true);
    fetchConversations({ refreshBadges: true });
  };

  if (!hasHydrated || isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (!token) {
    return (
      <>
        <View style={styles.loginPrompt}>
          <Text style={styles.loginPromptText}>
            Please log in to view your messages.
          </Text>
          <Pressable
            testID="messages-login-button"
            style={styles.loginButton}
            onPress={() => router.push(LOGIN_ROUTE as any)}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <>
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
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
  content: { padding: 20 },
  notificationList: { gap: 10 },
  noItemsText: {
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginTop: 40,
  },
  loginPrompt: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loginPromptText: {
    color: COLORS.mutedForeground,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 18,
  },
  loginButton: {
    minWidth: 180,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    paddingVertical: 13,
    paddingHorizontal: 20,
  },
  loginButtonText: {
    color: COLORS.foreground,
    fontSize: 16,
    fontWeight: "800",
  },
});

export default MessagesScreen;
