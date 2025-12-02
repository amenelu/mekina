import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { Stack, Link } from "expo-router";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  mutedForeground: "#8A94A3",
  border: "#313843",
  success: "#28a745",
  edit: "#ffc107",
};

// --- Mock Data ---
const stats = {
  user_count: 125,
  active_auction_count: 12,
  for_sale_count: 25,
  for_rent_count: 8,
  pending_approval_count: 2,
};

const pendingCars = [
  {
    id: "car10",
    year: 2023,
    make: "Tesla",
    model: "Model 3",
    seller: "elon_m",
    listing_type: "Sale",
  },
  {
    id: "car11",
    year: 2022,
    make: "Rivian",
    model: "R1T",
    seller: "rj_scaringe",
    listing_type: "Auction",
  },
];

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <View style={styles.statCard}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const PendingListingRow = ({ car }: { car: (typeof pendingCars)[0] }) => (
  <View style={styles.listingRow}>
    <View style={styles.listingInfo}>
      <Text
        style={styles.listingTitle}
      >{`${car.year} ${car.make} ${car.model}`}</Text>
      <Text style={styles.listingSubtitle}>
        By {car.seller} ({car.listing_type})
      </Text>
    </View>
    <View style={styles.listingActions}>
      <Pressable style={[styles.actionButton, styles.editButton]}>
        <Text style={styles.actionButtonText}>Review</Text>
      </Pressable>
      <Pressable style={[styles.actionButton, styles.approveButton]}>
        <Text style={styles.actionButtonText}>Approve</Text>
      </Pressable>
    </View>
  </View>
);

const AdminDashboardScreen = () => {
  return (
    <>
      <Stack.Screen options={{ title: "Admin Dashboard" }} />
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            Site overview and management.
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <StatCard label="Total Users" value={stats.user_count} />
          <StatCard
            label="Active Auctions"
            value={stats.active_auction_count}
          />
          <StatCard label="Cars For Sale" value={stats.for_sale_count} />
          <StatCard label="Cars For Rent" value={stats.for_rent_count} />
          <StatCard label="Pending" value={stats.pending_approval_count} />
        </View>

        {/* Pending Listings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Listings Pending Approval</Text>
          {pendingCars.length > 0 ? (
            <View style={styles.listingContainer}>
              {pendingCars.map((car) => (
                <PendingListingRow key={car.id} car={car} />
              ))}
            </View>
          ) : (
            <Text style={styles.noItemsText}>
              There are no listings pending approval.
            </Text>
          )}
        </View>
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
    flexWrap: "wrap",
    justifyContent: "space-around",
    paddingVertical: 20,
  },
  statCard: {
    alignItems: "center",
    width: "30%",
    marginBottom: 20,
  },
  statValue: { fontSize: 24, fontWeight: "bold", color: COLORS.accent },
  statLabel: {
    fontSize: 14,
    color: COLORS.mutedForeground,
    marginTop: 4,
    textAlign: "center",
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: 15,
  },
  listingContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
  },
  listingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  listingInfo: {
    flex: 1,
  },
  listingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  listingSubtitle: {
    fontSize: 14,
    color: COLORS.mutedForeground,
    marginTop: 2,
  },
  listingActions: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  editButton: {
    backgroundColor: COLORS.edit,
  },
  approveButton: {
    backgroundColor: COLORS.success,
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  noItemsText: {
    color: COLORS.mutedForeground,
    textAlign: "center",
    paddingVertical: 20,
  },
});

export default AdminDashboardScreen;
