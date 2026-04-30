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
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "../../contexts/SocketContext";
import axios from "axios";
import API_URL from "@/constants/Api";

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
  const { token, user } = useAuth() as any;
  const { socket } = useSocket();
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const fetchConversation = useCallback(async () => {
    if (!token || !id) return;
    try {
      const response = await axios.get(`${API_URL}/api/my-messages/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConversation(response.data.conversation);
      setMessages(response.data.messages);
    } catch (error) {
      console.error("Failed to fetch conversation:", error);
      Alert.alert("Error", "Could not load chat history.");
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    fetchConversation();

    if (socket && id) {
      const conversationRoom = `conversation_${id}`;
      socket.emit("join_conversation", { room: conversationRoom });

      const handleNewMessage = (newMessage: any) => {
        setMessages((prevMessages) => [...prevMessages, newMessage]);
      };

      socket.on("new_chat_message", handleNewMessage);

      // Cleanup on unmount or when id/socket changes
      return () => {
        socket.off("new_chat_message", handleNewMessage);
      };
    }
  }, [fetchConversation, id, socket]);

  const handleSend = async () => {
    if (!inputText.trim() || !conversation) return;
    if (!token) {
      Alert.alert("Error", "You are not logged in.");
      return;
    }
    setSending(true);
    try {
      const response = await axios.post(
        `${API_URL}/chat/send`,
        {
          car_id: conversation.car.id,
          message: inputText,
        },
        { headers: { Authorization: `Bearer ${token.trim()}` } }
      );

      if (response.data.status === "success") {
        setInputText("");
        // The new message will be received via the socket listener,
        // so no need to manually update state here.
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: conversation?.other_party?.username || "Chat",
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <ScrollView
          style={styles.chatHistory}
          ref={scrollViewRef}
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
        >
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
        <View style={styles.inputArea}>
          <TextInput
            style={styles.textInput}
            placeholder="Type your reply..."
            placeholderTextColor={COLORS.mutedForeground}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <Pressable
            style={styles.sendButton}
            onPress={handleSend}
            disabled={sending}
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
  chatHistory: {
    flex: 1,
    padding: 10,
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
  textInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: COLORS.foreground,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default ConversationDetailScreen;
