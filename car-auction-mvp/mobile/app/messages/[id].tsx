import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  mutedForeground: "#8A94A3",
  border: "#313843",
};

// Mock data for a single conversation
const mockConversation = {
  id: "conv1",
  dealer: { username: "Prestige Auto" },
  car: { year: 2022, make: "Hyundai", model: "Ioniq 5" },
  messages: [
    {
      id: "m1",
      sender_id: "user",
      body: "Is this car still available?",
      timestamp: "Oct 28, 10:30",
    },
    {
      id: "m2",
      sender_id: "dealer",
      body: "Yes, it is! Would you like to schedule a viewing?",
      timestamp: "Oct 28, 10:32",
    },
    {
      id: "m3",
      sender_id: "user",
      body: "Great. How about tomorrow afternoon?",
      timestamp: "Oct 28, 10:35",
    },
  ],
};

const ConversationDetailScreen = () => {
  const { id } = useLocalSearchParams();
  const conversation = mockConversation; // In a real app, fetch conversation by id

  return (
    <>
      <Stack.Screen
        options={{
          title: `Chat with ${conversation.dealer.username}`,
        }}
      />
      <View style={styles.container}>
        <ScrollView style={styles.chatHistory}>
          {conversation.messages.map((message) => {
            const isSentByMe = message.sender_id === "user";
            return (
              <View
                key={message.id}
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
                  <Text style={styles.messageTime}>{message.timestamp}</Text>
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
          />
          <Pressable style={styles.sendButton}>
            <Ionicons name="send" size={22} color={COLORS.foreground} />
          </Pressable>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
