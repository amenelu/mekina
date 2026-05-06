import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import API_BASE_URL from "@/constants/Api";
import { useAuth } from "@/hooks/useAuth";

const COLORS = {
  background: "#14181F",
  card: "#1C212B",
  text: "#F8F8F8",
  textSecondary: "#8A94A3",
  accent: "#A370F7",
  input: "#14181F",
  border: "#313843",
};

export default function RentalSubmitScreen() {
  const { token } = useAuth() as any;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [pricePerDay, setPricePerDay] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Photo library access is required.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: 8,
    });

    if (!result.canceled) {
      setImages(result.assets);
    }
  };

  const handleSubmit = async () => {
    if (!token) {
      Alert.alert("Login Required", "Please log in before adding a rental.");
      router.replace("/(auth)/login");
      return;
    }

    if (!make || !model || !year || !pricePerDay) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    if (images.length === 0) {
      Alert.alert("Error", "Please upload at least one photo.");
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("make", make);
    formData.append("model", model);
    formData.append("year", year);
    formData.append("description", description);
    formData.append("listing_type", "rental");
    formData.append("price_per_day", pricePerDay);
    formData.append("condition", "Used");
    formData.append("body_type", "SUV");
    formData.append("transmission", "Automatic");
    formData.append("drivetrain", "FWD");
    formData.append("fuel_type", "Gasoline");

    images.forEach((image) => {
      formData.append("images", {
        uri: image.uri,
        name: image.fileName || `rental_${Date.now()}.jpg`,
        type: image.mimeType || "image/jpeg",
      } as any);
    });

    try {
      await axios.post(`${API_BASE_URL}/seller/api/cars`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      Alert.alert("Success", "Your rental has been submitted for approval.", [
        { text: "OK", onPress: () => router.replace("/(rental)/dashboard") },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Submission Failed",
        error.response?.data?.message || "Failed to submit rental."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Add Rental Vehicle</Text>
          <Text style={styles.headerSubtitle}>
            Create a new fleet listing for daily rentals.
          </Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Make</Text>
            <TextInput
              style={styles.input}
              value={make}
              onChangeText={setMake}
              placeholder="e.g., Toyota"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Model</Text>
            <TextInput
              style={styles.input}
              value={model}
              onChangeText={setModel}
              placeholder="e.g., Land Cruiser Prado"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Year</Text>
            <TextInput
              style={styles.input}
              value={year}
              onChangeText={setYear}
              keyboardType="number-pad"
              placeholder="e.g., 2022"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Price Per Day (ETB)</Text>
            <TextInput
              style={styles.input}
              value={pricePerDay}
              onChangeText={setPricePerDay}
              keyboardType="number-pad"
              placeholder="e.g., 9500"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              multiline
              placeholder="Highlight pickup, seating, luggage room, driver options, or special terms."
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Fleet Photos</Text>
          {images.length > 0 ? (
            <ScrollView horizontal style={styles.imageScrollView}>
              {images.map((img, index) => (
                <Image key={index} source={{ uri: img.uri }} style={styles.thumbnail} />
              ))}
            </ScrollView>
          ) : null}
          <Pressable style={styles.imagePickerButton} onPress={pickImages}>
            <Ionicons name="images-outline" size={20} color={COLORS.accent} />
            <Text style={styles.imagePickerText}>
              {images.length > 0 ? "Reselect Photos" : "Select Photos"}
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Rental</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 20 },
  headerTitle: { color: COLORS.text, fontSize: 24, fontWeight: "bold" },
  headerSubtitle: { color: COLORS.textSecondary, marginTop: 4, fontSize: 16 },
  formCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
  },
  inputGroup: { marginBottom: 15 },
  label: { color: COLORS.textSecondary, fontSize: 14, marginBottom: 8 },
  input: {
    backgroundColor: COLORS.input,
    color: COLORS.text,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 16,
  },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  imageScrollView: { marginBottom: 15 },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: COLORS.input,
  },
  imagePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.accent,
    borderStyle: "dashed",
  },
  imagePickerText: { color: COLORS.accent, fontSize: 16, fontWeight: "600" },
  submitButton: {
    backgroundColor: COLORS.accent,
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  submitButtonText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
});
