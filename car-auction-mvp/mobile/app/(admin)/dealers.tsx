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
import { API_BASE_URL } from "@/apiConfig";
import { useAuth } from "@/hooks/useAuth"; // Keep this import
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  border: "#313843",
  mutedForeground: "#8A94A3",
  destructive: "#dc3545",
  accent: "#A370F7",
  // Add other colors if needed
};

interface Dealer {
  id: number;
  username: string;
  email: string;
  active_listings: number;
  avg_rating: number;
  review_count: number;
}
import { useRouter } from "expo-router";
const AdminDealersScreen = () => {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const fetchDealers = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `${API_BASE_URL}/admin/api/dealers?q=${search}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setDealers(response.data.dealers);
      } catch (error) {
        console.error("Failed to fetch dealers:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounceFetch = setTimeout(() => {
      fetchDealers();
    }, 300);

    return () => clearTimeout(debounceFetch);
  }, [search, token]);

  const handleDelete = (dealer: Dealer) => {
    Alert.alert(
      "Delete Dealer",
      `Are you sure you want to delete ${dealer.username}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await axios.delete(
                `${API_BASE_URL}/admin/api/users/${dealer.id}`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              );
              setDealers((prevDealers) =>
                prevDealers.filter((d) => d.id !== dealer.id)
              );
              Alert.alert("Success", "Dealer has been deleted.");
            } catch (err) {
              Alert.alert("Error", "Failed to delete dealer.");
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Dealer }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <Text style={styles.username}>{item.username}</Text>
        <Text style={styles.email}>{item.email}</Text>
        <Text style={styles.stats}>
          {item.active_listings} listings · ★ {item.avg_rating.toFixed(1)} (
          {item.review_count} reviews)
        </Text>
      </View>
      <View style={styles.buttonContainer}>
        <Pressable
          style={styles.manageButton}
          onPress={() => router.push(`/(details)/dealers/${item.id}`)}
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
          placeholder="Search dealers by name or email..."
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
          data={dealers}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No dealers found.</Text>
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
  userCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  userInfo: {
    marginBottom: 12,
  },
  username: { fontSize: 16, fontWeight: "bold", color: COLORS.foreground },
  email: { fontSize: 14, color: COLORS.mutedForeground, marginTop: 4 },
  stats: { fontSize: 12, color: COLORS.accent, marginTop: 8 },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    marginTop: 8,
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
  buttonText: {
    color: COLORS.foreground,
    fontWeight: "bold",
  },
  emptyText: {
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginTop: 50,
  },
});

export default AdminDealersScreen;
