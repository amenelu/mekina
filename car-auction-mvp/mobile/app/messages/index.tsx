import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
  useWindowDimensions,
  Pressable,
} from "react-native";
import { Stack, router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "../../contexts/SocketContext";
import ConversationItem from "@/components/_components/ConversationItem";
import { getMyMessages } from "@/lib/api/messages";
import { LOGIN_ROUTE, PUBLIC_HOME_ROUTE } from "@/lib/roleRoutes";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  mutedForeground: "#8A94A3",
  border: "#313843",
};

const MessagesScreen = () => {
  const { token, isLoading, hasHydrated } = useAuth() as any;
  const { socket, refreshCounts } = useSocket();
  const { width } = useWindowDimensions();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isWideWeb = Platform.OS === "web" && width >= 1000;

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

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(PUBLIC_HOME_ROUTE as any);
    }
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
      <View style={styles.container}>
        <View style={styles.screenHeader}>
          <Pressable
            onPress={handleBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={28} color={COLORS.foreground} />
          </Pressable>
          <Text style={styles.screenHeaderTitle}>My Messages</Text>
          <View style={styles.headerSpacer} />
        </View>
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
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "My Messages",
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={28} color={COLORS.foreground} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.screenHeader}>
          <Pressable
            onPress={handleBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={28} color={COLORS.foreground} />
          </Pressable>
          <Text style={styles.screenHeaderTitle}>My Messages</Text>
          <View style={styles.headerSpacer} />
        </View>
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
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
  screenHeader: {
    minHeight: 60,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  screenHeaderTitle: {
    flex: 1,
    color: COLORS.foreground,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  headerSpacer: {
    width: 44,
  },
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
  backButton: {
    width: 44,
    height: 44,
    alignItems: "flex-start",
    justifyContent: "center",
  },
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
