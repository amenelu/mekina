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
  TextInput,
  Switch,
  Image,
} from "react-native";
import axios from "axios";
import { API_BASE_URL } from "@/apiConfig";
import { useAuth } from "@/hooks/useAuth";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

/**
 * @interface Rental
 * Defines the structure for a rental object.
 */
interface Rental {
  id: number;
  make: string;
  model: string;
  year: number;
  description: string;
  listing_type: "sale" | "auction" | "rental";
  is_approved: boolean;
  is_active: boolean;
  condition?: string;
  body_type?: string;
  mileage?: number;
  transmission?: string;
  drivetrain?: string;
  fuel_type?: string;
  is_featured?: boolean;
  owner?: { username: string };
  rental_listing?: { price_per_day: number };
  images?: { id: number; image_url: string }[];
}

/**
 * API function to fetch rental data.
 * @param {string} id - The ID of the rental to fetch.
 * @param {string | null} token - The authentication token.
 * @returns {Promise<Rental>} A promise that resolves to the rental data.
 */
const fetchListing = async (
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

const updateListing = async (
  id: string,
  data: Partial<Rental>,
  token: string | null,
  images: ImagePicker.ImagePickerAsset[]
) => {
  if (!token) throw new Error("Authentication token not found.");
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== null && value !== undefined && key !== "images") {
      formData.append(key, String(value));
    }
  });
  images.forEach((image) => {
    formData.append("images", {
      uri: image.uri,
      name: image.fileName,
      type: image.mimeType,
    } as any);
  });
  const response = await axios.put(
    `${API_BASE_URL}/admin/api/listings/${id}`,
    formData,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

const deleteListing = async (id: string, token: string | null) => {
  if (!token) throw new Error("Authentication token not found.");
  await axios.delete(`${API_BASE_URL}/admin/api/listings/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

const ImageThumbnail = ({
  image,
}: {
  image: { id: number; image_url: string };
}) => {
  const [isLoading, setIsLoading] = useState(true);
  return (
    <View style={styles.thumbnail}>
      <Image
        source={{ uri: image.image_url }}
        style={StyleSheet.absoluteFill}
        onLoadEnd={() => setIsLoading(false)}
      />
      {isLoading && (
        <ActivityIndicator
          style={StyleSheet.absoluteFill}
          color={COLORS.accent}
        />
      )}
    </View>
  );
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
  const [editedRental, setEditedRental] = useState<Rental | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newImages, setNewImages] = useState<ImagePicker.ImagePickerAsset[]>(
    []
  );

  useEffect(() => {
    if (id && token) {
      setLoading(true);
      setError(null);
      fetchListing(id, token)
        .then((data) => {
          setRental(data);
          setEditedRental(data);
        })
        .catch((err) => setError(err.message || "Failed to load rental."))
        .finally(() => setLoading(false));
    }
  }, [id, token]);

  useEffect(() => {
    if (editedRental) {
      navigation.setOptions({
        title: `Manage: ${editedRental.year} ${editedRental.make}`,
      });
    }
  }, [editedRental, navigation]);

  const handleValueChange = (
    field: keyof Rental,
    value: string | boolean | number
  ) => {
    if (editedRental) {
      setEditedRental({ ...editedRental, [field]: value });
    }
  };

  const handleSaveChanges = async () => {
    if (!editedRental || !id) return;
    setIsSaving(true);
    try {
      const response = await updateListing(id, editedRental, token, newImages);
      setRental(response.car);
      setEditedRental(response.car);
      Alert.alert("Success", "Rental listing updated successfully.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      const message =
        err.response?.data?.message || "Failed to update rental listing.";
      Alert.alert("Error", message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert(
      "Delete Rental Listing",
      `Are you sure you want to permanently delete this listing?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteListing(id, token);
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

  const handleImagePick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Sorry, we need camera roll permissions to make this work!"
      );
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
    });
    if (!result.canceled) {
      setNewImages(result.assets);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" style={styles.centered} />;
  }

  if (error) {
    return <Text style={styles.errorText}>Error: {error}</Text>;
  }

  if (!rental || !editedRental) {
    return <Text style={styles.centered}>Rental not found.</Text>;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Edit Rental Details</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Make</Text>
          <TextInput
            style={styles.input}
            value={editedRental.make}
            onChangeText={(v) => handleValueChange("make", v)}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Model</Text>
          <TextInput
            style={styles.input}
            value={editedRental.model}
            onChangeText={(v) => handleValueChange("model", v)}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Year</Text>
          <TextInput
            style={styles.input}
            value={String(editedRental.year)}
            onChangeText={(v) => handleValueChange("year", Number(v) || 0)}
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Price Per Day (ETB)</Text>
          <TextInput
            style={styles.input}
            value={String(editedRental.rental_listing?.price_per_day ?? 0)}
            // This is a nested property, so direct editing is more complex.
            // For now, we can make it read-only or implement a more complex state update.
            editable={false}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Manage Images</Text>
        <Text style={styles.label}>Current Images</Text>
        <ScrollView horizontal style={styles.imageScrollView}>
          {editedRental.images?.map((img) => (
            <ImageThumbnail key={img.id} image={img} />
          ))}
        </ScrollView>
        {newImages.length > 0 && (
          <>
            <Text style={[styles.label, { marginTop: 15 }]}>
              New Images (will replace current)
            </Text>
            <ScrollView horizontal style={styles.imageScrollView}>
              {newImages.map((img, index) => (
                <Image
                  key={index}
                  source={{ uri: img.uri }}
                  style={styles.thumbnail}
                />
              ))}
            </ScrollView>
          </>
        )}
        <Pressable style={styles.imagePickerButton} onPress={handleImagePick}>
          <Ionicons name="camera" size={20} color={COLORS.accent} />
          <Text style={styles.imagePickerText}>
            {newImages.length > 0 ? "Reselect Images" : "Select New Images"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Manage Status</Text>
        <View style={styles.switchRow}>
          <Text style={styles.text}>Approved</Text>
          <Switch
            value={editedRental.is_approved}
            onValueChange={(v) => handleValueChange("is_approved", v)}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.text}>Active</Text>
          <Switch
            value={editedRental.is_active}
            onValueChange={(v) => handleValueChange("is_active", v)}
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
        onPress={handleDelete}
      >
        <Text style={styles.buttonText}>Delete Listing</Text>
      </Pressable>
    </ScrollView>
  );
};

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  border: "#313843",
  success: "#28a745",
  destructive: "#dc3545",
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
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 14, color: "#8A94A3", marginBottom: 5 },
  input: {
    backgroundColor: "#14181F",
    color: "#F8F8F8",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#313843",
    fontSize: 16,
  },
  imageScrollView: { marginBottom: 15 },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: "#14181F",
  },
  imagePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "transparent",
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.accent,
    borderStyle: "dashed",
  },
  imagePickerText: { color: COLORS.accent, fontSize: 16, fontWeight: "600" },
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

export default RentalDetailsPage;
