import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/hooks/useAuth";
import VehicleCard from "@/components/_components/VehicleCard";
import { PUBLIC_HOME_ROUTE, RENTAL_ROUTES } from "@/lib/roleRoutes";
import {
  useWebPullToRefresh,
  WebPullToRefreshIndicator,
} from "@/components/_components/WebPullToRefresh";
import {
  getRentalDashboard,
  toggleRentalCarActive,
} from "@/lib/api/rentals";

const COLORS = {
  background: "#14181F",
  card: "#1C212B",
  text: "#F8F8F8",
  textSecondary: "#8A94A3",
  accent: "#A370F7",
  success: "#28a745",
  warning: "#ffc107",
  border: "#313843",
  destructive: "#dc3545",
};

type FleetCar = {
  id: number;
  make: string;
  model: string;
  year: number;
  mileage?: number;
  listing_type: string;
  is_approved: boolean;
  is_active: boolean;
  price_display?: string;
  primary_image_url?: string;
  rental_listing?: {
    id: number;
    price_per_day: number;
    is_available: boolean;
  } | null;
};

type DashboardPayload = {
  profile: {
    username: string;
    email: string;
    phone_number?: string | null;
    is_verified: boolean;
  };
  stats: {
    total_fleet_count: number;
    active_fleet_count: number;
    pending_approval_count: number;
    inactive_fleet_count: number;
  };
  my_cars: FleetCar[];
  active_cars: FleetCar[];
  pending_cars: FleetCar[];
};

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <View style={styles.statCard}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const FleetActions = ({
  car,
  token,
  onRefresh,
}: {
  car: FleetCar;
  token: string;
  onRefresh: () => void;
}) => {
  const [busy, setBusy] = useState(false);

  const toggleActive = async () => {
    setBusy(true);
    try {
      await toggleRentalCarActive(car.id);
      onRefresh();
    } catch (error: any) {
      Alert.alert(
        "Update Failed",
        error.response?.data?.message || "Could not update listing status."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.actionRow}>
      <Pressable
        style={[styles.actionButton, styles.primaryAction]}
        onPress={() =>
          router.push({
            pathname: "/(rental)/manage-rental" as any,
            params: { id: car.id.toString() },
          })
        }
      >
        <Text style={styles.primaryActionText}>Manage</Text>
      </Pressable>
      <Pressable
        style={[styles.actionButton, styles.secondaryAction]}
        onPress={toggleActive}
        disabled={busy}
      >
        <Text style={styles.secondaryActionText}>
          {busy ? "Updating..." : car.is_active ? "Deactivate" : "Activate"}
        </Text>
      </Pressable>
    </View>
  );
};

const FleetItem = ({
  car,
  token,
  onRefresh,
}: {
  car: FleetCar;
  token: string;
  onRefresh: () => void;
}) => (
  <View style={styles.fleetItem}>
    <VehicleCard
      item={{
        id: car.id.toString(),
        year: car.year,
        make: car.make,
        model: car.model,
        mileage: car.mileage ?? 0,
        price: car.price_display || "N/A",
        image: car.primary_image_url || "",
        listingType: "Rental",
      }}
      onPress={() =>
        router.push({
          pathname: "/(rental)/manage-rental" as any,
          params: { id: car.id.toString() },
        })
      }
      style={{ width: "100%" }}
    />
    <View style={styles.metaRow}>
      <View
        style={[
          styles.badge,
          car.is_approved ? styles.approvedBadge : styles.pendingBadge,
        ]}
      >
        <Text
          style={[
            styles.badgeText,
            car.is_approved ? styles.approvedText : styles.pendingText,
          ]}
        >
          {car.is_approved ? "Approved" : "Pending Approval"}
        </Text>
      </View>
      <View
        style={[
          styles.badge,
          car.is_active ? styles.activeBadge : styles.inactiveBadge,
        ]}
      >
        <Text
          style={[
            styles.badgeText,
            car.is_active ? styles.activeText : styles.inactiveText,
          ]}
        >
          {car.is_active ? "Active" : "Inactive"}
        </Text>
      </View>
      {car.rental_listing && (
        <View
          style={[
            styles.badge,
            car.rental_listing.is_available
              ? styles.availableBadge
              : styles.inactiveBadge,
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              car.rental_listing.is_available
                ? styles.activeText
                : styles.inactiveText,
            ]}
          >
            {car.rental_listing.is_available ? "Available" : "Unavailable"}
          </Text>
        </View>
      )}
    </View>
    <FleetActions car={car} token={token} onRefresh={onRefresh} />
  </View>
);

export default function RentalDashboardScreen() {
  const { token, user, isLoading } = useAuth() as any;
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "pending" | "all">(
    "active"
  );

  useEffect(() => {
    if (!isLoading && !token) {
      router.replace(PUBLIC_HOME_ROUTE as any);
    }
  }, [isLoading, token]);

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (!token) return;
    if (!isRefresh) setLoading(true);
    try {
      const response = await getRentalDashboard();
      setPayload(response.data);
    } catch (error: any) {
      Alert.alert(
        "Load Failed",
        error.response?.data?.message || "Could not load rental fleet data."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);
  const pullToRefresh = useWebPullToRefresh({
    refreshing,
    onRefresh: () => {
      setRefreshing(true);
      fetchDashboard(true);
    },
  });

  const fleet =
    activeTab === "active"
      ? payload?.active_cars ?? []
      : activeTab === "pending"
      ? payload?.pending_cars ?? []
      : payload?.my_cars ?? [];

  if (loading) {
    return (
      <ActivityIndicator
        size="large"
        color={COLORS.accent}
        style={styles.centered}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <ScrollView
          {...pullToRefresh.panHandlers}
          contentContainerStyle={styles.scrollContent}
          onScroll={pullToRefresh.handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            pullToRefresh.isWebEnabled ? undefined : (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchDashboard(true);
                }}
              />
            )
          }
        >
        <WebPullToRefreshIndicator
          pullDistance={pullToRefresh.pullDistance}
          readyToRefresh={pullToRefresh.readyToRefresh}
          refreshing={refreshing}
        />
        <View style={styles.pageShell}>
          <View style={styles.header}>
            <View style={styles.headerTextBlock}>
              <Text style={styles.headerTitle}>Rental Fleet</Text>
              <Text style={styles.headerSubtitle}>
                Welcome back, {payload?.profile?.username || user?.username || "Rental Company"}!
              </Text>
            </View>
            <View style={styles.headerActions}>
              <Link href="/(rental)/add-rental" asChild>
                <Pressable style={styles.headerButton}>
                  <Ionicons
                    name="add-circle-outline"
                    size={22}
                    color={COLORS.accent}
                  />
                  <Text style={styles.headerButtonText}>Add Rental</Text>
                </Pressable>
              </Link>
              <Link href={RENTAL_ROUTES.points as any} asChild>
                <Pressable style={styles.headerButton}>
                  <Ionicons
                    name="flash-outline"
                    size={20}
                    color={COLORS.accent}
                  />
                  <Text style={styles.headerButtonText}>Request Points</Text>
                </Pressable>
              </Link>
            </View>
          </View>

          {payload && (
            <View style={styles.statsGrid}>
              <StatCard
                label="Total Fleet"
                value={payload.stats.total_fleet_count}
              />
              <StatCard
                label="Active Rentals"
                value={payload.stats.active_fleet_count}
              />
              <StatCard
                label="Pending Approval"
                value={payload.stats.pending_approval_count}
              />
              <StatCard
                label="Inactive"
                value={payload.stats.inactive_fleet_count}
              />
            </View>
          )}

          <View style={styles.tabRow}>
            {[
              { key: "active", label: "Live Fleet" },
              { key: "pending", label: "Pending" },
              { key: "all", label: "All Rentals" },
            ].map((tab) => (
              <Pressable
                key={tab.key}
                style={[
                  styles.tab,
                  activeTab === tab.key && styles.activeTab,
                ]}
                onPress={() => setActiveTab(tab.key as typeof activeTab)}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab.key && styles.activeTabText,
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.section}>
            {fleet.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  {activeTab === "pending"
                    ? "No rental listings are waiting for approval."
                    : "No rental listings found yet."}
                </Text>
              </View>
            ) : (
              fleet.map((car) => (
                <FleetItem
                  key={car.id}
                  car={car}
                  token={token}
                  onRefresh={() => fetchDashboard(true)}
                />
              ))
            )}
          </View>
        </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: {
    paddingBottom: 24,
  },
  pageShell: {
    width: "100%",
    maxWidth: Platform.OS === "web" ? 1180 : undefined,
    alignSelf: "center",
  },
  header: {
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    flexWrap: "wrap",
  },
  headerTextBlock: {
    flex: 1,
    minWidth: 220,
    maxWidth: "100%",
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: COLORS.text },
  headerSubtitle: { fontSize: 16, color: COLORS.textSecondary, marginTop: 4 },
  headerActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 10,
    maxWidth: "100%",
  },
  headerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(163, 112, 247, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(163, 112, 247, 0.28)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxWidth: "100%",
  },
  headerButtonText: { color: COLORS.accent, fontSize: 14, fontWeight: "600" },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  statCard: {
    width: Platform.OS === "web" ? "23.5%" : "48%",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 12,
    alignItems: "center",
  },
  statValue: { color: COLORS.accent, fontSize: 22, fontWeight: "bold" },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
  },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
    flexWrap: Platform.OS === "web" ? "wrap" : "nowrap",
  },
  tab: {
    flex: Platform.OS === "web" ? undefined : 1,
    minWidth: Platform.OS === "web" ? 170 : undefined,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  activeTab: {
    backgroundColor: COLORS.accent,
  },
  tabText: { color: COLORS.textSecondary, fontWeight: "600", fontSize: 13 },
  activeTabText: { color: "#FFFFFF" },
  section: { paddingHorizontal: 16, paddingBottom: 24 },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 28,
    paddingHorizontal: 18,
    marginTop: 8,
  },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  fleetItem: { marginBottom: 18 },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
    marginBottom: 10,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  approvedBadge: { backgroundColor: "rgba(40, 167, 69, 0.18)" },
  pendingBadge: { backgroundColor: "rgba(255, 193, 7, 0.18)" },
  activeBadge: { backgroundColor: "rgba(163, 112, 247, 0.18)" },
  inactiveBadge: { backgroundColor: "rgba(138, 148, 163, 0.18)" },
  availableBadge: { backgroundColor: "rgba(40, 167, 69, 0.18)" },
  approvedText: { color: COLORS.success },
  pendingText: { color: COLORS.warning },
  activeText: { color: COLORS.accent },
  inactiveText: { color: COLORS.textSecondary },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryAction: { backgroundColor: COLORS.accent },
  secondaryAction: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  primaryActionText: { color: "#FFFFFF", fontWeight: "700" },
  secondaryActionText: { color: COLORS.text, fontWeight: "700" },
});
