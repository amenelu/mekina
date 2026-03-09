import React, { useState, useEffect } from "react";
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

  const fetchData = async () => {
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
  };

  useEffect(() => {
    fetchData();
  }, [token]);

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
              <Text style={styles.chartLabel}>{item[labelKey]}</Text>
              <View style={styles.chartBarContainer}>
                <View
                  style={[
                    styles.chartBar,
                    { width: `${percentage}%`, backgroundColor: color },
                  ]}
                />
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

        {advancedData && (
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
  chartLabel: { color: COLORS.textSecondary, fontSize: 14, marginBottom: 4 },
  chartBarContainer: { flexDirection: "row", alignItems: "center", height: 24 },
  chartBar: { height: "100%", borderRadius: 4, minWidth: 4 },
  chartValue: {
    color: COLORS.text,
    fontSize: 12,
    marginLeft: 8,
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
});

export default AnalyticsScreen;
