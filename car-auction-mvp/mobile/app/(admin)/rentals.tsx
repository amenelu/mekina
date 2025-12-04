import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TextInput,
  Pressable,
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
      <Pressable
        style={styles.editButton}
        onPress={() => router.push(`/(details)/rentals/${item.id}`)}
      >
        <Text style={styles.editButtonText}>Edit</Text>
      </Pressable>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  editButton: { backgroundColor: COLORS.accent, padding: 10, borderRadius: 8 },
  editButtonText: { color: COLORS.foreground, fontWeight: "bold" },
  emptyText: {
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginTop: 50,
  },
});

export default AdminRentalsScreen;
