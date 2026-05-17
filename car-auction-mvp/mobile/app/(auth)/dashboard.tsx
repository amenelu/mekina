import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { getAdminDashboard } from "@/lib/api/admin";
import type { AdminDashboardStats } from "@/lib/api/types";

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

type Stats = AdminDashboardStats;

interface PendingCar {
  id: number;
  year: number;
  make: string;
  model: string;
  owner: { username: string };
  listing_type: string;
}

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <View style={styles.statCard}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const PendingListingRow = ({ car }: { car: PendingCar }) => (
  <View style={styles.listingRow}>
    <View style={styles.listingInfo}>
      <Text
        style={styles.listingTitle}
      >{`${car.year} ${car.make} ${car.model}`}</Text>
      <Text style={styles.listingSubtitle}>
        By {car.owner.username} ({car.listing_type})
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
  const { token, isLoading } = useAuth() as any;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingCars, setPendingCars] = useState<PendingCar[]>([]);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!token) return;
    try {
      if (!isRefresh) setLoading(true);
      const response = await getAdminDashboard();
      setStats(response.data.stats);
      setPendingCars(response.data.pending_approvals);
    } catch (error) {
      console.error("Failed to fetch admin dashboard data:", error);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isLoading && !token) {
      router.replace("/(auth)/login");
      return;
    }
    fetchData();
  }, [fetchData, isLoading, router, token]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  return (
    <React.Fragment>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            Site overview and management.
          </Text>
        </View>

        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={COLORS.accent} />
        ) : (
          stats && (
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
          )
        )}

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
    </React.Fragment>
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
