import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Pressable,
  RefreshControl,
  SafeAreaView,
} from "react-native";
import { router } from "expo-router";
import axios from "axios";
import { useAuth } from "@/hooks/useAuth";
import API_BASE_URL from "@/constants/Api";
import { Ionicons } from "@expo/vector-icons";
import { useSocket } from "@/contexts/SocketContext";
import { DEALER_ROUTES, LOGIN_ROUTE } from "@/lib/roleRoutes";

const COLORS = {
  background: "#14181F",
  card: "#1C212B",
  text: "#F8F8F8",
  textSecondary: "#8A94A3",
  accent: "#A370F7",
  success: "#28a745",
  warning: "#ffc107",
  border: "#313843",
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
  min_year?: number;
  message?: string;
  notes?: string;
  created_at: string;
  min_price?: number;
  max_price?: number;
  condition?: string;
  transmission?: string;
  bid_count?: number;
  lowest_offer?: number;
  has_been_viewed?: boolean;
  detail_score?: number;
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

const ListingItem = ({ item }: { item: Listing }) => {
  const handlePress = () => {
    router.push({
      pathname: DEALER_ROUTES.editListing as any,
      params: { id: item.id.toString() },
    });
  };

  return (
    <Pressable style={styles.itemCard} onPress={handlePress}>
      <View>
        <Text style={styles.itemTitle}>
          {item.year} {item.make} {item.model}
        </Text>
        <Text style={styles.itemSubtitle}>
          {item.listing_type.toUpperCase()}
        </Text>
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
          <Text style={[styles.statusTag, styles.pending]}>
            Pending Approval
          </Text>
        )}
      </View>
    </Pressable>
  );
};

const RequestItem = ({ item }: { item: CustomerRequest }) => {
  const handlePress = () => {
    router.push({
      pathname: DEALER_ROUTES.placeOffer as any,
      params: { request_id: item.id.toString() },
    });
  };

  const getScoreColor = (score: number = 0) => {
    if (score >= 80) return COLORS.success;
    if (score >= 50) return COLORS.warning;
    return COLORS.textSecondary;
  };

  return (
    <Pressable style={styles.itemCard} onPress={handlePress}>
      <View style={styles.requestCardHeader}>
        <Text style={styles.itemTitle}>
          {item.make || "Any Make"} {item.model || ""} ({item.min_year || "Any"}
          +)
        </Text>
        {item.detail_score !== undefined && (
          <View
            style={[
              styles.scoreBadge,
              { backgroundColor: getScoreColor(item.detail_score) },
            ]}
          >
            <Text style={styles.scoreText}>{item.detail_score}%</Text>
          </View>
        )}
        {!item.has_been_viewed && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        )}
      </View>

      <View style={styles.requestCardBody}>
        <View style={styles.requestDetails}>
          {item.min_price && item.max_price && (
            <Text style={styles.detailText}>
              <Text style={styles.detailLabel}>Budget: </Text>
              {item.min_price.toLocaleString()} -{" "}
              {item.max_price.toLocaleString()} ETB
            </Text>
          )}
          <Text style={styles.detailText}>
            <Text style={styles.detailLabel}>Condition: </Text>
            {item.condition || "Any"}
          </Text>
          <Text style={styles.detailText}>
            <Text style={styles.detailLabel}>Transmission: </Text>
            {item.transmission || "Any"}
          </Text>
        </View>
        <View style={styles.requestStats}>
          <View style={styles.requestStatItem}>
            <Text style={styles.requestStatValue}>{item.bid_count || 0}</Text>
            <Text style={styles.requestStatLabel}>Offers</Text>
          </View>
          <View style={styles.requestStatItem}>
            <Text style={styles.requestStatValue}>
              {item.lowest_offer ? item.lowest_offer.toLocaleString() : "N/A"}
            </Text>
            <Text style={styles.requestStatLabel}>Lowest</Text>
          </View>
        </View>
      </View>

      <Text style={styles.itemNotes} numberOfLines={2}>
        {item.notes || item.message}
      </Text>
    </Pressable>
  );
};

const DashboardSection = <T,>({
  data,
  emptyText,
  renderItem,
}: {
  data: T[];
  emptyText: string;
  renderItem: (item: T) => React.ReactNode;
}) => {
  if (data.length === 0) {
    return <Text style={styles.emptyText}>{emptyText}</Text>;
  }

  return <View style={styles.sectionList}>{data.map(renderItem)}</View>;
};

const DealerDashboard = () => {
  const { token, user, isLoading } = useAuth() as any;
  const { socket } = useSocket();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [pendingListings, setPendingListings] = useState<Listing[]>([]);
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [activeTab, setActiveTab] = useState<
    "listings" | "requests" | "pending"
  >("requests");

  useEffect(() => {
    if (!isLoading && !token) {
      router.replace(LOGIN_ROUTE);
    }
  }, [isLoading, token]);

  useEffect(() => {
    if (!socket) return;

    socket.on("request_updated", (data) => {
      setRequests((prevRequests) =>
        prevRequests.map((req) =>
          req.id === data.request_id
            ? {
                ...req,
                bid_count: data.bid_count,
                lowest_offer: data.lowest_offer,
              }
            : req
        )
      );
    });

    // Listen for entirely new customer requests
    socket.on("new_customer_request", (newRequest) => {
      setRequests((prevRequests) => [newRequest, ...prevRequests]);
    });

    return () => {
      socket.off("request_updated");
      socket.off("new_customer_request");
    };
  }, [socket]);

  const fetchData = useCallback(async () => {
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
      // Sort requests by creation date, newest first
      const sortedRequests = (data.requests || []).sort(
        (a: CustomerRequest, b: CustomerRequest) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setRequests(sortedRequests);
    } catch (error) {
      console.error("Failed to fetch dealer dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [fetchData, token]);

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
            onPress={() => router.push(DEALER_ROUTES.submit as any)}
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
              onPress={() => router.push(DEALER_ROUTES.points as any)}
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
          <DashboardSection
            data={listings}
            emptyText="You have no approved listings yet."
            renderItem={(item) => <ListingItem key={item.id} item={item} />}
          />
        )}

        {activeTab === "requests" && (
          <DashboardSection
            data={requests}
            emptyText="No customer requests found."
            renderItem={(item) => <RequestItem key={item.id} item={item} />}
          />
        )}

        {activeTab === "pending" && (
          <DashboardSection
            data={pendingListings}
            emptyText="No listings are pending approval."
            renderItem={(item) => <ListingItem key={item.id} item={item} />}
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
  sectionList: {
    paddingBottom: 12,
  },
  requestCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  newBadge: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  newBadgeText: {
    color: "black",
    fontWeight: "bold",
    fontSize: 12,
  },
  scoreBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  scoreText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  requestCardBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
  },
  requestDetails: {
    flex: 1,
  },
  detailText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 4,
  },
  detailLabel: {
    color: COLORS.text,
    fontWeight: "600",
  },
  requestStats: {
    flexDirection: "row",
    gap: 15,
    alignItems: "center",
  },
  requestStatItem: {
    alignItems: "center",
  },
  requestStatValue: {
    color: COLORS.accent,
    fontSize: 18,
    fontWeight: "bold",
  },
  requestStatLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
});

export default DealerDashboard;
