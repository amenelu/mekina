import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "../../contexts/SocketContext";
import { getConversation, sendChatMessage } from "@/lib/api/messages";
import { unlockDealerConversation } from "@/lib/api/dealer";
import { LOGIN_ROUTE } from "@/lib/roleRoutes";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  mutedForeground: "#8A94A3",
  border: "#313843",
};

const ConversationDetailScreen = () => {
  const { id } = useLocalSearchParams();
  const { token, user, login, isLoading, hasHydrated } = useAuth() as any;
  const { socket, refreshCounts } = useSocket();
  const { width } = useWindowDimensions();
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const isWideWeb = Platform.OS === "web" && width >= 1000;

  const fetchConversation = useCallback(async () => {
    if (!token || !id) {
      setLoading(false);
      return;
    }
    try {
      const response = await getConversation(String(id));
      setConversation(response.data.conversation);
      setMessages(response.data.messages);
      refreshCounts();
    } catch (error) {
      console.error("Failed to fetch conversation:", error);
      Alert.alert("Error", "Could not load chat history.");
    } finally {
      setLoading(false);
    }
  }, [id, refreshCounts, token]);

  useEffect(() => {
    fetchConversation();

    if (socket && id) {
      const conversationRoom = `conversation_${id}`;
      socket.emit("join_conversation", { room: conversationRoom });

      const handleNewMessage = (newMessage: any) => {
        if (newMessage.sender?.id !== user?.id) {
          fetchConversation();
          return;
        }
        setMessages((prevMessages) => [...prevMessages, newMessage]);
        refreshCounts();
      };

      socket.on("new_chat_message", handleNewMessage);

      // Cleanup on unmount or when id/socket changes
      return () => {
        socket.off("new_chat_message", handleNewMessage);
      };
    }
  }, [fetchConversation, id, refreshCounts, socket, user?.id]);

  const handleSend = async () => {
    if (!inputText.trim() || !conversation) return;
    if (!token) {
      Alert.alert("Error", "You are not logged in.");
      return;
    }
    const outgoingText = inputText.trim();
    setSending(true);
    try {
      const response = await sendChatMessage({
        car_id: conversation.car.id,
        conversation_id: conversation.id,
        body: outgoingText,
      });

      if (response.data.status === "success") {
        setInputText("");
        if (response.data.conversation) {
          setConversation(response.data.conversation);
        }
        if (response.data.chat_message) {
          setMessages((prevMessages) => {
            const alreadyAdded = prevMessages.some(
              (message) => message.id === response.data.chat_message.id
            );
            return alreadyAdded
              ? prevMessages
              : [...prevMessages, response.data.chat_message];
          });
        }
        refreshCounts();
      } else if (response.data.status === "limit_reached") {
        Alert.alert("Limit Reached", response.data.message);
      }
    } catch (error: any) {
      console.error("Failed to send message:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to send message.";
      Alert.alert("Error", errorMessage);
    } finally {
      setSending(false);
    }
  };

  const handleUnlockConversation = async () => {
    if (!conversation || unlocking) return;
    setUnlocking(true);
    try {
      const response = await unlockDealerConversation(conversation.id);
      if (response.data.conversation) {
        setConversation(response.data.conversation);
      }
      if (response.data.messages) {
        setMessages(response.data.messages);
      }
      if (
        typeof response.data.dealer_points === "number" &&
        user &&
        token &&
        login
      ) {
        login({ ...user, points: response.data.dealer_points }, token);
      }
      Alert.alert("Unlocked", response.data.message || "Conversation unlocked.");
    } catch (error: any) {
      console.error("Failed to unlock conversation:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to unlock conversation.";
      Alert.alert("Unlock Failed", errorMessage);
    } finally {
      setUnlocking(false);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "";
    try {
      const timeString = date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      return timeString === "Invalid Date" ? "" : timeString;
    } catch {
      return "";
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
      <>
        <View style={styles.loginPrompt}>
          <Text style={styles.loginPromptText}>
            Please log in to view this conversation.
          </Text>
          <Pressable
            testID="message-detail-login-button"
            style={styles.loginButton}
            onPress={() => router.push(LOGIN_ROUTE as any)}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </Pressable>
        </View>
      </>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  const isDealer = Boolean(user?.is_dealer);
  const isLocked = conversation && !conversation.is_unlocked;
  const freeLimit = conversation?.free_message_limit ?? 3;
  const buyerMessageCount = conversation?.buyer_message_count ?? 0;
  const remainingBuyerMessages = Math.max(0, freeLimit - buyerMessageCount);
  const buyerLimitReached = !isDealer && isLocked && remainingBuyerMessages <= 0;
  const leadScore = conversation?.lead_score ?? 0;
  const canUnlock =
    isDealer && isLocked && conversation?.can_unlock && (user?.points ?? 0) > 0;

  return (
    <>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <ScrollView
          style={[styles.chatHistory, isWideWeb && styles.chatHistoryWide]}
          ref={scrollViewRef}
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
        >
          {conversation?.is_unlocked && (
            <View style={[styles.limitNotice, styles.unlockedNotice]}>
              <View style={[styles.limitNoticeIcon, styles.unlockedNoticeIcon]}>
                <Ionicons name="lock-open" size={18} color={COLORS.foreground} />
              </View>
              <View style={styles.limitNoticeTextWrap}>
                <Text style={styles.limitNoticeTitle}>Chat unlocked</Text>
                <Text style={styles.limitNoticeText}>
                  Messages are fully unlocked for this conversation.
                </Text>
              </View>
            </View>
          )}
          {isLocked && (
            <View style={styles.limitNotice}>
              <View style={styles.limitNoticeIcon}>
                <Ionicons
                  name={isDealer ? "lock-closed" : "chatbubble-ellipses"}
                  size={18}
                  color={COLORS.foreground}
                />
              </View>
              <View style={styles.limitNoticeTextWrap}>
                <Text style={styles.limitNoticeTitle}>
                  {isDealer
                    ? "Unlock full chat for 1 point"
                    : `${freeLimit} free messages before dealer unlock`}
                </Text>
                <Text style={styles.limitNoticeText}>
                  {isDealer
                    ? `Score: ${leadScore}. Buyer has used ${buyerMessageCount}/${freeLimit} free messages. Unlocking reveals full buyer messages and removes the limit.`
                    : buyerLimitReached
                      ? "You have reached the free message limit. The dealer must unlock this chat before you can send more messages."
                      : `${remainingBuyerMessages} message${remainingBuyerMessages === 1 ? "" : "s"} remaining before the dealer must unlock this chat.`}
                </Text>
              </View>
              {isDealer && (
                <Pressable
                  style={[
                    styles.unlockButton,
                    (!canUnlock || unlocking) && styles.unlockButtonDisabled,
                  ]}
                  onPress={handleUnlockConversation}
                  disabled={!canUnlock || unlocking}
                >
                  {unlocking ? (
                    <ActivityIndicator color={COLORS.foreground} size="small" />
                  ) : (
                    <Text style={styles.unlockButtonText}>
                      {(user?.points ?? 0) > 0 ? "Unlock" : "No Points"}
                    </Text>
                  )}
                </Pressable>
              )}
            </View>
          )}
          {messages.map((message, index) => {
            const isSentByMe = message.sender?.id === user?.id;
            return (
              <View
                key={message.id || index}
                style={[
                  styles.messageWrapper,
                  isSentByMe ? styles.sentWrapper : styles.receivedWrapper,
                ]}
              >
                <View
                  style={[
                    styles.chatMessage,
                    isSentByMe ? styles.sentMessage : styles.receivedMessage,
                  ]}
                >
                  <Text style={styles.messageBody}>{message.body}</Text>
                  <Text
                    style={[
                      styles.messageTime,
                      isSentByMe ? styles.sentMessageTime : null,
                    ]}
                  >
                    {formatMessageTime(message.timestamp)}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
        <View style={[styles.inputArea, isWideWeb && styles.inputAreaWide]}>
          <TextInput
            style={styles.textInput}
            placeholder="Type your reply..."
            placeholderTextColor={COLORS.mutedForeground}
            value={inputText}
            onChangeText={setInputText}
            multiline
            autoCorrect
            editable={!buyerLimitReached && !sending}
          />
          <Pressable
            style={[
              styles.sendButton,
              (buyerLimitReached || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={sending || buyerLimitReached}
          >
            {sending ? (
              <ActivityIndicator color={COLORS.foreground} size="small" />
            ) : (
              <Ionicons name="send" size={22} color={COLORS.foreground} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
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
  chatHistory: {
    flex: 1,
    padding: 10,
  },
  chatHistoryWide: {
    maxWidth: 980,
    width: "100%",
    alignSelf: "center",
    paddingTop: 24,
  },
  limitNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#252A35",
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  limitNoticeIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  unlockedNotice: {
    borderColor: "#2E7D5B",
  },
  unlockedNoticeIcon: {
    backgroundColor: "#2E7D5B",
  },
  limitNoticeTextWrap: {
    flex: 1,
  },
  limitNoticeTitle: {
    color: COLORS.foreground,
    fontSize: 14,
    fontWeight: "700",
  },
  limitNoticeText: {
    color: COLORS.mutedForeground,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  unlockButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 76,
    alignItems: "center",
  },
  unlockButtonDisabled: {
    opacity: 0.55,
  },
  unlockButtonText: {
    color: COLORS.foreground,
    fontSize: 12,
    fontWeight: "700",
  },
  messageWrapper: {
    marginVertical: 5,
    maxWidth: "80%",
  },
  sentWrapper: {
    alignSelf: "flex-end",
  },
  receivedWrapper: {
    alignSelf: "flex-start",
  },
  chatMessage: {
    padding: 12,
    borderRadius: 18,
  },
  sentMessage: {
    backgroundColor: COLORS.accent,
  },
  receivedMessage: {
    backgroundColor: COLORS.card,
  },
  messageBody: {
    color: COLORS.foreground,
    fontSize: 16,
  },
  messageTime: {
    color: COLORS.mutedForeground,
    fontSize: 11,
    marginTop: 4,
    textAlign: "right",
  },
  sentMessageTime: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  inputArea: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  inputAreaWide: {
    maxWidth: 980,
    width: "100%",
    alignSelf: "center",
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: COLORS.foreground,
    marginRight: 10,
    fontSize: 16,
    lineHeight: 20,
  },
  sendButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.55,
  },
});

export default ConversationDetailScreen;
