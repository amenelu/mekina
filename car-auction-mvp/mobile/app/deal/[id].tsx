import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Pressable,
} from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import axios from "axios";
import API_BASE_URL from "@/constants/Api";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  mutedForeground: "#8A94A3",
  border: "#313843",
  success: "#28a745",
};

interface Deal {
  id: number;
  final_price: number;
  payment_method: string;
  deal_date: string;
  customer: { username: string; email: string; phone_number: string };
  dealer: { username: string; email: string; phone_number: string };
  accepted_bid: {
    car_year: number;
    make: string;
    model: string;
    condition: string;
    mileage: number;
  };
}

const DealSummaryScreen = () => {
  const { id } = useLocalSearchParams();
  const { token } = useAuth();
  const router = useRouter();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeal = async () => {
      if (!token || !id) return;
      try {
        const response = await axios.get(
          `${API_BASE_URL}/requests/api/deals/${id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setDeal(response.data.deal);
      } catch (error) {
        console.error("Failed to fetch deal details:", error);
        Alert.alert("Error", "Could not load deal summary.");
      } finally {
        setLoading(false);
      }
    };
    fetchDeal();
  }, [id, token]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (!deal) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: COLORS.foreground }}>Deal not found.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: `Deal #${deal.id}` }} />
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Deal Confirmed!</Text>
            <Text style={styles.headerSubtitle}>
              Here are the details of your agreement. Please contact the dealer
              to finalize the transaction.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.finalPrice}>
              {deal.final_price.toLocaleString("en-US", {
                style: "currency",
                currency: "ETB",
              })}
            </Text>
            <Text style={styles.paymentMethod}>
              via{" "}
              {deal.payment_method.charAt(0).toUpperCase() +
                deal.payment_method.slice(1)}
            </Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Parties Involved</Text>
              <View style={styles.party}>
                <Text style={styles.partyTitle}>Dealer</Text>
                <Text style={styles.partyInfo}>{deal.dealer.username}</Text>
                <Text style={styles.partyInfo}>{deal.dealer.email}</Text>
                <Text style={styles.partyInfo}>
                  {deal.dealer.phone_number || "No phone"}
                </Text>
              </View>
              <View style={styles.party}>
                <Text style={styles.partyTitle}>Customer</Text>
                <Text style={styles.partyInfo}>{deal.customer.username}</Text>
                <Text style={styles.partyInfo}>{deal.customer.email}</Text>
                <Text style={styles.partyInfo}>
                  {deal.customer.phone_number || "No phone"}
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vehicle Details</Text>
              <Text style={styles.carTitle}>
                {deal.accepted_bid.car_year} {deal.accepted_bid.make}{" "}
                {deal.accepted_bid.model}
              </Text>
              <Text style={styles.carDetail}>
                Condition: {deal.accepted_bid.condition}
              </Text>
              <Text style={styles.carDetail}>
                Mileage: {deal.accepted_bid.mileage.toLocaleString()} km
              </Text>
            </View>
          </View>

          <Pressable
            style={styles.doneButton}
            onPress={() => router.replace("/(tabs)/my-requests")}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </Pressable>
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
  content: { padding: 20 },
  header: { marginBottom: 20, alignItems: "center" },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.success,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.mutedForeground,
    textAlign: "center",
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  finalPrice: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.accent,
    textAlign: "center",
  },
  paymentMethod: {
    fontSize: 16,
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginBottom: 20,
  },
  section: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 15,
    marginTop: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: 10,
  },
  party: { marginBottom: 15 },
  partyTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.mutedForeground,
  },
  partyInfo: { fontSize: 16, color: COLORS.foreground, marginTop: 4 },
  carTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.foreground,
    marginBottom: 5,
  },
  carDetail: { fontSize: 16, color: COLORS.mutedForeground, marginTop: 2 },
  doneButton: {
    backgroundColor: COLORS.accent,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  doneButtonText: {
    color: COLORS.foreground,
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default DealSummaryScreen;
