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
import axios from "axios";
import API_URL from "@/constants/Api";
import { useAuth } from "@/hooks/useAuth"; // Keep this import
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import {
  useWebPullToRefresh,
  WebPullToRefreshIndicator,
} from "@/app/_components/WebPullToRefresh";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  border: "#313843",
  mutedForeground: "#8A94A3",
  accent: "#A370F7",
  success: "#28a745",
  destructive: "#dc3545",
  warning: "#ffc107",
  // Add other colors if needed
};

interface Rental {
  id: number;
  year: number;
  make: string;
  model: string;
  owner_id: number;
  owner_username: string;
  owner_pending_point_request?: {
    requested_points: number;
    request_count: number;
    latest_request_id: number;
  } | null;
  price_per_day: string;
  is_approved: boolean;
  is_active: boolean;
}
// AdminRentalsScreen component
const AdminRentalsScreen = () => {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const { token } = useAuth();
  const router = useRouter();

  const fetchRentals = useCallback(async (isRefresh = false) => {
    if (!token) return;
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const response = await axios.get(`${API_URL}/admin/api/rentals?q=${search}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRentals(response.data.cars);
    } catch (error: any) {
      console.error(
        "Error fetching rentals:",
        error.response
          ? JSON.stringify(error.response.data, null, 2)
          : error.message
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, token]);

  useEffect(() => {
    const debounceFetch = setTimeout(() => {
      fetchRentals();
    }, 300);

    return () => clearTimeout(debounceFetch);
  }, [fetchRentals]);

  useFocusEffect(
    useCallback(() => {
      fetchRentals();
    }, [fetchRentals])
  );
  const pullToRefresh = useWebPullToRefresh({
    refreshing,
    onRefresh: () => fetchRentals(true),
  });

  const handleDelete = (rental: Rental) => {
    const message = `Are you sure you want to delete the ${rental.year} ${rental.make} ${rental.model}?`;

    const performDelete = async () => {
      try {
        await axios.delete(`${API_URL}/admin/api/listings/${rental.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRentals((prev) => prev.filter((r) => r.id !== rental.id));
        if (Platform.OS === "web") {
          setStatusMessage("Rental listing has been deleted.");
        } else {
          Alert.alert("Success", "Rental listing has been deleted.");
        }
      } catch {
        if (Platform.OS === "web") {
          setStatusMessage("Failed to delete rental listing.");
        } else {
          Alert.alert("Error", "Failed to delete rental listing.");
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

    Alert.alert("Delete Rental Listing", message, [
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
    rental: Rental,
    action: "accept" | "deny"
  ) => {
    const verb = action === "accept" ? "approve" : "deny";
    const message = `Are you sure you want to ${verb} ${rental.owner_username}'s request for ${rental.owner_pending_point_request?.requested_points ?? 0} points?`;

    const performAction = async () => {
      try {
        await axios.post(
          `${API_URL}/admin/api/dealers/${rental.owner_id}/point-requests`,
          { action },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setRentals((prevRentals) =>
          prevRentals.map((item) =>
            item.owner_id === rental.owner_id
              ? { ...item, owner_pending_point_request: null }
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

  const renderItem = ({ item }: { item: Rental }) => (
    <View style={styles.card}>
      <View>
        <View style={styles.titleRow}>
          <Text style={styles.title}>
            {item.year} {item.make} {item.model}
          </Text>
          {item.owner_pending_point_request ? (
            <View style={styles.pointRequestBadge}>
              <Ionicons name="flash" size={13} color={COLORS.foreground} />
              <Text style={styles.pointRequestBadgeText}>
                {item.owner_pending_point_request.requested_points}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.subtitle}>
          by {item.owner_username} - {item.price_per_day} ETB/day
        </Text>
        <View style={styles.statusContainer}>
          <Text
            style={[
              styles.statusTag,
              {
                backgroundColor: item.is_approved
                  ? COLORS.success
                  : COLORS.warning,
              },
            ]}
          >
            {item.is_approved ? "Approved" : "Pending"}
          </Text>
        </View>
        {item.owner_pending_point_request ? (
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
          onPress={() => router.push(`/(details)/rentals/${item.id}`)}
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
          placeholder="Search rentals..."
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
          data={rentals}
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
                onRefresh={() => fetchRentals(true)}
                tintColor={COLORS.accent}
              />
            )
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No rental listings found.</Text>
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
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  title: { fontSize: 16, fontWeight: "bold", color: COLORS.foreground },
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
    backgroundColor: COLORS.success,
  },
  denyButton: {
    backgroundColor: COLORS.destructive,
  },
  pointActionText: {
    color: COLORS.foreground,
    fontSize: 12,
    fontWeight: "700",
  },
  subtitle: { fontSize: 14, color: COLORS.mutedForeground, marginTop: 4 },
  statusContainer: { flexDirection: "row", marginTop: 8 },
  statusTag: {
    color: "#fff",
    fontWeight: "bold",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontSize: 12,
    overflow: "hidden",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    marginTop: 12,
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
  buttonText: { color: COLORS.foreground, fontWeight: "bold" },
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

export default AdminRentalsScreen;
