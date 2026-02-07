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

const AnalyticsScreen = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [popularMakes, setPopularMakes] = useState<PopularMake[]>([]);
  const [popularModels, setPopularModels] = useState<PopularModel[]>([]);
  const [popularSearches, setPopularSearches] = useState<PopularSearch[]>([]);

  const fetchData = async () => {
    if (!token) return;
    try {
      const [requestsRes, searchesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/dealer/api/analytics/popular-requests`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE_URL}/dealer/api/analytics/popular-searches`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setPopularMakes(requestsRes.data.popular_makes);
      setPopularModels(requestsRes.data.popular_models);
      setPopularSearches(searchesRes.data.popular_searches);
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
});

export default AnalyticsScreen;
