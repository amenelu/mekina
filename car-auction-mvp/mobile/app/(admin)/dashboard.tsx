import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { useFocusEffect, useRouter } from "expo-router";
import {
  useWebPullToRefresh,
  WebPullToRefreshIndicator,
} from "@/components/_components/WebPullToRefresh";
import { ADMIN_ROUTES } from "@/lib/roleRoutes";
import {
  approveAdminListing,
  getAdminDashboard,
} from "@/lib/api/admin";
import type {
  AdminDashboardStats,
  AdminPendingListing,
  AdminTradeInRequest,
} from "@/lib/api/types";

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

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <View style={styles.statCard}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const StatButton = ({
  label,
  value,
  onPress,
}: {
  label: string;
  value: number;
  onPress: () => void;
}) => (
  <Pressable style={[styles.statCard, styles.statButton]} onPress={onPress}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </Pressable>
);

const PendingListingRow = ({
  car,
  onApprove,
}: {
  car: AdminPendingListing;
  onApprove: (id: number) => void;
}) => {
  const router = useRouter();
  return (
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
        <Pressable
          style={[styles.actionButton, styles.editButton]}
          onPress={() => router.push(`/(details)/listings/${car.id}`)}
        >
          <Text style={styles.actionButtonText}>Review</Text>
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.approveButton]}
          onPress={() => onApprove(car.id)}
        >
          <Text style={styles.actionButtonText}>Approve</Text>
        </Pressable>
      </View>
    </View>
  );
};

const TradeInRow = ({ request }: { request: AdminTradeInRequest }) => {
  const router = useRouter();
  return (
    <View style={styles.listingRow}>
      <View style={styles.listingInfo}>
        <Text style={styles.listingTitle}>
          {request.year} {request.make} {request.model}
        </Text>
        <Text style={styles.listingSubtitle}>
          Condition: {request.condition} | Status: {request.status}
        </Text>
      </View>
      <View style={styles.listingActions}>
        <Pressable
          style={[styles.actionButton, styles.editButton]}
          onPress={() => router.push(`/trade-in/admin/${request.id}`)}
        >
          <Text style={styles.actionButtonText}>Review</Text>
        </Pressable>
      </View>
    </View>
  );
};

const AdminDashboardScreen = () => {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [pendingCars, setPendingCars] = useState<AdminPendingListing[]>([]);
  const [pendingTradeIns, setPendingTradeIns] = useState<AdminTradeInRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();
  const router = useRouter();

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const response = await getAdminDashboard();
      setStats(response.data.stats);
      setPendingCars(response.data.pending_approvals);
      setPendingTradeIns(response.data.pending_trade_ins);
    } catch (err) {
      setError("Failed to fetch dashboard data.");
      console.error("Failed to fetch admin dashboard data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );
  const pullToRefresh = useWebPullToRefresh({
    refreshing,
    onRefresh: () => fetchData(true),
  });

  const handleApprove = async (carId: number) => {
    try {
      await approveAdminListing(carId);
      Alert.alert("Success", "Listing has been approved.");
      // Refresh data after approval
      fetchData();
    } catch (err) {
      Alert.alert("Error", "Failed to approve listing.");
      console.error("Failed to approve listing:", err);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        {...pullToRefresh.panHandlers}
        style={styles.container}
        onScroll={pullToRefresh.handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          pullToRefresh.isWebEnabled ? undefined : (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchData(true)}
              tintColor={COLORS.accent}
            />
          )
        }
      >
      <WebPullToRefreshIndicator
        pullDistance={pullToRefresh.pullDistance}
        readyToRefresh={pullToRefresh.readyToRefresh}
        refreshing={refreshing}
      />
      <View style={styles.quickActions}>
        <Pressable
          style={styles.analyticsButton}
          onPress={() => router.push(ADMIN_ROUTES.analytics as any)}
        >
          <Text style={styles.analyticsButtonText}>View Analytics</Text>
        </Pressable>
      </View>
      {/* Stats */}
      {stats && (
        <View style={styles.statsGrid}>
          <StatCard label="Total Users" value={stats.user_count} />
          <StatButton
            label="Point Requests"
            value={stats.pending_point_request_count}
            onPress={() => router.push(ADMIN_ROUTES.dealers as any)}
          />
          <StatCard label="Cars For Sale" value={stats.for_sale_count} />
          <StatCard label="Cars For Rent" value={stats.for_rent_count} />
          <StatCard label="Pending" value={stats.pending_approval_count} />
          <StatCard label="Trade-ins" value={stats.pending_trade_in_count} />
        </View>
      )}

      {/* Pending Listings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Listings Pending Approval</Text>
        {pendingCars && pendingCars.length > 0 ? (
          <View style={styles.listingContainer}>
            {pendingCars.map((car) => (
              <PendingListingRow
                key={car.id}
                car={car}
                onApprove={handleApprove}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.noItemsText}>
            There are no listings pending approval.
          </Text>
        )}
      </View>

      {/* Pending Trade-ins */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pending Trade-in Requests</Text>
        {pendingTradeIns && pendingTradeIns.length > 0 ? (
          <View style={styles.listingContainer}>
            {pendingTradeIns.map((req) => (
              <TradeInRow key={req.id} request={req} />
            ))}
          </View>
        ) : (
          <Text style={styles.noItemsText}>No pending trade-in requests.</Text>
        )}
      </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  quickActions: {
    paddingHorizontal: 20,
    paddingTop: 18,
    alignItems: "flex-end",
  },
  analyticsButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  analyticsButtonText: {
    color: COLORS.foreground,
    fontSize: 14,
    fontWeight: "800",
  },
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
  statButton: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.accent,
    paddingVertical: 14,
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  errorText: {
    color: COLORS.edit,
    fontSize: 16,
  },
});

export default AdminDashboardScreen;
