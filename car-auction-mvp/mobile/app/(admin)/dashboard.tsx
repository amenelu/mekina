import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useAuth } from "@/hooks/useAuth";
import axios from "axios";
import { API_BASE_URL } from "@/apiConfig";
import { useFocusEffect } from "expo-router";

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

interface Stats {
  user_count: number;
  active_auction_count: number;
  for_sale_count: number;
  for_rent_count: number;
  pending_approval_count: number;
}

interface PendingCar {
  id: number;
  year: number;
  make: string;
  model: string;
  listing_type: string;
  owner: {
    id: number;
    username: string;
  };
}

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <View style={styles.statCard}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const PendingListingRow = ({
  car,
  onApprove,
}: {
  car: PendingCar;
  onApprove: (id: number) => void;
}) => (
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
      <Pressable
        style={[styles.actionButton, styles.approveButton]}
        onPress={() => onApprove(car.id)}
      >
        <Text style={styles.actionButtonText}>Approve</Text>
      </Pressable>
    </View>
  </View>
);

const AdminDashboardScreen = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [pendingCars, setPendingCars] = useState<PendingCar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/api/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(response.data.stats);
      setPendingCars(response.data.pending_approvals);
    } catch (err) {
      setError("Failed to fetch dashboard data.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleApprove = async (carId: number) => {
    try {
      await axios.post(
        `${API_BASE_URL}/admin/api/listings/${carId}`,
        { action: "approve" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("Success", "Listing has been approved.");
      // Refresh data after approval
      fetchData();
    } catch (err) {
      Alert.alert("Error", "Failed to approve listing.");
      console.error(err);
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
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <Text style={styles.headerSubtitle}>Site overview and management.</Text>
      </View>

      {/* Stats */}
      {stats && (
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
    </ScrollView>
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
