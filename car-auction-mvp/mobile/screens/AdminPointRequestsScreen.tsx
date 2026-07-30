import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { useAuth } from "@/hooks/useAuth";
import { getAdminPointRequests } from "@/lib/api/admin";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  border: "#313843",
  mutedForeground: "#8A94A3",
  accent: "#A370F7",
};

type PointRequest = {
  id: number;
  dealer_id: number;
  dealer_username: string | null;
  dealer_email: string | null;
  dealer_phone_number: string | null;
  dealer_current_points: number | null;
  requested_points: number;
  reason: string | null;
  status: string;
  created_at: string;
};

function formatTime(timestamp: string) {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

function PointRequestRow({ item }: { item: PointRequest }) {
  const router = useRouter();

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.dealerName}>
            {item.dealer_username || `Dealer #${item.dealer_id}`}
          </Text>
          <Text style={styles.metaText}>{formatTime(item.created_at)}</Text>
        </View>
        <View style={styles.pointsBadge}>
          <Text style={styles.pointsBadgeText}>+{item.requested_points}</Text>
        </View>
      </View>

      <Text style={styles.detailText}>
        Current balance: {item.dealer_current_points ?? "Unknown"} points
      </Text>
      {item.dealer_email ? (
        <Text style={styles.detailText}>{item.dealer_email}</Text>
      ) : null}
      {item.dealer_phone_number ? (
        <Text style={styles.detailText}>{item.dealer_phone_number}</Text>
      ) : null}
      {item.reason ? <Text style={styles.reasonText}>{item.reason}</Text> : null}

      <Pressable
        style={styles.actionButton}
        onPress={() => router.push(`/(details)/dealers/${item.dealer_id}`)}
      >
        <Text style={styles.actionButtonText}>View Dealer</Text>
      </Pressable>
    </View>
  );
}

export default function AdminPointRequestsScreen() {
  const { token } = useAuth();
  const [pointRequests, setPointRequests] = useState<PointRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPointRequests = useCallback(async (isRefresh = false) => {
    if (!token) return;
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await getAdminPointRequests();
      setPointRequests(response.data.point_requests || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchPointRequests();
    }, [fetchPointRequests])
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Point Requests</Text>
        <Text style={styles.headerSubtitle}>
          Dealers waiting for additional bidding points.
        </Text>
      </View>
      <FlatList
        data={pointRequests}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <PointRequestRow item={item} />}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchPointRequests(true)}
            tintColor={COLORS.accent}
          />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No pending point requests.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { color: COLORS.foreground, fontSize: 26, fontWeight: "700" },
  headerSubtitle: { color: COLORS.mutedForeground, marginTop: 4, fontSize: 14 },
  listContent: { padding: 16, gap: 12 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  cardTitleBlock: { flex: 1 },
  dealerName: { color: COLORS.foreground, fontSize: 17, fontWeight: "700" },
  metaText: { color: COLORS.mutedForeground, fontSize: 12, marginTop: 3 },
  pointsBadge: {
    minWidth: 54,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  pointsBadgeText: { color: COLORS.foreground, fontSize: 15, fontWeight: "700" },
  detailText: { color: COLORS.mutedForeground, fontSize: 13, marginTop: 4 },
  reasonText: {
    color: COLORS.foreground,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  actionButton: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 14,
  },
  actionButtonText: { color: COLORS.foreground, fontWeight: "700" },
  emptyText: {
    color: COLORS.mutedForeground,
    textAlign: "center",
    paddingVertical: 36,
  },
});
