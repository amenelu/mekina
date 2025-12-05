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

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  border: "#313843",
  success: "#28a745",
  destructive: "#dc3545",
};

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
  condition?: string;
  body_type?: string;
  mileage?: number;
  transmission?: string;
  drivetrain?: string;
  fuel_type?: string;
  is_featured?: boolean;
  owner?: { username: string };
  auction?: { current_price: number; end_time: string };
  rental_listing?: { price_per_day: number };
  images?: { id: number; image_url: string }[];
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

/**
 * API function to update listing data.
 */
const updateListing = async (
  id: string,
  data: Partial<Listing>,
  token: string | null,
  images: ImagePicker.ImagePickerAsset[]
) => {
  if (!token) throw new Error("Authentication token not found.");

  const formData = new FormData();

  // Append all non-image fields
  Object.entries(data).forEach(([key, value]) => {
    if (value !== null && value !== undefined && key !== "images") {
      formData.append(key, String(value));
    }
  });

  // Append new image files
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
 * Renders the listing details page.
 */
const ListingDetailsPage: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { token } = useAuth();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editedListing, setEditedListing] = useState<Listing | null>(null);
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
          setListing(data);
          setEditedListing(data);
        })
        .catch((err) => setError(err.message || "Failed to load listing."))
        .finally(() => setLoading(false));
    }
  }, [id, token]);

  useEffect(() => {
    if (listing) {
      navigation.setOptions({ title: `Manage Listing` });
    }
  }, [listing, navigation]);

  const handleValueChange = (
    field: keyof Listing,
    value: string | boolean | number
  ) => {
    if (editedListing) {
      setEditedListing({ ...editedListing, [field]: value });
    }
  };

  const handleSaveChanges = async () => {
    if (!editedListing || !id) return;
    setIsSaving(true);
    try {
      const response = await updateListing(id, editedListing, token, newImages);
      // Update both states with the fresh data from the backend
      setListing(response.car);
      setEditedListing(response.car);
      Alert.alert("Success", "Listing updated successfully.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      const message =
        err.response?.data?.message || "Failed to update listing.";
      Alert.alert("Error", message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!id) return;
    try {
      await manageListingAction(id, "approve", token);
      Alert.alert("Success", "Listing has been approved.");
      // Update both states to reflect the change immediately
      const updatedState = { ...editedListing, is_approved: true } as Listing;
      setListing(updatedState);
      setEditedListing(updatedState);
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

  const handleImagePick = async () => {
    // Request permissions
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

  if (!listing || !editedListing) {
    return <Text style={styles.centered}>Listing not found.</Text>;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Edit Listing</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Make</Text>
          <TextInput
            style={styles.input}
            value={editedListing.make}
            onChangeText={(v) => handleValueChange("make", v)}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Model</Text>
          <TextInput
            style={styles.input}
            value={editedListing.model}
            onChangeText={(v) => handleValueChange("model", v)}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Year</Text>
          <TextInput
            style={styles.input}
            value={String(editedListing.year)}
            onChangeText={(v) => handleValueChange("year", Number(v) || 0)}
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, { height: 100, textAlignVertical: "top" }]}
            value={editedListing.description}
            onChangeText={(v) => handleValueChange("description", v)}
            multiline
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Manage Images</Text>
        <Text style={styles.label}>Current Images</Text>
        <ScrollView horizontal style={styles.imageScrollView}>
          {editedListing.images?.map((img) => (
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
        <Text style={styles.cardTitle}>Specifications</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Condition</Text>
          <TextInput
            style={styles.input}
            value={editedListing.condition ?? ""}
            onChangeText={(v) => handleValueChange("condition", v)}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Body Type</Text>
          <TextInput
            style={styles.input}
            value={editedListing.body_type ?? ""}
            onChangeText={(v) => handleValueChange("body_type", v)}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mileage (km)</Text>
          <TextInput
            style={styles.input}
            value={String(editedListing.mileage ?? 0)}
            onChangeText={(v) => handleValueChange("mileage", Number(v) || 0)}
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Transmission</Text>
          <TextInput
            style={styles.input}
            value={editedListing.transmission ?? ""}
            onChangeText={(v) => handleValueChange("transmission", v)}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Drivetrain</Text>
          <TextInput
            style={styles.input}
            value={editedListing.drivetrain ?? ""}
            onChangeText={(v) => handleValueChange("drivetrain", v)}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Fuel Type</Text>
          <TextInput
            style={styles.input}
            value={editedListing.fuel_type ?? ""}
            onChangeText={(v) => handleValueChange("fuel_type", v)}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Pricing</Text>
        {editedListing.listing_type === "sale" && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Fixed Price (ETB)</Text>
            <TextInput
              style={styles.input}
              value={String(editedListing.fixed_price ?? 0)}
              onChangeText={(v) =>
                handleValueChange("fixed_price", Number(v) || 0)
              }
              keyboardType="number-pad"
            />
          </View>
        )}
        {editedListing.listing_type === "rental" && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Price Per Day (ETB)</Text>
            <TextInput
              style={styles.input}
              value={String(editedListing.rental_listing?.price_per_day ?? 0)}
              // Note: This is a nested property, updating it requires more complex state handling
              // For now, this is a read-only representation.
              editable={false}
            />
          </View>
        )}
        {editedListing.listing_type === "auction" && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Current Bid (ETB)</Text>
            <TextInput
              style={styles.input}
              value={String(editedListing.auction?.current_price ?? 0)}
              editable={false} // Current price is not directly editable
            />
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Manage Status</Text>
        <View style={styles.switchRow}>
          <Text style={styles.text}>Approved</Text>
          <Switch
            value={editedListing.is_approved}
            onValueChange={(v) => handleValueChange("is_approved", v)}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.text}>Active</Text>
          <Switch
            value={editedListing.is_active}
            onValueChange={(v) => handleValueChange("is_active", v)}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.text}>Featured</Text>
          <Switch
            value={editedListing.is_featured ?? false}
            onValueChange={(v) => handleValueChange("is_featured", v)}
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

      {!editedListing.is_approved && (
        <Pressable
          style={[styles.button, styles.approveButton]}
          onPress={handleApprove}
        >
          <Text style={styles.buttonText}>Approve Now</Text>
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
  imageScrollView: {
    marginBottom: 15,
  },
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
  approveButton: { backgroundColor: "#28a745" },
  deleteButton: { backgroundColor: "#dc3545", marginBottom: 32 },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
export default ListingDetailsPage;
