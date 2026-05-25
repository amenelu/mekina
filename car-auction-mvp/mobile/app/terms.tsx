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
    title: "Use of the platform",
    body:
      "mekina helps buyers, dealers, and rental companies discover vehicles, submit requests, compare offers, and communicate around listings. Users are responsible for keeping account information accurate and using the platform honestly.",
  },
  {
    title: "Listings and offers",
    body:
      "Vehicle listings, rental listings, dealer offers, and trade-in offers should be accurate and not misleading. Admin review may be required before listings or requests become visible to other users.",
  },
  {
    title: "Communication",
    body:
      "Messages may be monitored for safety, fraud prevention, and platform policy enforcement. Users should not misuse messaging, send abusive content, or attempt to bypass platform protections.",
  },
  {
    title: "Transactions",
    body:
      "mekina helps parties connect, but final inspection, payment, transfer, pickup, and legal paperwork remain the responsibility of the buyer, seller, dealer, or rental company involved.",
  },
  {
    title: "Account actions",
    body:
      "Accounts, listings, messages, or offers may be limited, removed, or reviewed if they appear unsafe, fraudulent, inaccurate, or harmful to other users.",
  },
  {
    title: "Changes",
    body:
      "These terms may be updated as the product changes. Continued use of the platform means you accept the latest version shown here.",
  },
];

const TermsScreen = () => {
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
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Terms & Conditions</Text>
        <Text style={styles.subtitle}>
          The practical rules for using mekina as a buyer, dealer, rental
          company, or admin-managed seller.
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

export default TermsScreen;
