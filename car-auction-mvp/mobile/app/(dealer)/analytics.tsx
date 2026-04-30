import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";
import { useAuth } from "@/hooks/useAuth";
import API_BASE_URL from "@/constants/Api";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  background: "#14181F",
  card: "#1C212B",
  text: "#F8F8F8",
  textSecondary: "#8A94A3",
  accent: "#A370F7",
  border: "#313843",
  success: "#28a745",
  warning: "#ffc107",
};

interface PopularMake {
  make: string;
  count: number;
}

interface PopularModel {
  make: string;
  model: string;
  count: number;
}

interface PopularSearch {
  term: string;
  count: number;
}

interface AdvancedAnalytics {
  is_locked?: boolean;
  spent_week?: number;
  spent_month?: number;
  threshold_week?: number;
  threshold_month?: number;
  message?: string;
  market_demand: { label: string; value: number }[];
  pricing_intelligence: { make: string; avg_price: number }[];
  inventory_performance: {
    active_listings: number;
    bids_placed: number;
    bids_won: number;
    win_rate: number;
  };
  competitive_benchmarking: {
    my_rating: number;
    market_avg_rating: number;
    my_win_rate: number;
    market_win_rate: number;
  };
  buyer_behaviour: { type: string; count: number }[];
  drivetrain_demand: { type: string; count: number }[];
}

const AnalyticsScreen = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [popularMakes, setPopularMakes] = useState<PopularMake[]>([]);
  const [popularModels, setPopularModels] = useState<PopularModel[]>([]);
  const [popularSearches, setPopularSearches] = useState<PopularSearch[]>([]);
  const [advancedData, setAdvancedData] = useState<AdvancedAnalytics | null>(
    null
  );

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const [requestsRes, searchesRes, advancedRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/dealer/api/analytics/popular-requests`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE_URL}/dealer/api/analytics/popular-searches`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE_URL}/dealer/api/analytics/advanced`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setPopularMakes(requestsRes.data.popular_makes);
      setPopularModels(requestsRes.data.popular_models);
      setPopularSearches(searchesRes.data.popular_searches);
      setAdvancedData(advancedRes.data);
    } catch (error) {
      console.error("Failed to fetch analytics data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const AnalyticsCard = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );

  const ListItem = ({
    rank,
    label,
    count,
  }: {
    rank: number;
    label: string;
    count: number;
  }) => (
    <View style={styles.listItem}>
      <Text style={styles.rank}>#{rank}</Text>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.count}>{count}</Text>
    </View>
  );

  const SimpleBarChart = ({
    data,
    maxValue,
    labelKey,
    valueKey,
    color = COLORS.accent,
    formatValue,
  }: any) => {
    return (
      <View style={styles.chartContainer}>
        {data.map((item: any, index: number) => {
          const value = item[valueKey];
          const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
          return (
            <View key={index} style={styles.chartRow}>
              <Text
                style={styles.chartLabel}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item[labelKey]}
              </Text>
              <View style={styles.chartBarContainer}>
                <View style={styles.chartBarBackground}>
                  <View
                    style={[
                      styles.chartBar,
                      { width: `${percentage}%`, backgroundColor: color },
                    ]}
                  />
                </View>
                <Text style={styles.chartValue}>
                  {formatValue ? formatValue(value) : value}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const ComparisonBar = ({ label, myValue, marketValue, unit = "" }: any) => {
    const max = Math.max(myValue, marketValue) * 1.2 || 1;
    const myPercent = (myValue / max) * 100;
    const marketPercent = (marketValue / max) * 100;

    return (
      <View style={styles.comparisonContainer}>
        <Text style={styles.comparisonLabel}>{label}</Text>
        <View style={styles.comparisonRow}>
          <View style={styles.comparisonItem}>
            <View
              style={[
                styles.comparisonBar,
                { width: `${myPercent}%`, backgroundColor: COLORS.accent },
              ]}
            />
            <Text style={styles.comparisonValue}>
              You: {myValue}
              {unit}
            </Text>
          </View>
          <View style={styles.comparisonItem}>
            <View
              style={[
                styles.comparisonBar,
                {
                  width: `${marketPercent}%`,
                  backgroundColor: COLORS.textSecondary,
                },
              ]}
            />
            <Text style={styles.comparisonValue}>
              Market: {marketValue}
              {unit}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <ActivityIndicator
        size="large"
        color={COLORS.accent}
        style={styles.centered}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Market Analytics</Text>
          <Text style={styles.headerSubtitle}>
            Top trends from the last 30 days
          </Text>
        </View>

        {advancedData && advancedData.is_locked && (
          <View style={styles.lockedContainer}>
            <Ionicons name="lock-closed" size={48} color={COLORS.textSecondary} />
            <Text style={styles.lockedTitle}>Advanced Analytics Locked</Text>
            <Text style={styles.lockedText}>{advancedData.message}</Text>
            
            <View style={styles.progressSection}>
              <Text style={styles.progressLabel}>Weekly Spending: {advancedData.spent_week} / {advancedData.threshold_week}</Text>
              <View style={styles.progressBarBg}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { width: `${Math.min(((advancedData.spent_week || 0) / (advancedData.threshold_week || 1)) * 100, 100)}%` }
                  ]} 
                />
              </View>
            </View>

            <View style={styles.progressSection}>
              <Text style={styles.progressLabel}>Monthly Spending: {advancedData.spent_month} / {advancedData.threshold_month}</Text>
              <View style={styles.progressBarBg}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { width: `${Math.min(((advancedData.spent_month || 0) / (advancedData.threshold_month || 1)) * 100, 100)}%` }
                  ]} 
                />
              </View>
            </View>

            <Text style={styles.lockedHint}>Place bids or unlock conversations to gain access.</Text>
          </View>
        )}

        {advancedData && !advancedData.is_locked && (
          <>
            <AnalyticsCard title="Inventory Performance">
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>
                    {advancedData.inventory_performance.active_listings}
                  </Text>
                  <Text style={styles.statLabel}>Active Listings</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>
                    {advancedData.inventory_performance.bids_placed}
                  </Text>
                  <Text style={styles.statLabel}>Bids Placed</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>
                    {advancedData.inventory_performance.win_rate}%
                  </Text>
                  <Text style={styles.statLabel}>Win Rate</Text>
                </View>
              </View>
            </AnalyticsCard>

            <AnalyticsCard title="Competitive Benchmarking">
              <ComparisonBar
                label="Average Rating"
                myValue={advancedData.competitive_benchmarking.my_rating}
                marketValue={
                  advancedData.competitive_benchmarking.market_avg_rating
                }
              />
              <ComparisonBar
                label="Bid Win Rate"
                myValue={advancedData.competitive_benchmarking.my_win_rate}
                marketValue={
                  advancedData.competitive_benchmarking.market_win_rate
                }
                unit="%"
              />
            </AnalyticsCard>

            <AnalyticsCard title="Market Demand (Budget)">
              <SimpleBarChart
                data={advancedData.market_demand}
                maxValue={Math.max(
                  ...advancedData.market_demand.map((d) => d.value)
                )}
                labelKey="label"
                valueKey="value"
              />
            </AnalyticsCard>

            <AnalyticsCard title="Pricing Intelligence (Avg. Market Price)">
              <SimpleBarChart
                data={advancedData.pricing_intelligence}
                maxValue={Math.max(
                  ...advancedData.pricing_intelligence.map((d) => d.avg_price)
                )}
                labelKey="make"
                valueKey="avg_price"
                color={COLORS.success}
                formatValue={(v: number) => `${(v / 1000000).toFixed(1)}M`}
              />
            </AnalyticsCard>

            <AnalyticsCard title="Buyer Behaviour (Top Body Types)">
              <SimpleBarChart
                data={advancedData.buyer_behaviour}
                maxValue={Math.max(
                  ...advancedData.buyer_behaviour.map((d) => d.count)
                )}
                labelKey="type"
                valueKey="count"
                color={COLORS.warning}
              />
            </AnalyticsCard>

            <AnalyticsCard title="Drivetrain Demand">
              <SimpleBarChart
                data={advancedData.drivetrain_demand}
                maxValue={Math.max(
                  ...advancedData.drivetrain_demand.map((d) => d.count)
                )}
                labelKey="type"
                valueKey="count"
              />
            </AnalyticsCard>
          </>
        )}

        <AnalyticsCard title="Most Requested Makes">
          {popularMakes.length > 0 ? (
            popularMakes.map((item, index) => (
              <ListItem
                key={index}
                rank={index + 1}
                label={item.make}
                count={item.count}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>No request data available.</Text>
          )}
        </AnalyticsCard>

        <AnalyticsCard title="Most Requested Models">
          {popularModels.length > 0 ? (
            popularModels.map((item, index) => (
              <ListItem
                key={index}
                rank={index + 1}
                label={`${item.make} ${item.model}`}
                count={item.count}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>No request data available.</Text>
          )}
        </AnalyticsCard>

        <AnalyticsCard title="Top Search Terms">
          {popularSearches.length > 0 ? (
            popularSearches.map((item, index) => (
              <ListItem
                key={index}
                rank={index + 1}
                label={item.term}
                count={item.count}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>No search data available.</Text>
          )}
        </AnalyticsCard>
      </ScrollView>
    </SafeAreaView>
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
  header: { padding: 20, paddingBottom: 10 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: COLORS.text },
  headerSubtitle: { fontSize: 16, color: COLORS.textSecondary, marginTop: 4 },
  card: {
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 10,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rank: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: "bold",
    width: 40,
  },
  label: {
    color: COLORS.text,
    fontSize: 16,
    flex: 1,
    textTransform: "capitalize",
  },
  count: { color: COLORS.accent, fontSize: 16, fontWeight: "bold" },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: "center",
    paddingVertical: 20,
  },
  // Chart Styles
  chartContainer: { marginTop: 10 },
  chartRow: { marginBottom: 12 },
  chartLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 4,
    textTransform: "capitalize",
  },
  chartBarContainer: { flexDirection: "row", alignItems: "center" },
  chartBarBackground: {
    flex: 1,
    height: 24,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    marginRight: 8,
  },
  chartBar: { height: "100%", borderRadius: 4 },
  chartValue: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "bold",
  },

  // Stats Grid
  statsGrid: { flexDirection: "row", justifyContent: "space-between" },
  statBox: { alignItems: "center", flex: 1 },
  statNumber: { color: COLORS.text, fontSize: 20, fontWeight: "bold" },
  statLabel: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4 },

  // Comparison Styles
  comparisonContainer: { marginBottom: 20 },
  comparisonLabel: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  comparisonRow: { gap: 8 },
  comparisonItem: { marginBottom: 6 },
  comparisonBar: { height: 8, borderRadius: 4, marginBottom: 4 },
  comparisonValue: { color: COLORS.textSecondary, fontSize: 12 },

  // Locked State
  lockedContainer: {
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  lockedTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginTop: 15, marginBottom: 10 },
  lockedText: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 20 },
  lockedHint: { fontSize: 14, color: COLORS.accent, marginTop: 20, fontStyle: 'italic' },
  progressSection: { width: '100%', marginBottom: 15 },
  progressLabel: { color: COLORS.text, marginBottom: 8, fontSize: 14, fontWeight: '600' },
  progressBarBg: {
    height: 10,
    backgroundColor: COLORS.border,
    borderRadius: 5,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 5,
  },
});

export default AnalyticsScreen;
