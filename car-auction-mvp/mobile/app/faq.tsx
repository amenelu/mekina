import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";

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
    question: "Can I rent cars on mekina?",
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
  return (
    <>
      <Stack.Screen options={{ title: "FAQ" }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.title}>Frequently Asked Questions</Text>
          <Text style={styles.subtitle}>
            Quick answers for buying, renting, dealer offers, messages, and
            trade-ins on mekina.
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
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
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
});

export default FAQScreen;
