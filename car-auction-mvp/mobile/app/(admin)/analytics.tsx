import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";
import { getAdminDashboard } from "@/lib/api/admin";
import type {
  AdminAnalyticsBreakdown,
  AdminAnalyticsGroup,
  AdminAnalyticsPayload,
} from "@/lib/api/types";

const COLORS = {
  background: "#14181F",
  card: "#1C212B",
  panel: "#252A35",
  text: "#F8F8F8",
  textSecondary: "#8A94A3",
  accent: "#A370F7",
  border: "#313843",
  success: "#28a745",
  warning: "#ffc107",
};

const groupIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  Users: "people",
  "Requests & Offers": "document-text",
  Deals: "checkmark-done-circle",
  Points: "diamond",
  "Dealer Analytics": "briefcase",
  Messages: "chatbubbles",
  Inventory: "car-sport",
  "Trade-ins": "swap-horizontal",
};

const formatMetricValue = (value: number | string, helper?: string | null) => {
  const text =
    typeof value === "number"
      ? Number.isInteger(value)
        ? value.toLocaleString()
        : value.toLocaleString(undefined, { maximumFractionDigits: 1 })
      : value;
  return helper ? `${text} ${helper}` : text;
};

const getNumberValue = (value: number | string) => {
  if (typeof value === "number") {
    return value;
  }
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

function BreakdownChart({ breakdown }: { breakdown: AdminAnalyticsBreakdown }) {
  const maxValue = Math.max(
    1,
    ...breakdown.items.map((item) => getNumberValue(item.value))
  );

  return (
    <View style={styles.breakdownBox}>
      <Text style={styles.breakdownTitle}>{breakdown.title}</Text>
      {breakdown.items.length > 0 ? (
        breakdown.items.map((item) => {
          const value = getNumberValue(item.value);
          const widthPercent = Math.max(4, (value / maxValue) * 100);
          return (
            <View key={`${breakdown.title}-${item.label}`} style={styles.chartRow}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartLabel} numberOfLines={1}>
                  {item.label}
                </Text>
                <Text style={styles.chartValue}>
                  {formatMetricValue(item.value)}
                </Text>
              </View>
              {item.helper ? (
                <Text style={styles.chartHelper}>{item.helper}</Text>
              ) : null}
              <View style={styles.chartTrack}>
                <View style={[styles.chartFill, { width: `${widthPercent}%` }]} />
              </View>
            </View>
          );
        })
      ) : (
        <Text style={styles.emptyText}>No data yet.</Text>
      )}
    </View>
  );
}

function AnalyticsGroupCard({ group }: { group: AdminAnalyticsGroup }) {
  return (
    <View style={styles.groupCard}>
      <View style={styles.groupHeader}>
        <View style={styles.groupIcon}>
          <Ionicons
            name={groupIcons[group.title] || "analytics"}
            size={20}
            color={COLORS.text}
          />
        </View>
        <Text style={styles.groupTitle}>{group.title}</Text>
      </View>

      <View style={styles.metricGrid}>
        {group.metrics.map((metric) => (
          <View key={`${group.title}-${metric.label}`} style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {formatMetricValue(metric.value, metric.helper)}
            </Text>
            <Text style={styles.metricLabel}>{metric.label}</Text>
          </View>
        ))}
      </View>

      {group.breakdowns?.map((breakdown) => (
        <BreakdownChart
          key={`${group.title}-${breakdown.title}`}
          breakdown={breakdown}
        />
      ))}
    </View>
  );
}

export default function AdminAnalyticsScreen() {
  const { width } = useWindowDimensions();
  const { token } = useAuth();
  const [analytics, setAnalytics] = useState<AdminAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isWideWeb = Platform.OS === "web" && width >= 1000;

  const fetchAnalytics = useCallback(
    async (isRefresh = false) => {
      if (!token) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const response = await getAdminDashboard();
        setAnalytics(response.data.analytics || null);
      } catch (err) {
        console.error("Failed to fetch admin analytics:", err);
        setError("Failed to fetch admin analytics.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useFocusEffect(
    useCallback(() => {
      fetchAnalytics();
    }, [fetchAnalytics])
  );

  if (loading && !refreshing) {
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
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchAnalytics(true)}
            tintColor={COLORS.accent}
          />
        }
      >
        <View style={[styles.pageShell, isWideWeb && styles.pageShellWide]}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Admin Analytics</Text>
            <Text style={styles.headerSubtitle}>
              Platform health, marketplace activity, dealer performance, and
              operational queues.
            </Text>
          </View>

          {analytics?.groups?.length ? (
            <View style={styles.groupGrid}>
              {analytics.groups.map((group) => (
                <AnalyticsGroupCard key={group.title} group={group} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No analytics data available yet.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
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
  pageShell: {
    width: "100%",
    padding: 20,
  },
  pageShellWide: {
    maxWidth: 1180,
    alignSelf: "center",
    paddingHorizontal: 28,
    paddingTop: 28,
  },
  header: {
    marginBottom: 18,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: "900",
  },
  headerSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 6,
    maxWidth: 720,
  },
  groupGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  groupCard: {
    flexGrow: 1,
    flexBasis: 340,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  groupIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  groupTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    flexGrow: 1,
    flexBasis: 138,
    backgroundColor: COLORS.panel,
    borderRadius: 10,
    padding: 12,
  },
  metricValue: {
    color: COLORS.accent,
    fontSize: 19,
    fontWeight: "900",
  },
  metricLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 5,
  },
  breakdownBox: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 14,
  },
  breakdownTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 10,
  },
  chartRow: {
    marginBottom: 11,
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 5,
  },
  chartLabel: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 12,
    textTransform: "capitalize",
  },
  chartValue: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
  },
  chartHelper: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 6,
  },
  chartTrack: {
    height: 9,
    borderRadius: 999,
    backgroundColor: COLORS.border,
    overflow: "hidden",
  },
  chartFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: COLORS.accent,
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  errorText: {
    color: COLORS.warning,
    fontSize: 16,
  },
});
