import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getDealerClosedDeals } from "@/lib/api/dealer";

const COLORS = {
  background: "#14181F",
  card: "#1C212B",
  text: "#F8F8F8",
  textSecondary: "#8A94A3",
  accent: "#A370F7",
  border: "#313843",
  success: "#28a745",
};

interface ClosedDeal {
  id: number;
  final_price: number;
  payment_method?: string;
  deal_date: string;
  status?: string;
  completed_at?: string | null;
  customer?: {
    username?: string;
    email?: string;
    phone_number?: string;
  } | null;
  accepted_bid?: {
    car_year?: number;
    make?: string;
    model?: string;
    condition?: string;
    mileage?: number;
  } | null;
  reward_points_awarded?: boolean;
  reward_points_amount?: number;
}

function formatMoney(value?: number) {
  if (typeof value !== "number") return "ETB 0";
  return `ETB ${value.toLocaleString()}`;
}

function formatDate(value?: string | null) {
  if (!value) return "Date unavailable";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ClosedDealsScreen() {
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === "web" && width >= 1000;
  const [deals, setDeals] = useState<ClosedDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDeals = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const response = await getDealerClosedDeals();
      setDeals(response.data.deals || []);
    } catch (error) {
      console.error("Failed to fetch closed deals:", error);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDeals(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={28} color={COLORS.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Deals Won</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator
          size="large"
          color={COLORS.accent}
          style={styles.centered}
        />
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.accent}
            />
          }
        >
          <View style={[styles.pageShell, isWideWeb && styles.pageShellWide]}>
            <Text style={styles.subtitle}>
              Accepted and completed deals won by your offers.
            </Text>

            {deals.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons
                  name="checkmark-done-circle-outline"
                  size={42}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.emptyTitle}>No won deals yet</Text>
                <Text style={styles.emptyText}>
                  Deals will appear here after a buyer accepts one of your offers.
                </Text>
              </View>
            ) : (
              <View style={styles.dealList}>
                {deals.map((deal) => {
                  const bid = deal.accepted_bid;
                  const vehicleTitle = [
                    bid?.car_year,
                    bid?.make,
                    bid?.model,
                  ]
                    .filter(Boolean)
                    .join(" ");
                  const isCompleted =
                    String(deal.status || "").toLowerCase() === "completed";

                  return (
                    <Pressable
                      key={deal.id}
                      style={({ pressed }) => [
                        styles.dealCard,
                        pressed && styles.dealCardPressed,
                      ]}
                      onPress={() =>
                        router.push({
                          pathname: "/deal/[id]" as any,
                          params: { id: String(deal.id) },
                        })
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Open deal ${deal.id}`}
                    >
                      <View style={styles.dealTopRow}>
                        <Text style={styles.dealTitle}>Deal #{deal.id}</Text>
                        <View
                          style={[
                            styles.statusPill,
                            !isCompleted && styles.acceptedStatusPill,
                          ]}
                        >
                          <Ionicons
                            name={
                              isCompleted ? "checkmark-circle" : "time-outline"
                            }
                            size={14}
                            color={isCompleted ? COLORS.success : COLORS.accent}
                          />
                          <Text
                            style={[
                              styles.statusText,
                              !isCompleted && styles.acceptedStatusText,
                            ]}
                          >
                            {isCompleted ? "Closed" : "Accepted"}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.price}>
                        {formatMoney(deal.final_price)}
                      </Text>
                      <Text style={styles.vehicleText}>
                        {vehicleTitle || "Vehicle details unavailable"}
                      </Text>

                      <View style={styles.metaGrid}>
                        <View style={styles.metaItem}>
                          <Text style={styles.metaLabel}>Customer</Text>
                          <Text style={styles.metaValue}>
                            {deal.customer?.username || "Customer"}
                          </Text>
                        </View>
                        <View style={styles.metaItem}>
                          <Text style={styles.metaLabel}>
                            {isCompleted ? "Completed" : "Accepted"}
                          </Text>
                          <Text style={styles.metaValue}>
                            {formatDate(deal.completed_at || deal.deal_date)}
                          </Text>
                        </View>
                        <View style={styles.metaItem}>
                          <Text style={styles.metaLabel}>Payment</Text>
                          <Text style={styles.metaValue}>
                            {deal.payment_method || "Cash"}
                          </Text>
                        </View>
                        <View style={styles.metaItem}>
                          <Text style={styles.metaLabel}>Reward</Text>
                          <Text style={styles.metaValue}>
                            {isCompleted && deal.reward_points_awarded
                              ? `${deal.reward_points_amount || 1} point`
                              : isCompleted
                                ? "Pending"
                                : "After completion"}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    minHeight: 64,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "800",
  },
  headerSpacer: { width: 44 },
  pageShell: {
    width: "100%",
    padding: 20,
    gap: 16,
  },
  pageShellWide: {
    maxWidth: 960,
    alignSelf: "center",
    paddingHorizontal: 28,
    paddingTop: 24,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "800",
  },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  dealList: { gap: 14 },
  dealCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  dealCardPressed: {
    opacity: 0.86,
    borderColor: COLORS.accent,
  },
  dealTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  dealTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "800",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: COLORS.success,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  acceptedStatusPill: {
    borderColor: COLORS.accent,
  },
  statusText: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: "800",
  },
  acceptedStatusText: {
    color: COLORS.accent,
  },
  price: {
    color: COLORS.accent,
    fontSize: 24,
    fontWeight: "900",
  },
  vehicleText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  metaItem: {
    minWidth: 140,
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  metaLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 3,
  },
  metaValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
    textTransform: "capitalize",
  },
});
