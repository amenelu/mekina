import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  mutedForeground: "#8A94A3",
  border: "#313843",
};

const SECTIONS = [
  {
    title: "Information we collect",
    body:
      "OnlyCars may collect account details, contact information, listing details, uploaded vehicle images, requests, offers, messages, ratings, and usage activity needed to run the marketplace.",
  },
  {
    title: "How information is used",
    body:
      "Information is used to show listings, connect buyers with dealers or rental companies, process requests and trade-ins, notify users, protect the platform, and improve the product.",
  },
  {
    title: "Messages and safety review",
    body:
      "Messages may be reviewed by admins to prevent unsafe behavior, fraud, abuse, or attempts to bypass platform protections before a deal is accepted.",
  },
  {
    title: "Contact information",
    body:
      "Buyer and dealer contact information is shown only where the product flow requires it, such as deal summaries or rental-company listing contact cards.",
  },
  {
    title: "Data access",
    body:
      "Admins may access account, listing, request, offer, and message information when needed for support, moderation, approval, or operational work.",
  },
  {
    title: "Your choices",
    body:
      "You can update account details from your profile. For account help, password issues, or questions about your information, use the Contact Us page.",
  },
];

const PrivacyScreen = () => {
  const router = useRouter();

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(tabs)" as any);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.subtitle}>
          How OnlyCars handles information across listings, requests, offers,
          rentals, messages, and support.
        </Text>
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.card}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.body}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
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
    maxWidth: 980,
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
    marginBottom: 18,
  },
  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    color: COLORS.foreground,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 8,
  },
  body: {
    color: COLORS.mutedForeground,
    fontSize: 15,
    lineHeight: 22,
  },
});

export default PrivacyScreen;
