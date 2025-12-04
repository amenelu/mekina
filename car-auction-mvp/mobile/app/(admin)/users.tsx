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
  border: "#313843",
  mutedForeground: "#8A94A3",
  accent: "#A370F7",
  destructive: "#dc3545",
  info: "#0dcaf0",
  // Add other colors if needed
};

interface User {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  is_rental_company: boolean;
}
import { useRouter } from "expo-router";
const AdminUsersScreen = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `${API_BASE_URL}/admin/api/users?q=${search}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        console.log("Fetched users data from API:", response.data);
        setUsers(response.data.users);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounceFetch = setTimeout(() => {
      fetchUsers();
    }, 300);

    return () => clearTimeout(debounceFetch);
  }, [search, token]);

  const renderItem = ({ item }: { item: User }) => (
    <View style={styles.userCard}>
      <View style={{ flex: 1 }}>
        <View style={styles.userHeader}>
          <Text style={styles.username}>{item.username}</Text>
          <View style={styles.roleContainer}>
            {item.is_admin && (
              <Text
                style={[
                  styles.roleTag,
                  { backgroundColor: COLORS.destructive },
                ]}
              >
                Admin
              </Text>
            )}
            {item.is_rental_company && (
              <Text style={[styles.roleTag, { backgroundColor: COLORS.info }]}>
                Rental
              </Text>
            )}
          </View>
        </View>
        <Text style={styles.email}>{item.email}</Text>
      </View>
      <Pressable
        style={styles.editButton}
        onPress={() => router.push(`/(details)/users/${item.id}`)}
      >
        <Text style={styles.editButtonText}>Manage</Text>
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
          placeholder="Search users by name or email..."
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
          data={users}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No users found.</Text>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    flexWrap: "wrap",
  },
  username: { fontSize: 16, fontWeight: "bold", color: COLORS.foreground },
  email: { fontSize: 14, color: COLORS.mutedForeground },
  editButton: { backgroundColor: COLORS.accent, padding: 10, borderRadius: 8 },
  editButtonText: { color: COLORS.foreground, fontWeight: "bold" },
  roleContainer: { flexDirection: "row", marginLeft: 10, gap: 5 },
  roleTag: {
    color: "#fff",
    fontWeight: "bold",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    fontSize: 10,
    overflow: "hidden",
  },
  emptyText: {
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginTop: 50,
  },
});

export default AdminUsersScreen;
