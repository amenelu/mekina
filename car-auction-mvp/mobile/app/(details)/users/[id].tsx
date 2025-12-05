import { useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Switch,
  Pressable,
  Alert,
  ScrollView,
  TextInput,
} from "react-native";
import axios from "axios";
import { API_BASE_URL } from "@/apiConfig";
import { useAuth } from "@/hooks/useAuth";

/**
 * @interface User
 * Defines the structure for a user object.
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
 * API function to fetch user data.
 * @param {string} id - The ID of the user to fetch.
 * @param {string | null} token - The authentication token.
 * @returns {Promise<User>} A promise that resolves to the user data.
 */
const fetchUser = async (id: string, token: string | null): Promise<User> => {
  if (!token) {
    throw new Error("Authentication token not found.");
  }
  console.log(`Fetching user with id: ${id}`);
  const response = await axios.get(`${API_BASE_URL}/admin/api/users/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.user;
};

/**
 * API function to update user data.
 * @param id The ID of the user to update.
 * @param data The data to update.
 * @param token The authentication token.
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

const deleteUser = async (id: string, token: string | null) => {
  if (!token) throw new Error("Authentication token not found.");
  await axios.delete(`${API_BASE_URL}/admin/api/users/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};
/**
 * Renders the user details page.
 */
const UserDetailsPage: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { token } = useAuth();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editedUser, setEditedUser] = useState<User | null>(null);

  useEffect(() => {
    if (id && token) {
      setLoading(true);
      setError(null);
      fetchUser(id, token)
        .then((data) => {
          setUser(data);
          setEditedUser(data); // Initialize editable state
        })
        .catch((err) => {
          setError(err.message || "Failed to load user data.");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [id, token]);

  useEffect(() => {
    if (editedUser) {
      navigation.setOptions({ title: `Manage: ${editedUser.username}` });
    }
  }, [editedUser, navigation]);

  const handleValueChange = (
    field: keyof User,
    value: string | boolean | number
  ) => {
    if (editedUser) {
      const newUserState = { ...editedUser, [field]: value };

      // If a primary role is being set to true, set others to false
      if (value === true) {
        if (field === "is_admin") {
          newUserState.is_dealer = false;
          newUserState.is_rental_company = false;
        } else if (field === "is_dealer") {
          newUserState.is_admin = false;
          newUserState.is_rental_company = false;
        } else if (field === "is_rental_company") {
          newUserState.is_admin = false;
          newUserState.is_dealer = false;
        }
      }
      setEditedUser(newUserState);
    }
  };

  const handleSaveChanges = async () => {
    if (!editedUser || !id) return;
    setIsSaving(true);
    try {
      await updateUser(id, editedUser, token);
      setUser(editedUser); // Update the main user state
      Alert.alert("Success", "User updated successfully.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      const message = err.response?.data?.message || "Failed to update user.";
      Alert.alert("Error", message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = () => {
    if (!id) return;
    Alert.alert(
      "Delete User",
      `Are you sure you want to permanently delete ${user?.username}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteUser(id, token);
            Alert.alert("Success", "User has been deleted.");
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

  if (!user || !editedUser) {
    return <Text style={styles.centered}>User not found.</Text>;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.card, { marginTop: 0 }]}>
        <Text style={styles.cardTitle}>Edit User Details</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={editedUser.username}
            onChangeText={(v) => handleValueChange("username", v)}
            placeholderTextColor="#8A94A3"
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={editedUser.email}
            onChangeText={(v) => handleValueChange("email", v)}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#8A94A3"
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Points</Text>
          <TextInput
            style={styles.input}
            value={String(editedUser.points ?? 0)}
            onChangeText={(v) => handleValueChange("points", Number(v) || 0)}
            keyboardType="number-pad"
            placeholderTextColor="#8A94A3"
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Manage Roles</Text>
        <View style={styles.switchRow}>
          <Text style={styles.text}>Admin</Text>
          <Switch
            value={editedUser.is_admin ?? false}
            onValueChange={(v) => handleValueChange("is_admin", v)}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.text}>Dealer</Text>
          <Switch
            value={editedUser.is_dealer ?? false}
            onValueChange={(v) => handleValueChange("is_dealer", v)}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.text}>Rental Company</Text>
          <Switch
            value={editedUser.is_rental_company ?? false}
            onValueChange={(v) => handleValueChange("is_rental_company", v)}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.text}>Verified</Text>
          <Switch
            value={editedUser.is_verified ?? false}
            onValueChange={(v) => handleValueChange("is_verified", v)}
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
        <Text style={styles.buttonText}>Delete User</Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#14181F", paddingVertical: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    backgroundColor: "#1C212B",
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 16,
    marginTop: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#F8F8F8",
    marginBottom: 10,
  },
  text: { fontSize: 16, marginBottom: 8, color: "#F8F8F8" },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: "#8A94A3",
    marginBottom: 5,
  },
  input: {
    backgroundColor: "#14181F",
    color: "#F8F8F8",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#313843",
    fontSize: 16,
  },
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
    marginHorizontal: 16,
    marginTop: 16,
  },
  saveButton: { backgroundColor: "#A370F7" },
  deleteButton: { backgroundColor: "#dc3545", marginBottom: 32 },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});

export default UserDetailsPage;
