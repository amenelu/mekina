import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/hooks/useAuth";
import VehicleCard from "@/components/_components/VehicleCard";
import { RENTAL_ROUTES } from "@/lib/roleRoutes";
import {
  useWebPullToRefresh,
  WebPullToRefreshIndicator,
} from "@/components/_components/WebPullToRefresh";
import { getRentalDashboard } from "@/lib/api/rentals";

const COLORS = {
  background: "#14181F",
  card: "#1C212B",
  text: "#F8F8F8",
  textSecondary: "#8A94A3",
  accent: "#A370F7",
  border: "#313843",
  destructive: "#dc3545",
};

type FleetCar = {
  id: number;
  make: string;
  model: string;
  year: number;
  mileage?: number;
  price_display?: string;
  primary_image_url?: string;
};

type ProfilePayload = {
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
};

export default function RentalProfileScreen() {
  const { token, logout, isLoading } = useAuth() as any;
  const [payload, setPayload] = useState<ProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!isLoading && !token) {
      router.replace("/" as any);
    }
  }, [isLoading, token]);

  const fetchProfile = useCallback(async (isRefresh = false) => {
    if (!token) return;
    if (!isRefresh) setLoading(true);
    try {
      const response = await getRentalDashboard();
      setPayload(response.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);
  const pullToRefresh = useWebPullToRefresh({
    refreshing,
    onRefresh: () => {
      setRefreshing(true);
      fetchProfile(true);
    },
  });

  if (loading) {
    return (
      <ActivityIndicator
        size="large"
        color={COLORS.accent}
        style={styles.centered}
      />
    );
  }

  const profile = payload?.profile;

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
                  fetchProfile(true);
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
            <Text style={styles.headerTitle}>Rental Company</Text>
            <Pressable
              onPress={() => {
                logout();
                router.replace("/" as any);
              }}
            >
              <Ionicons
                name="log-out-outline"
                size={28}
                color={COLORS.destructive}
              />
            </Pressable>
          </View>

          {profile && (
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {profile.username[0].toUpperCase()}
                </Text>
              </View>
              <Text style={styles.name}>
                {profile.username}{" "}
                {profile.is_verified ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={COLORS.accent}
                  />
                ) : null}
              </Text>
              <Text style={styles.contact}>{profile.email}</Text>
              {profile.phone_number ? (
                <Text style={styles.contact}>{profile.phone_number}</Text>
              ) : null}
            </View>
          )}

          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statPillValue}>
                {payload?.stats?.total_fleet_count ?? 0}
              </Text>
              <Text style={styles.statPillLabel}>Total</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statPillValue}>
                {payload?.stats?.active_fleet_count ?? 0}
              </Text>
              <Text style={styles.statPillLabel}>Active</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statPillValue}>
                {payload?.stats?.pending_approval_count ?? 0}
              </Text>
              <Text style={styles.statPillLabel}>Pending</Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Fleet Overview</Text>
            <Link href={RENTAL_ROUTES.addRental as any} asChild>
              <Pressable>
                <Text style={styles.sectionLink}>Add Rental</Text>
              </Pressable>
            </Link>
          </View>

          <View style={styles.listSection}>
            {(payload?.my_cars ?? []).map((car) => (
              <VehicleCard
                key={car.id}
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
                    pathname: RENTAL_ROUTES.manageRental as any,
                    params: { id: car.id.toString() },
                  })
                }
                style={{ width: "100%" }}
              />
            ))}
            {(payload?.my_cars ?? []).length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No rentals added yet.</Text>
              </View>
            ) : null}
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
  scrollContent: { paddingBottom: 24 },
  pageShell: {
    width: "100%",
    maxWidth: Platform.OS === "web" ? 1180 : undefined,
    alignSelf: "center",
  },
  header: {
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { color: COLORS.text, fontSize: 24, fontWeight: "bold" },
  profileCard: {
    margin: 20,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: COLORS.accent,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  avatarText: { color: "#fff", fontSize: 34, fontWeight: "bold" },
  name: { color: COLORS.text, fontSize: 24, fontWeight: "bold" },
  contact: {
    color: COLORS.textSecondary,
    fontSize: 15,
    marginTop: 6,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: Platform.OS === "web" ? "wrap" : "nowrap",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 24,
  },
  statPill: {
    flex: Platform.OS === "web" ? undefined : 1,
    width: Platform.OS === "web" ? "31%" : undefined,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  statPillValue: { color: COLORS.accent, fontSize: 20, fontWeight: "bold" },
  statPillLabel: { color: COLORS.textSecondary, marginTop: 4, fontSize: 12 },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { color: COLORS.text, fontSize: 20, fontWeight: "bold" },
  sectionLink: { color: COLORS.accent, fontSize: 15, fontWeight: "600" },
  listSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 28,
    paddingHorizontal: 18,
  },
  emptyText: { color: COLORS.textSecondary, textAlign: "center", marginTop: 20 },
});
