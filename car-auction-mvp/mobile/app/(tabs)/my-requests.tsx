import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
} from "react-native";
import { Link, useFocusEffect, useRouter, Stack } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import axios from "axios";
import API_URL from "@/constants/Api";
import { useSocket } from "../../contexts/SocketContext";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  mutedForeground: "#8A94A3",
  border: "#313843",
  success: "#28a745",
  warning: "#ffc107",
};

interface CarRequest {
  id: number;
  make: string | null;
  model: string | null;
  status: string;
  notes: string;
  comments?: string;
  created_at: string;
  offer_count?: number;
  deal_id: number | null;
  type?: "buy" | "trade-in";
  images?: { image_url: string }[];
  detail_score?: number;
}

const formatDate = (dateString: string) => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    const result = date.toLocaleDateString();
    return result === "Invalid Date" ? "" : result;
  } catch {
    return "";
  }
};

const RequestCard = ({
  request,
  onDelete,
}: {
  request: CarRequest;
  onDelete: (req: CarRequest) => void;
}) => {
  const router = useRouter();
  const statusColor =
    request.status.toLowerCase() === "completed"
      ? COLORS.mutedForeground
      : request.status.toLowerCase() === "active"
      ? COLORS.success
      : request.status.toLowerCase() === "pending"
      ? COLORS.warning
      : COLORS.mutedForeground;

  const statusText =
    request.status.charAt(0).toUpperCase() + request.status.slice(1);
  const isTradeIn = request.type === "trade-in";
  const isImageBased = request.images && request.images.length > 0;

  const handlePress = () => {
    if (isTradeIn) {
      console.log(
        `>>> Navigating to USER trade-in detail: /trade-in/${request.id}`
      );
      router.push(`/trade-in/${request.id}`);
    } else {
      router.push(`/request/${request.id}`);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Request",
      "Are you sure you want to delete this request?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete(request),
        },
      ]
    );
  };

  return (
    <View style={styles.requestCard}>
      <Pressable onPress={handlePress}>
        {isImageBased && request.images && (
          <Image
            source={{ uri: `${API_URL}${request.images[0].image_url}` }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        )}
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>
              {request.make && request.model
                ? `${request.make} ${request.model}`
                : isImageBased
                ? "Image Based Request"
                : "General Request"}
            </Text>
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                alignItems: "center",
                marginTop: 4,
              }}
            >
              {isTradeIn && <Text style={styles.tagText}>Trade-in</Text>}
              {isImageBased && (
                <Text style={styles.tagText}>Image Request</Text>
              )}
              {request.detail_score !== undefined && (
                <Text style={styles.scoreText}>
                  Strength: {request.detail_score}%
                </Text>
              )}
            </View>
          </View>
          <View style={{ alignItems: "flex-end", gap: 8 }}>
            <Text style={[styles.statusTag, { backgroundColor: statusColor }]}>
              {statusText}
            </Text>
            <Pressable onPress={handleDelete} hitSlop={10}>
              <Ionicons
                name="trash-outline"
                size={20}
                color={COLORS.mutedForeground}
              />
            </Pressable>
          </View>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardNotes} numberOfLines={3}>
            {isTradeIn ? request.comments : request.notes}
          </Text>
        </View>
      </Pressable>
      <View style={styles.cardFooter}>
        <View style={styles.footerStat}>
          <Text style={styles.footerLabel}>Submitted</Text>
          <Text style={styles.footerValue}>
            {formatDate(request.created_at)}
          </Text>
        </View>
        <View style={styles.footerStat}>
          <Text style={styles.footerLabel}>Offers</Text>
          <Text style={styles.footerValue}>{request.offer_count || 0}</Text>
        </View>
        {request.status === "completed" && request.deal_id ? (
          <Link href={`/deal/${request.deal_id}`} asChild>
            <Pressable style={styles.viewOffersButton}>
              <Text style={styles.viewOffersButtonText}>View Deal Summary</Text>
            </Pressable>
          </Link>
        ) : isTradeIn ? (
          <Pressable
            style={[styles.viewOffersButton, { opacity: 0.8 }]}
            onPress={() => router.push(`/trade-in/${request.id}`)}
          >
            <Text style={styles.viewOffersButtonText}>
              Status: {request.status}
            </Text>
          </Pressable>
        ) : (
          <Link href={`/request/${request.id}`} asChild>
            <Pressable style={styles.viewOffersButton}>
              <Text style={styles.viewOffersButtonText}>View Offers</Text>
            </Pressable>
          </Link>
        )}
      </View>
    </View>
  );
};

const MyRequestsScreen = () => {
  const { token, logout, isLoading } = useAuth() as any;
  const router = useRouter();
  const { socket } = useSocket();
  const [requests, setRequests] = useState<CarRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // This function will fetch the requests from the API
  const fetchRequests = async () => {
    if (!token) {
      setLoading(false);
      setError("You are not logged in.");
      return;
    }
    try {
      setError(null); // Clear previous errors
      const response = await axios.get(`${API_URL}/requests/api/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Sort requests to show completed ones first
      const sortedRequests = (response.data.requests || []).sort(
        (a: CarRequest, b: CarRequest) => {
          if (a.status === "completed" && b.status !== "completed") return -1;
          if (b.status === "completed" && a.status !== "completed") return 1;
          return 0;
        }
      );
      setRequests(sortedRequests);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        // Handle token expiration
        console.log("Token expired or invalid. Logging out.");
        Alert.alert("Session Expired", "Please log in again.", [
          { text: "OK", onPress: () => logout() },
        ]);
        router.replace("/login");
      } else {
        console.error("Failed to fetch car requests:", err);
        setError("Could not load your requests. Please try again.");
        Alert.alert(
          "Connection Error",
          "Could not load your requests. Please pull down to refresh."
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // useFocusEffect will re-fetch data every time the screen comes into view
  useFocusEffect(
    useCallback(() => {
      if (token) {
        setLoading(true); // Show loader when screen is focused
        fetchRequests();
      }
    }, [token])
  );

  useEffect(() => {
    if (socket) {
      const handleUpdate = () => {
        fetchRequests();
      };
      socket.on("new_notification", handleUpdate);
      return () => {
        socket.off("new_notification", handleUpdate);
      };
    }
  }, [socket]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const handleDeleteRequest = async (req: CarRequest) => {
    try {
      setLoading(true);
      if (req.type === "trade-in") {
        await axios.delete(`${API_URL}/trade-in/api/requests/${req.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.delete(`${API_URL}/requests/api/requests/${req.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      // Refresh list
      fetchRequests();
      Alert.alert("Success", "Request deleted successfully.");
    } catch (error) {
      console.error("Failed to delete request:", error);
      Alert.alert("Error", "Failed to delete request.");
      setLoading(false);
    }
  };

  if (!isLoading && !token) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center", padding: 20 },
        ]}
      >
        <Text
          style={{
            color: COLORS.mutedForeground,
            fontSize: 16,
            textAlign: "center",
            marginBottom: 20,
          }}
        >
          Please log in to view your requests.
        </Text>
        <Link href="/(auth)/login" asChild>
          <Pressable style={styles.viewOffersButton}>
            <Text style={styles.viewOffersButtonText}>Login</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={{ color: COLORS.foreground, marginTop: 10 }}>
          Loading Requests...
        </Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{ title: "My Requests", headerTitleAlign: "left" }}
      />
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerSubtitle}>
            Here are the requests you've submitted. Click "View Offers" to see
            bids from our dealer network.
          </Text>
        </View>
        <View style={styles.content}>
          {error && !loading && (
            <View style={styles.noRequestsContainer}>
              <Text style={styles.noRequestsText}>{error}</Text>
            </View>
          )}
          {!error && requests.length > 0
            ? requests.map((req) => (
                <RequestCard
                  key={`${req.type}-${req.id}`}
                  request={req}
                  onDelete={handleDeleteRequest}
                />
              ))
            : !error &&
              !loading && (
                <View style={styles.noRequestsContainer}>
                  <Text style={styles.noRequestsText}>
                    You have not made any car requests yet.
                  </Text>
                  <Link href="/request" asChild>
                    <Pressable>
                      <Text style={styles.linkText}>Find a car now!</Text>
                    </Pressable>
                  </Link>
                </View>
              )}
        </View>
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 20,
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: COLORS.foreground },
  headerSubtitle: { fontSize: 16, color: COLORS.mutedForeground, marginTop: 8 },
  content: { padding: 20, gap: 20 },
  requestCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    overflow: "hidden",
  },
  cardImage: {
    width: "100%",
    height: 150,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tagText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: "bold", color: COLORS.foreground },
  statusTag: {
    color: "#fff",
    fontWeight: "bold",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 12,
    overflow: "hidden",
  },
  scoreText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: "bold",
  },
  cardBody: { padding: 15 },
  cardNotes: { color: COLORS.mutedForeground, fontSize: 15, lineHeight: 22 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: "#181D25",
  },
  footerStat: { alignItems: "center" },
  footerLabel: { color: COLORS.mutedForeground, fontSize: 12 },
  footerValue: { color: COLORS.foreground, fontSize: 16, fontWeight: "600" },
  viewOffersButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  viewOffersButtonText: { color: COLORS.foreground, fontWeight: "bold" },
  noRequestsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  noRequestsText: {
    color: COLORS.mutedForeground,
    fontSize: 16,
    textAlign: "center",
  },
  linkText: {
    color: COLORS.accent,
    fontSize: 16,
    marginTop: 10,
    fontWeight: "600",
  },
});

export default MyRequestsScreen;
