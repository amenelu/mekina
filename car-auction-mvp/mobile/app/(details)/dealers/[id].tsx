import { useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Switch,
  Pressable,
  Alert,
} from "react-native";
import axios from "axios";
import { API_BASE_URL } from "@/apiConfig";
import { useAuth } from "@/hooks/useAuth";

/**
 * @interface User - Reusing the User interface as dealers are a type of user.
 * Defines the structure for a user object from the API.
 */
interface User {
  id: number;
  username: string;
  email?: string;
  phone_number?: string;
  is_admin: boolean;
  is_dealer: boolean;
  is_rental_company: boolean;
  is_verified: boolean;
  points?: number;
}

/**
 * API function to fetch user (dealer) data.
 * @param {string} id - The ID of the user to fetch.
 * @param {string | null} token - The authentication token.
 * @returns {Promise<User>} A promise that resolves to the user data.
 */
const fetchUser = async (id: string, token: string | null): Promise<User> => {
  if (!token) throw new Error("Authentication token not found.");
  const response = await axios.get(`${API_BASE_URL}/admin/api/users/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.user;
};

/**
 * API function to update user data.
 */
const updateUser = async (
  id: string,
  data: Partial<User>,
  token: string | null
) => {
  if (!token) throw new Error("Authentication token not found.");
  await axios.put(`${API_BASE_URL}/admin/api/users/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

/**
 * API function to delete a user.
 */
const deleteUser = async (id: string, token: string | null) => {
  if (!token) throw new Error("Authentication token not found.");
  await axios.delete(`${API_BASE_URL}/admin/api/users/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

/**
 * Renders the dealer management page.
 */
const DealerDetailsPage: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { token } = useAuth();

  const [dealer, setDealer] = useState<User | null>(null);
  const [editedDealer, setEditedDealer] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id && token) {
      setLoading(true);
      setError(null);
      fetchUser(id, token)
        .then((data) => {
          setDealer(data);
          setEditedDealer(data);
        })
        .catch((err) => {
          setError(err.message || "Failed to load dealer data.");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [id, token]);

  useEffect(() => {
    if (editedDealer) {
      navigation.setOptions({ title: `Manage: ${editedDealer.username}` });
    }
  }, [editedDealer, navigation]);

  const handleRoleChange = (role: keyof User, value: boolean) => {
    if (editedDealer) {
      setEditedDealer({ ...editedDealer, [role]: value });
    }
  };

  const handleSaveChanges = async () => {
    if (!editedDealer || !id) return;
    setIsSaving(true);
    try {
      await updateUser(id, editedDealer, token);
      setDealer(editedDealer);
      Alert.alert("Success", "Dealer updated successfully.");
    } catch (err: any) {
      const message = err.response?.data?.message || "Failed to update dealer.";
      Alert.alert("Error", message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = () => {
    if (!id) return;
    Alert.alert(
      "Delete Dealer",
      `Are you sure you want to permanently delete ${dealer?.username}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteUser(id, token);
            Alert.alert("Success", "Dealer has been deleted.");
            navigation.goBack();
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

  if (!dealer || !editedDealer) {
    return <Text style={styles.centered}>Dealer not found.</Text>;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Dealer Details</Text>
        <Text style={styles.text}>ID: {dealer.id}</Text>
        <Text style={styles.text}>Username: {dealer.username}</Text>
        {dealer.email && <Text style={styles.text}>Email: {dealer.email}</Text>}
        {dealer.points !== undefined && (
          <Text style={styles.text}>Points: {dealer.points}</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Manage Roles</Text>
        <View style={styles.switchRow}>
          <Text style={styles.text}>Admin</Text>
          <Switch
            value={editedDealer.is_admin}
            onValueChange={(v) => handleRoleChange("is_admin", v)}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.text}>Dealer</Text>
          <Switch
            value={editedDealer.is_dealer}
            onValueChange={(v) => handleRoleChange("is_dealer", v)}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.text}>Verified</Text>
          <Switch
            value={editedDealer.is_verified}
            onValueChange={(v) => handleRoleChange("is_verified", v)}
          />
        </View>
      </View>

      <Pressable
        style={[styles.button, styles.saveButton]}
        onPress={handleSaveChanges}
        disabled={isSaving}
      >
        <Text style={styles.buttonText}>
          {isSaving ? "Saving..." : "Save Changes"}
        </Text>
      </Pressable>

      <Pressable
        style={[styles.button, styles.deleteButton]}
        onPress={handleDeleteUser}
      >
        <Text style={styles.buttonText}>Delete Dealer</Text>
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
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  button: {
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
    marginBottom: 16,
  },
  saveButton: { backgroundColor: "#A370F7" },
  deleteButton: { backgroundColor: "#dc3545" },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});

export default DealerDetailsPage;
