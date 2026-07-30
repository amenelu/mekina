import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { submitSupportQuestion } from "@/lib/api/support";
import { showNativeFlowAlert } from "@/lib/nativeFlowAlert";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#6118D7",
  mutedForeground: "#8A94A3",
  border: "#313843",
};

const ContactUsScreen = () => {
  const router = useRouter();
  const { user } = useAuth() as any;
  const [name, setName] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(tabs)" as any);
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      showNativeFlowAlert("Message Required", "Please enter your message.");
      return;
    }

    setSubmitting(true);
    try {
      await submitSupportQuestion({
        name: name.trim(),
        email: email.trim(),
        question: message.trim(),
      });
      setMessage("");
      showNativeFlowAlert(
        "Message Sent",
        "Your message has been sent to the mekina team."
      );
    } catch (error: any) {
      showNativeFlowAlert(
        "Could Not Send",
        error.userMessage || "Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={handleBackPress}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>Contact Us</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Contact Us</Text>
          <Text style={styles.subtitle}>
            Send a question, report an issue, or ask for help with a listing,
            request, rental, or trade-in.
          </Text>

          <View style={styles.card}>
            {!user && (
              <View style={styles.inputGrid}>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor={COLORS.mutedForeground}
                  autoCapitalize="words"
                />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email or phone"
                  placeholderTextColor={COLORS.mutedForeground}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            )}

            <TextInput
              style={styles.messageInput}
              value={message}
              onChangeText={setMessage}
              placeholder="How can we help?"
              placeholderTextColor={COLORS.mutedForeground}
              multiline
              textAlignVertical="top"
            />
            <Pressable
              style={[styles.submitButton, submitting && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Send Message</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 56,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    color: COLORS.foreground,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  headerSpacer: { width: 44 },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    width: "100%",
    maxWidth: 780,
    alignSelf: "center",
    padding: 20,
    paddingBottom: 42,
  },
  title: {
    color: COLORS.foreground,
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 10,
  },
  subtitle: {
    color: COLORS.mutedForeground,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
  },
  inputGrid: {
    gap: 10,
    marginBottom: 10,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    color: COLORS.foreground,
    fontSize: 16,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  messageInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    color: COLORS.foreground,
    fontSize: 16,
    minHeight: 150,
    padding: 12,
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: { opacity: 0.7 },
  submitButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
});

export default ContactUsScreen;
