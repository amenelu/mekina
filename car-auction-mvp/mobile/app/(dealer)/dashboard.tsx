import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Pressable,
  FlatList,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, router } from "expo-router";
import axios from "axios";
import { useAuth } from "@/hooks/useAuth";
import { API_BASE_URL } from "@/apiConfig";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  background: "#14181F",
  card: "#1C212B",
  text: "#F8F8F8",
  textSecondary: "#8A94A3",
  accent: "#A370F7",
  success: "#28a745",
  warning: "#ffc107",
};

interface DashboardStats {
  points?: number;
  active_listings_count?: number;
  new_requests_count?: number;
  pending_approval_count?: number;
  unanswered_questions_count?: number;
}

interface Listing {
  id: number;
  make: string;
  model: string;
  year: number;
  is_approved: boolean;
  is_active: boolean;
  listing_type: string;
}

interface CustomerRequest {
  id: number;
  make: string;
  model: string;
  min_year: number;
  notes: string;
}

interface Conversation {
  id: number;
  buyer: { username: string };
  car: { year: number; make: string; model: string };
  created_at: string;
}

const StatCard = ({
  label,
  value,
  onPress,
}: {
  label: string;
  value: number;
  onPress?: () => void;
}) => {
  const CardContent = () => (
    <>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </>
  );

  return onPress ? (
    <Pressable style={styles.statCard} onPress={onPress}>
      <CardContent />
    </Pressable>
  ) : (
    <View style={styles.statCard}>
      <CardContent />
    </View>
  );
};

const ListingItem = ({ item }: { item: Listing }) => (
  <View style={styles.itemCard}>
    <View>
      <Text style={styles.itemTitle}>
        {item.year} {item.make} {item.model}
      </Text>
      <Text style={styles.itemSubtitle}>{item.listing_type.toUpperCase()}</Text>
    </View>
    <View style={styles.statusContainer}>
      {item.is_approved ? (
        <>
          <Text style={[styles.statusTag, styles.approved]}>Approved</Text>
          <Text
            style={[
              styles.statusTag,
              item.is_active ? styles.active : styles.inactive,
            ]}
          >
            {item.is_active ? "Active" : "Inactive"}
          </Text>
        </>
      ) : (
        <Text style={[styles.statusTag, styles.pending]}>Pending Approval</Text>
      )}
    </View>
  </View>
);

const RequestItem = ({ item }: { item: CustomerRequest }) => (
  <View style={styles.itemCard}>
    <Text style={styles.itemTitle}>
      {item.make} {item.model} ({item.min_year}+)
    </Text>
    <Text style={styles.itemNotes} numberOfLines={2}>
      {item.notes}
    </Text>
  </View>
);

const DealerDashboard = () => {
  const { token, user } = useAuth();
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [pendingListings, setPendingListings] = useState<Listing[]>([]);
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeTab, setActiveTab] = useState<
    "listings" | "requests" | "pending"
  >("listings");

  const fetchData = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/dealer/api/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data;

      // Construct stats from the lengths of the returned arrays
      const newStats: DashboardStats = {
        points: data.user_points ?? 0,
        active_listings_count: (data.my_cars || []).filter(
          (c: Listing) => c.is_active && c.is_approved
        ).length,
        new_requests_count: (data.requests || []).length,
        unanswered_questions_count: (data.unanswered_request_questions || [])
          .length,
        pending_approval_count: data.pending_approval_count ?? 0,
      };

      setStats(newStats);
      const allCars = data.my_cars || [];
      setListings(allCars.filter((c: Listing) => c.is_approved));
      setPendingListings(allCars.filter((c: Listing) => !c.is_approved));
      setRequests(data.requests || []);
      setConversations(data.conversations || []);
    } catch (error) {
      console.error("Failed to fetch dealer dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return <ActivityIndicator size="large" style={styles.centered} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Dealer Dashboard</Text>
            <Text style={styles.headerSubtitle}>
              Welcome back, {user?.username}!
            </Text>
          </View>
          <Pressable
            style={styles.headerButton}
            onPress={() => router.push("/(dealer)/submit")}
          >
            <Ionicons
              name="add-circle-outline"
              size={24}
              color={COLORS.accent}
            />
            <Text style={styles.headerButtonText}>List New Car</Text>
          </Pressable>
        </View>

        {stats && (
          <View style={styles.statsGrid}>
            <StatCard
              label="Your Points"
              value={stats.points ?? 0}
              onPress={() => router.push("/(dealer)/points")}
            />
            <StatCard
              label="Active Listings"
              value={stats.active_listings_count ?? 0}
            />
            <StatCard
              label="New Requests"
              value={stats.new_requests_count ?? 0}
            />
            <StatCard
              label="Pending"
              value={stats.pending_approval_count ?? 0}
            />
            <StatCard
              label="Unanswered"
              value={stats.unanswered_questions_count ?? 0}
            />
          </View>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabScrollView}
          contentContainerStyle={styles.tabContainer}
        >
          <Pressable
            style={[styles.tab, activeTab === "requests" && styles.activeTab]}
            onPress={() => setActiveTab("requests")}
          >
            <Text style={styles.tabText}>Customer Requests</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === "listings" && styles.activeTab]}
            onPress={() => setActiveTab("listings")}
          >
            <Text style={styles.tabText}>Live Listings</Text>
          </Pressable>

          <Pressable
            style={[styles.tab, activeTab === "pending" && styles.activeTab]}
            onPress={() => setActiveTab("pending")}
          >
            <Text style={styles.tabText}>Pending Approval</Text>
          </Pressable>
        </ScrollView>

        {activeTab === "listings" && (
          <FlatList
            data={listings}
            renderItem={({ item }) => <ListingItem item={item} />}
            keyExtractor={(item) => item.id.toString()}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                You have no approved listings yet.
              </Text>
            }
            scrollEnabled={false}
          />
        )}

        {activeTab === "requests" && (
          <FlatList
            data={requests}
            renderItem={({ item }) => <RequestItem item={item} />}
            keyExtractor={(item) => item.id.toString()}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No customer requests found.</Text>
            }
            scrollEnabled={false}
          />
        )}

        {activeTab === "pending" && (
          <FlatList
            data={pendingListings}
            renderItem={({ item }) => <ListingItem item={item} />}
            keyExtractor={(item) => item.id.toString()}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                No listings are pending approval.
              </Text>
            }
            scrollEnabled={false}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: COLORS.text },
  headerSubtitle: { fontSize: 16, color: COLORS.textSecondary, marginTop: 4 },
  headerButton: { flexDirection: "row", alignItems: "center", gap: 5 },
  headerButtonText: { color: COLORS.accent, fontSize: 16 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  statCard: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    paddingVertical: 15,
    paddingHorizontal: 5, // Adjust horizontal padding for smaller text
    borderRadius: 10,
    width: "32%", // Allow 3 cards per row with some space
    marginBottom: 10, // Add space between rows
  },
  statValue: { fontSize: 20, fontWeight: "bold", color: COLORS.accent },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 5,
    textAlign: "center",
  },
  tabScrollView: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.card,
  },
  tabContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  tab: { paddingVertical: 10, paddingHorizontal: 20 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: COLORS.accent },
  tabText: { color: COLORS.text, fontSize: 16 },
  itemCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 15,
    borderRadius: 8,
  },
  itemTitle: { fontSize: 16, fontWeight: "bold", color: COLORS.text },
  itemSubtitle: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4 },
  itemNotes: { color: COLORS.textSecondary, marginTop: 8 },
  statusContainer: { flexDirection: "row", gap: 8, marginTop: 10 },
  statusTag: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: "hidden",
  },
  approved: { backgroundColor: COLORS.success, color: "white" },
  pending: { backgroundColor: COLORS.warning, color: "black" },
  active: { backgroundColor: "rgba(40, 167, 69, 0.3)", color: COLORS.success },
  inactive: {
    backgroundColor: "rgba(138, 148, 163, 0.3)",
    color: COLORS.textSecondary,
  },
  offerButton: {
    backgroundColor: COLORS.accent,
    alignSelf: "flex-start",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 12,
  },
  offerButtonText: { color: "white", fontWeight: "bold" },
  viewChatButton: {
    backgroundColor: "rgba(138, 148, 163, 0.5)",
    alignSelf: "flex-start",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 12,
  },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 30,
  },
});

export default DealerDashboard;
