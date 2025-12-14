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
} from "react-native";
import { Link, useFocusEffect } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import axios from "axios";
import { API_BASE_URL } from "@/apiConfig";

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
  created_at: string;
  offer_count: number;
}

const RequestCard = ({ request }: { request: CarRequest }) => {
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

  return (
    <View style={styles.requestCard}>
      <Link href={`/request/${request.id}`} asChild>
        <Pressable>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              {request.make && request.model
                ? `${request.make} ${request.model}`
                : "General Request"}
            </Text>
            <Text style={[styles.statusTag, { backgroundColor: statusColor }]}>
              {statusText}
            </Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardNotes} numberOfLines={3}>
              {request.notes}
            </Text>
          </View>
        </Pressable>
      </Link>
      <View style={styles.cardFooter}>
        <View style={styles.footerStat}>
          <Text style={styles.footerLabel}>Submitted</Text>
          <Text style={styles.footerValue}>
            {new Date(request.created_at).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.footerStat}>
          <Text style={styles.footerLabel}>Offers</Text>
          <Text style={styles.footerValue}>{request.offer_count}</Text>
        </View>
        <Link href={`/request/${request.id}`} asChild>
          <Pressable style={styles.viewOffersButton}>
            <Text style={styles.viewOffersButtonText}>View Offers</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
};

const MyRequestsScreen = () => {
  const { token } = useAuth();
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
      const response = await axios.get(
        `${API_BASE_URL}/requests/api/requests`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setRequests(response.data.requests || []); // Ensure we have an array
    } catch (err) {
      console.error("Failed to fetch car requests:", error);
      setError("Could not load your requests. Please try again.");
      Alert.alert(
        "Connection Error",
        "Could not load your requests. Please pull down to refresh."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // useFocusEffect will re-fetch data every time the screen comes into view
  useFocusEffect(
    useCallback(() => {
      setLoading(true); // Show loader when screen is focused
      fetchRequests();
    }, [token])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

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
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Car Requests</Text>
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
          ? requests.map((req) => <RequestCard key={req.id} request={req} />)
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
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
