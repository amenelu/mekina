import { useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import axios from "axios";
import { API_BASE_URL } from "@/apiConfig";
import { useAuth } from "@/hooks/useAuth";

/**
 * @interface Listing
 * Defines the structure for a vehicle listing object.
 */
interface Listing {
  id: number;
  make: string;
  model: string;
  year: number;
  description: string;
  listing_type: "sale" | "auction" | "rental";
  fixed_price?: number;
  is_approved: boolean;
  is_active: boolean;
  owner?: { username: string };
  auction?: { current_price: number; end_time: string };
  rental_listing?: { price_per_day: number };
}

/**
 * API function to fetch listing data.
 * @param {string} id - The ID of the listing to fetch.
 * @param {string | null} token - The authentication token.
 * @returns {Promise<Listing>} A promise that resolves to the listing data.
 */
const fetchListing = async (
  id: string,
  token: string | null
): Promise<Listing> => {
  if (!token) throw new Error("Authentication token not found.");
  const response = await axios.get(`${API_BASE_URL}/admin/api/listings/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.car;
};

const manageListingAction = async (
  id: string,
  action: "approve" | "delete",
  token: string | null
) => {
  if (!token) throw new Error("Authentication token not found.");
  const method = action === "delete" ? "delete" : "post";
  const url = `${API_BASE_URL}/admin/api/listings/${id}`;
  const data = action === "approve" ? { action: "approve" } : {};

  await axios({
    method,
    url,
    data,
    headers: { Authorization: `Bearer ${token}` },
  });
};

/**
 * Renders the listing details page.
 */
const ListingDetailsPage: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { token } = useAuth();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id && token) {
      setLoading(true);
      setError(null);
      fetchListing(id, token)
        .then((data) => setListing(data))
        .catch((err) => setError(err.message || "Failed to load listing."))
        .finally(() => setLoading(false));
    }
  }, [id, token]);

  useEffect(() => {
    if (listing) {
      navigation.setOptions({
        title: `${listing.year} ${listing.make} ${listing.model}`,
      });
    }
  }, [listing, navigation]);

  const handleApprove = async () => {
    if (!id) return;
    try {
      await manageListingAction(id, "approve", token);
      Alert.alert("Success", "Listing has been approved.");
      setListing((prev) => (prev ? { ...prev, is_approved: true } : null));
    } catch (err) {
      Alert.alert("Error", "Failed to approve listing.");
    }
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert(
      "Delete Listing",
      "Are you sure you want to permanently delete this listing?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await manageListingAction(id, "delete", token);
              Alert.alert("Success", "Listing has been deleted.");
              navigation.goBack();
            } catch (err) {
              Alert.alert("Error", "Failed to delete listing.");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <ActivityIndicator size="large" style={styles.centered} />;
  }

  if (error) {
    return <Text style={styles.errorText}>Error: {error}</Text>;
  }

  if (!listing) {
    return <Text style={styles.centered}>Listing not found.</Text>;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Listing Details</Text>
        <Text style={styles.text}>ID: {listing.id}</Text>
        <Text style={styles.text}>Owner: {listing.owner?.username}</Text>
        <Text style={styles.text}>Type: {listing.listing_type}</Text>
        <Text style={styles.text}>Description: {listing.description}</Text>
        <Text style={styles.text}>
          Status: {listing.is_approved ? "Approved" : "Pending Approval"}
        </Text>
      </View>

      {!listing.is_approved && (
        <Pressable
          style={[styles.button, styles.approveButton]}
          onPress={handleApprove}
        >
          <Text style={styles.buttonText}>Approve Listing</Text>
        </Pressable>
      )}

      <Pressable
        style={[styles.button, styles.deleteButton]}
        onPress={handleDelete}
      >
        <Text style={styles.buttonText}>Delete Listing</Text>
      </Pressable>
    </ScrollView>
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
  button: {
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
    marginBottom: 16,
  },
  approveButton: { backgroundColor: "#28a745" },
  deleteButton: { backgroundColor: "#dc3545" },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});

export default ListingDetailsPage;
