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
import { API_BASE_URL } from "@/apiConfig";
import { useAuth } from "@/hooks/useAuth"; // Keep this import
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  mutedForeground: "#8A94A3",
  accent: "#A370F7",
  success: "#28a745",
  warning: "#ffc107",
  destructive: "#dc3545",
  // Add other colors if needed
};

interface Listing {
  id: number;
  year: number;
  make: string;
  model: string;
  owner_username: string;
  listing_type: string;
  is_approved: boolean;
  is_active: boolean;
}
import { useRouter } from "expo-router";
const AdminListingsScreen = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      try {
        // Note the URL includes the 'auctions' blueprint prefix
        const response = await axios.get(
          `${API_BASE_URL}/auctions/api/admin/listings?q=${search}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setListings(response.data.cars);
      } catch (error) {
        console.error("Failed to fetch listings:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounceFetch = setTimeout(() => {
      fetchListings();
    }, 300);

    return () => clearTimeout(debounceFetch);
  }, [search, token]);

  const renderItem = ({ item }: { item: Listing }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.title}>
          {item.year} {item.make} {item.model}
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
          {!item.is_active && (
            <Text
              style={[
                styles.statusTag,
                { backgroundColor: COLORS.destructive },
              ]}
            >
              Inactive
            </Text>
          )}
        </View>
      </View>
      <Text style={styles.subtitle}>
        Owner: {item.owner_username} · Type: {item.listing_type}
      </Text>
      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.button, styles.manageButton]}
          onPress={() => router.push(`/(details)/listings/${item.id}`)}
        >
          <Text style={styles.buttonText}>Manage</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.deleteButton]}>
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
          placeholder="Search all listings..."
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
          data={listings}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No listings found.</Text>
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
    marginBottom: 15,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.foreground,
    flex: 1,
    marginRight: 10,
  },
  subtitle: { fontSize: 14, color: COLORS.mutedForeground, marginBottom: 12 },
  statusContainer: { flexDirection: "row", gap: 5 },
  statusTag: {
    color: "#fff",
    fontWeight: "bold",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontSize: 10,
    overflow: "hidden",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#313843",
    paddingTop: 10,
  },
  button: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  manageButton: { backgroundColor: COLORS.accent },
  deleteButton: { backgroundColor: COLORS.destructive },
  buttonText: { color: COLORS.foreground, fontWeight: "bold" },
  emptyText: {
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginTop: 50,
  },
});

export default AdminListingsScreen;
