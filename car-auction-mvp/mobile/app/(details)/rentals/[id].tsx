import { useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import axios from "axios";
import { API_BASE_URL } from "@/apiConfig";
import { useAuth } from "@/hooks/useAuth";

/**
 * @interface Rental
 * Defines the structure for a rental object.
 */
interface Rental {
  id: number;
  make: string;
  model: string;
  year: number;
  owner?: { username: string };
  rental_listing?: { price_per_day: number };
}

/**
 * API function to fetch rental data.
 * @param {string} id - The ID of the rental to fetch.
 * @param {string | null} token - The authentication token.
 * @returns {Promise<Rental>} A promise that resolves to the rental data.
 */
const fetchRental = async (
  id: string,
  token: string | null
): Promise<Rental> => {
  if (!token) throw new Error("Authentication token not found.");
  // Note: Using the listings endpoint as there's no specific rental detail endpoint
  const response = await axios.get(`${API_BASE_URL}/admin/api/listings/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.car;
};

/**
 * Renders the rental details page.
 */
const RentalDetailsPage: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { token } = useAuth();

  const [rental, setRental] = useState<Rental | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id && token) {
      setLoading(true);
      setError(null);
      fetchRental(id, token)
        .then((data) => setRental(data))
        .catch((err) => setError(err.message || "Failed to load rental."))
        .finally(() => setLoading(false));
    }
  }, [id, token]);

  useEffect(() => {
    if (rental) {
      navigation.setOptions({
        title: `Rental: ${rental.year} ${rental.make}`,
      });
    }
  }, [rental, navigation]);

  if (loading) {
    return <ActivityIndicator size="large" style={styles.centered} />;
  }

  if (error) {
    return <Text style={styles.errorText}>Error: {error}</Text>;
  }

  if (!rental) {
    return <Text style={styles.centered}>Rental not found.</Text>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Rental Details</Text>
        <Text style={styles.text}>ID: {rental.id}</Text>
        <Text style={styles.text}>
          Vehicle: {rental.year} {rental.make} {rental.model}
        </Text>
        <Text style={styles.text}>
          Owner: {rental.owner?.username ?? "N/A"}
        </Text>
        <Text style={styles.text}>
          Price per Day: $
          {rental.rental_listing?.price_per_day?.toFixed(2) ?? "N/A"}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#14181F" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    backgroundColor: "#1C212B",
    borderRadius: 12,
    padding: 15,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#F8F8F8",
    marginBottom: 10,
  },
  text: { fontSize: 16, marginBottom: 8, color: "#F8F8F8" },
  errorText: { color: "red", textAlign: "center", marginTop: 20 },
});

export default RentalDetailsPage;
