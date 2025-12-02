import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
} from "react-native";
import { Stack, Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  mutedForeground: "#8A94A3",
  border: "#313843",
  success: "#28a745",
  warning: "#ffc107",
};

// --- Mock Data ---
const stats = {
  points: 15,
  activeListings: 3,
  newRequests: 2,
  unansweredQuestions: 1,
};

const customerRequests = [
  {
    id: "req1",
    make: "Toyota",
    model: "RAV4",
    min_year: 2022,
    notes: "Looking for a recent model, preferably hybrid...",
    bid_count: 3,
    lowest_offer: 3400000,
    is_new: true,
  },
  {
    id: "req2",
    make: "Ford",
    model: "Ranger",
    min_year: 2020,
    notes: "Must be a 4x4 pickup truck for work purposes.",
    bid_count: 1,
    lowest_offer: 2800000,
    is_new: false,
  },
];

const myListings = [
  {
    id: "car1",
    year: 2022,
    make: "Hyundai",
    model: "Ioniq 5",
    is_approved: true,
    is_active: true,
    status: "Live",
  },
  {
    id: "car2",
    year: 2021,
    make: "Volkswagen",
    model: "ID.4",
    is_approved: false,
    is_active: false,
    status: "Pending Approval",
  },
];

const unansweredQuestions = [
  {
    id: "q1",
    question_text: "Does this offer include free shipping?",
    request_id: "req1",
    offer_price: 3500000,
  },
];

const TabButton = ({ title, activeTab, handlePress }: any) => (
  <Pressable onPress={handlePress}>
    <Text style={[styles.tabLink, activeTab === title && styles.tabLinkActive]}>
      {title}
    </Text>
  </Pressable>
);

const DealerDashboardScreen = () => {
  const [activeTab, setActiveTab] = useState("Requests");

  const renderContent = () => {
    switch (activeTab) {
      case "Requests":
        return (
          <View style={styles.tabContent}>
            {customerRequests.map((req) => (
              <View
                key={req.id}
                style={[styles.requestCard, req.is_new && styles.newRequest]}
              >
                <Text style={styles.cardTitle}>
                  {req.make} {req.model} ({req.min_year}+)
                </Text>
                <Text style={styles.cardNotes}>{req.notes}</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.footerStat}>
                    Bidders: {req.bid_count}
                  </Text>
                  <Text style={styles.footerStat}>
                    Lowest: {req.lowest_offer.toLocaleString()} ETB
                  </Text>
                  <Pressable style={styles.actionButton}>
                    <Text style={styles.actionButtonText}>Place Offer</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        );
      case "My Listings":
        return (
          <View style={styles.tabContent}>
            {myListings.map((car) => (
              <View key={car.id} style={styles.listingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>
                    {car.year} {car.make} {car.model}
                  </Text>
                  <Text
                    style={{
                      color: car.is_approved ? COLORS.success : COLORS.warning,
                    }}
                  >
                    {car.status}
                  </Text>
                </View>
                <Switch
                  value={car.is_active}
                  trackColor={{ false: "#767577", true: COLORS.accent }}
                />
              </View>
            ))}
          </View>
        );
      case "Questions":
        return (
          <View style={styles.tabContent}>
            {unansweredQuestions.map((q) => (
              <View key={q.id} style={styles.requestCard}>
                <Text style={styles.cardNotes}>"{q.question_text}"</Text>
                <Text style={styles.cardMeta}>
                  Regarding your offer for Request #{q.request_id}
                </Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.footerStat}>
                    Your Offer: {q.offer_price.toLocaleString()} ETB
                  </Text>
                  <Pressable style={styles.actionButton}>
                    <Text style={styles.actionButtonText}>Answer</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: "Dealer Dashboard" }} />
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dealer Dashboard</Text>
          <Text style={styles.headerSubtitle}>Welcome back, Dealer!</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.points}</Text>
            <Text style={styles.statLabel}>Your Points</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.activeListings}</Text>
            <Text style={styles.statLabel}>Active Listings</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.newRequests}</Text>
            <Text style={styles.statLabel}>New Requests</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.unansweredQuestions}</Text>
            <Text style={styles.statLabel}>Unanswered</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TabButton
            title="Requests"
            activeTab={activeTab}
            handlePress={() => setActiveTab("Requests")}
          />
          <TabButton
            title="My Listings"
            activeTab={activeTab}
            handlePress={() => setActiveTab("My Listings")}
          />
          <TabButton
            title="Questions"
            activeTab={activeTab}
            handlePress={() => setActiveTab("Questions")}
          />
        </View>

        {/* Tab Content */}
        {renderContent()}
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 20, backgroundColor: COLORS.card },
  headerTitle: { fontSize: 28, fontWeight: "bold", color: COLORS.foreground },
  headerSubtitle: { fontSize: 16, color: COLORS.mutedForeground, marginTop: 4 },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 20,
  },
  statCard: { alignItems: "center", flex: 1 },
  statValue: { fontSize: 24, fontWeight: "bold", color: COLORS.accent },
  statLabel: {
    fontSize: 14,
    color: COLORS.mutedForeground,
    marginTop: 4,
    textAlign: "center",
  },
  tabsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 10,
  },
  tabLink: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    color: COLORS.mutedForeground,
    fontSize: 16,
    fontWeight: "500",
  },
  tabLinkActive: {
    color: COLORS.accent,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accent,
  },
  tabContent: { padding: 20, gap: 20 },
  requestCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  newRequest: { borderColor: COLORS.accent, borderWidth: 2 },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.foreground,
    padding: 15,
  },
  cardNotes: {
    color: COLORS.mutedForeground,
    fontSize: 15,
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  cardMeta: {
    color: COLORS.mutedForeground,
    fontSize: 14,
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: "#181D25",
  },
  footerStat: { color: COLORS.mutedForeground },
  actionButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  actionButtonText: { color: COLORS.foreground, fontWeight: "bold" },
  listingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.card,
    padding: 15,
    borderRadius: 12,
  },
});

export default DealerDashboardScreen;
