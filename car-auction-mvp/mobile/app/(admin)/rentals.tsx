import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TextInput,
  Pressable,
  Alert,
} from "react-native";
import axios from "axios";
import { API_BASE_URL } from "@/apiConfig"; // Keep this import
import { useAuth } from "@/hooks/useAuth"; // Keep this import
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  border: "#313843",
  mutedForeground: "#8A94A3",
  accent: "#A370F7",
  success: "#28a745",
  destructive: "#dc3545",
  warning: "#ffc107",
  // Add other colors if needed
};

interface Rental {
  id: number;
  year: number;
  make: string;
  model: string;
  owner_username: string;
  price_per_day: string;
  is_approved: boolean;
  is_active: boolean;
}
import { useRouter } from "expo-router";
// AdminRentalsScreen component
const AdminRentalsScreen = () => {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const fetchRentals = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `${API_BASE_URL}/admin/api/rentals?q=${search}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setRentals(response.data.cars);
      } catch (error: any) {
        console.error(
          "Error fetching rentals:",
          error.response
            ? JSON.stringify(error.response.data, null, 2)
            : error.message
        );
      } finally {
        setLoading(false);
      }
    };

    const debounceFetch = setTimeout(() => {
      fetchRentals();
    }, 300);

    return () => clearTimeout(debounceFetch);
  }, [search, token]);

  const handleDelete = (rental: Rental) => {
    Alert.alert(
      "Delete Rental Listing",
      `Are you sure you want to delete the ${rental.year} ${rental.make} ${rental.model}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await axios.delete(
                `${API_BASE_URL}/admin/api/listings/${rental.id}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              setRentals((prev) => prev.filter((r) => r.id !== rental.id));
              Alert.alert("Success", "Rental listing has been deleted.");
            } catch (err) {
              Alert.alert("Error", "Failed to delete rental listing.");
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Rental }) => (
    <View style={styles.card}>
      <View>
        <Text style={styles.title}>
          {item.year} {item.make} {item.model}
        </Text>
        <Text style={styles.subtitle}>
          by {item.owner_username} - {item.price_per_day} ETB/day
        </Text>
        <View style={styles.statusContainer}>
          <Text
            style={[
              styles.statusTag,
              {
                backgroundColor: item.is_approved
                  ? COLORS.success
                  : COLORS.warning,
              },
            ]}
          >
            {item.is_approved ? "Approved" : "Pending"}
          </Text>
        </View>
      </View>
      <View style={styles.buttonContainer}>
        <Pressable
          style={styles.manageButton}
          onPress={() => router.push(`/(details)/rentals/${item.id}`)}
        >
          <Text style={styles.buttonText}>Manage</Text>
        </Pressable>
        <Pressable
          style={styles.deleteButton}
          onPress={() => handleDelete(item)}
        >
          <Text style={styles.buttonText}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons
          name="search"
          size={20}
          color={COLORS.mutedForeground}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search rentals..."
          placeholderTextColor={COLORS.mutedForeground}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      {loading ? (
        <ActivityIndicator
          size="large"
          color={COLORS.accent}
          style={{ marginTop: 20 }}
        />
      ) : (
        <FlatList
          data={rentals}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No rental listings found.</Text>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 15,
    margin: 20,
    marginBottom: 0,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: 50, color: COLORS.foreground, fontSize: 16 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  title: { fontSize: 16, fontWeight: "bold", color: COLORS.foreground },
  subtitle: { fontSize: 14, color: COLORS.mutedForeground, marginTop: 4 },
  statusContainer: { flexDirection: "row", marginTop: 8 },
  statusTag: {
    color: "#fff",
    fontWeight: "bold",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontSize: 12,
    overflow: "hidden",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    marginTop: 12,
  },
  manageButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  deleteButton: {
    backgroundColor: COLORS.destructive,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  buttonText: { color: COLORS.foreground, fontWeight: "bold" },
  emptyText: {
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginTop: 50,
  },
});

export default AdminRentalsScreen;
