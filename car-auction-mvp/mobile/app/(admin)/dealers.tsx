import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TextInput,
  Pressable,
  Alert,
  Platform,
  RefreshControl,
} from "react-native";
import { useAuth } from "@/hooks/useAuth"; // Keep this import
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import {
  useWebPullToRefresh,
  WebPullToRefreshIndicator,
} from "@/components/_components/WebPullToRefresh";
import {
  deleteAdminUser,
  getAdminDealers,
  resolveDealerPointRequests,
} from "@/lib/api/admin";
import type { AdminDealer } from "@/lib/api/types";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  border: "#313843",
  mutedForeground: "#8A94A3",
  destructive: "#dc3545",
  accent: "#A370F7",
  // Add other colors if needed
};

const AdminDealersScreen = () => {
  const [dealers, setDealers] = useState<AdminDealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const { token } = useAuth();
  const router = useRouter();

  const fetchDealers = useCallback(async (isRefresh = false) => {
    if (!token) return;
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const response = await getAdminDealers(search);
      setDealers(
        (response.data.dealers || []).map((dealer: AdminDealer) => ({
          ...dealer,
          active_listings: dealer.active_listings ?? 0,
          avg_rating: dealer.avg_rating ?? 0,
          review_count: dealer.review_count ?? 0,
        }))
      );
    } catch (error) {
      console.error("Failed to fetch dealers:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, token]);

  useEffect(() => {
    const debounceFetch = setTimeout(() => {
      fetchDealers();
    }, 300);

    return () => clearTimeout(debounceFetch);
  }, [fetchDealers]);

  useFocusEffect(
    useCallback(() => {
      fetchDealers();
    }, [fetchDealers])
  );
  const pullToRefresh = useWebPullToRefresh({
    refreshing,
    onRefresh: () => fetchDealers(true),
  });

  const handleDelete = (dealer: AdminDealer) => {
    const message = `Are you sure you want to delete ${dealer.username}? This action cannot be undone.`;

    const performDelete = async () => {
      try {
        await deleteAdminUser(dealer.id);
        setDealers((prevDealers) => prevDealers.filter((d) => d.id !== dealer.id));
        if (Platform.OS === "web") {
          setStatusMessage("Dealer has been deleted.");
        } else {
          Alert.alert("Success", "Dealer has been deleted.");
        }
      } catch {
        if (Platform.OS === "web") {
          setStatusMessage("Failed to delete dealer.");
        } else {
          Alert.alert("Error", "Failed to delete dealer.");
        }
      }
    };

    if (Platform.OS === "web") {
      setStatusMessage(null);
      if (typeof window !== "undefined" && window.confirm(message)) {
        void performDelete();
      }
      return;
    }

    Alert.alert("Delete Dealer", message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void performDelete();
        },
      },
    ]);
  };

  const handlePointRequestAction = async (
    dealer: AdminDealer,
    action: "accept" | "deny"
  ) => {
    const verb = action === "accept" ? "approve" : "deny";
    const message = `Are you sure you want to ${verb} ${dealer.username}'s request for ${dealer.pending_point_request?.requested_points ?? 0} points?`;

    const performAction = async () => {
      try {
        await resolveDealerPointRequests(dealer.id, action);
        setDealers((prevDealers) =>
          prevDealers.map((item) =>
            item.id === dealer.id
              ? { ...item, pending_point_request: null }
              : item
          )
        );
        setStatusMessage(
          action === "accept"
            ? "Point request approved."
            : "Point request denied."
        );
      } catch (error) {
        console.error("Failed to update point request:", error);
        setStatusMessage("Failed to update point request.");
      }
    };

    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm(message)) {
        void performAction();
      }
      return;
    }

    Alert.alert("Point Request", message, [
      { text: "Cancel", style: "cancel" },
      { text: action === "accept" ? "Approve" : "Deny", onPress: performAction },
    ]);
  };

  const renderItem = ({ item }: { item: AdminDealer }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <View style={styles.titleRow}>
          <Text style={styles.username}>{item.username}</Text>
          {item.pending_point_request ? (
            <View style={styles.pointRequestBadge}>
              <Ionicons name="flash" size={13} color={COLORS.foreground} />
              <Text style={styles.pointRequestBadgeText}>
                {item.pending_point_request.requested_points}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.email}>{item.email}</Text>
        <Text style={styles.stats}>
          {item.active_listings} listings · ★ {item.avg_rating.toFixed(1)} (
          {item.review_count} reviews)
        </Text>
        {item.pending_point_request ? (
          <View style={styles.pointRequestActions}>
            <Pressable
              style={[styles.pointActionButton, styles.acceptButton]}
              onPress={() => handlePointRequestAction(item, "accept")}
            >
              <Text style={styles.pointActionText}>Accept</Text>
            </Pressable>
            <Pressable
              style={[styles.pointActionButton, styles.denyButton]}
              onPress={() => handlePointRequestAction(item, "deny")}
            >
              <Text style={styles.pointActionText}>Deny</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      <View style={styles.buttonContainer}>
        <Pressable
          style={styles.manageButton}
          onPress={() => router.push(`/(details)/dealers/${item.id}`)}
        >
          <Text style={styles.buttonText}>Manage</Text>
        </Pressable>
        <Pressable
          style={styles.deleteButton}
          onPress={() => handleDelete(item)}
        >
          <Text style={styles.buttonText}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );

  const listHeader = (
    <>
      <WebPullToRefreshIndicator
        pullDistance={pullToRefresh.pullDistance}
        readyToRefresh={pullToRefresh.readyToRefresh}
        refreshing={refreshing}
      />
      <View style={styles.searchBar}>
        <Ionicons
          name="search"
          size={20}
          color={COLORS.mutedForeground}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search dealers by name or email..."
          placeholderTextColor={COLORS.mutedForeground}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      {statusMessage ? (
        <Text
          style={[
            styles.statusMessage,
            statusMessage.startsWith("Failed")
              ? styles.statusMessageError
              : styles.statusMessageSuccess,
          ]}
        >
          {statusMessage}
        </Text>
      ) : null}
    </>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator
          size="large"
          color={COLORS.accent}
          style={{ marginTop: 20 }}
        />
      ) : (
        <FlatList
          {...pullToRefresh.panHandlers}
          data={dealers}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 20 }}
          onScroll={pullToRefresh.handleScroll}
          scrollEventThrottle={16}
          ListHeaderComponent={listHeader}
          refreshControl={
            pullToRefresh.isWebEnabled ? undefined : (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchDealers(true)}
                tintColor={COLORS.accent}
              />
            )
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No dealers found.</Text>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: 50, color: COLORS.foreground, fontSize: 16 },
  userCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  userInfo: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  username: { fontSize: 16, fontWeight: "bold", color: COLORS.foreground },
  pointRequestBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.accent,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pointRequestBadgeText: {
    color: COLORS.foreground,
    fontSize: 12,
    fontWeight: "700",
  },
  pointRequestActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  pointActionButton: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  acceptButton: {
    backgroundColor: "#28a745",
  },
  denyButton: {
    backgroundColor: COLORS.destructive,
  },
  pointActionText: {
    color: COLORS.foreground,
    fontSize: 12,
    fontWeight: "700",
  },
  email: { fontSize: 14, color: COLORS.mutedForeground, marginTop: 4 },
  stats: { fontSize: 12, color: COLORS.accent, marginTop: 8 },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    marginTop: 8,
  },
  manageButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  deleteButton: {
    backgroundColor: COLORS.destructive,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  buttonText: {
    color: COLORS.foreground,
    fontWeight: "bold",
  },
  emptyText: {
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginTop: 50,
  },
  statusMessage: {
    marginBottom: 20,
    fontSize: 13,
    fontWeight: "600",
  },
  statusMessageSuccess: {
    color: "#7AE582",
  },
  statusMessageError: {
    color: "#FF7D7D",
  },
});

export default AdminDealersScreen;
