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
  accent: "#A370F7",
  mutedForeground: "#8A94A3",
  border: "#313843",
};

const FAQ_ITEMS = [
  {
    question: "How do I find a car?",
    answer:
      "You can browse listings directly or use Find Car to submit a request. Dealers can then respond with offers that match what you are looking for.",
  },
  {
    question: "What happens after I request a car?",
    answer:
      "Your request appears in My Requests. Dealers can submit offers, answer your questions, and you can compare offers before accepting one.",
  },
  {
    question: "Can I rent cars on OnlyCars?",
    answer:
      "Yes. Rental listings are shown in the Rentals tab. Rental-company listings include direct contact details so you can arrange availability and pickup.",
  },
  {
    question: "How do dealer messages work?",
    answer:
      "Buyers can send a limited number of free messages. Dealers can unlock a conversation with points when they want to continue the discussion.",
  },
  {
    question: "Can buyers and dealers exchange phone numbers in chat?",
    answer:
      "Regular listing chats are moderated to reduce direct contact sharing before a deal is accepted. Accepted deals show the needed contact details in the deal summary.",
  },
  {
    question: "How do trade-in requests work?",
    answer:
      "A buyer submits their vehicle for trade-in. After approval, dealers can send trade-in offers with vehicle details, images, and any cash add-on.",
  },
  {
    question: "Why does a listing need admin approval?",
    answer:
      "Admin approval helps keep listings accurate, active, and safer for buyers. Dealers and rental companies can still manage their own submitted listings.",
  },
  {
    question: "How do dealer points work?",
    answer:
      "Dealers and rental companies use points for platform actions such as unlocking chats or submitting certain responses. More points can be requested from the dashboard.",
  },
];

const FAQScreen = () => {
  const router = useRouter();
  const { user } = useAuth() as any;
  const [name, setName] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(tabs)" as any);
  };

  const handleSubmitQuestion = async () => {
    if (!question.trim()) {
      showNativeFlowAlert("Question Required", "Please enter your question.");
      return;
    }

    setSubmitting(true);
    try {
      await submitSupportQuestion({
        name: name.trim(),
        email: email.trim(),
        question: question.trim(),
      });
      setQuestion("");
      showNativeFlowAlert(
        "Question Sent",
        "Your question has been sent to the OnlyCars team."
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
        <Text style={styles.headerTitle}>FAQ</Text>
        <View style={styles.headerSpacer} />
      </View>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <Text style={styles.title}>Frequently Asked Questions</Text>
            <Text style={styles.subtitle}>
              Quick answers for buying, renting, dealer offers, messages, and
              trade-ins on OnlyCars.
            </Text>
          </View>

          <View style={styles.list}>
            {FAQ_ITEMS.map((item) => (
              <View key={item.question} style={styles.card}>
                <Text style={styles.question}>{item.question}</Text>
                <Text style={styles.answer}>{item.answer}</Text>
              </View>
            ))}
          </View>

          <View style={styles.askCard}>
            <Text style={styles.askTitle}>Still have a question?</Text>
            <Text style={styles.askSubtitle}>
              Send it to the OnlyCars team and an admin will review it.
            </Text>

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
              style={styles.questionInput}
              value={question}
              onChangeText={setQuestion}
              placeholder="Write your question..."
              placeholderTextColor={COLORS.mutedForeground}
              multiline
              textAlignVertical="top"
            />
            <Pressable
              style={[
                styles.submitButton,
                submitting && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmitQuestion}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Send Question</Text>
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
  headerSpacer: {
    width: 44,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    width: "100%",
    maxWidth: 980,
    alignSelf: "center",
    padding: 20,
    paddingBottom: 42,
  },
  hero: {
    marginBottom: 20,
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
    maxWidth: 680,
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
  },
  question: {
    color: COLORS.foreground,
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 8,
  },
  answer: {
    color: COLORS.mutedForeground,
    fontSize: 15,
    lineHeight: 22,
  },
  askCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    marginTop: 18,
  },
  askTitle: {
    color: COLORS.foreground,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },
  askSubtitle: {
    color: COLORS.mutedForeground,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
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
  questionInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    color: COLORS.foreground,
    fontSize: 16,
    minHeight: 118,
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
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
});

export default FAQScreen;
