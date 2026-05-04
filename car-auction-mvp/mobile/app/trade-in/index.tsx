import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import API_URL from "@/constants/Api";
import { useAuth } from "@/hooks/useAuth";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  border: "#313843",
  mutedForeground: "#8A94A3",
};

const TradeInScreen = () => {
  const router = useRouter();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [mileage, setMileage] = useState("");
  const [vin, setVin] = useState("");
  const [comments, setComments] = useState("");
  const [targetCar, setTargetCar] = useState("");
  const [condition] = useState("Good");
  const [images, setImages] = useState<string[]>([]);
  const [base64Images, setBase64Images] = useState<string[]>([]);

  const handleImagePick = async () => {
    if (images.length >= 6) {
      Alert.alert("Image Limit", "You can upload up to 6 photos for a trade-in.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
      base64: true,
      selectionLimit: 6 - images.length,
    });

    if (!result.canceled) {
      const selectedAssets = result.assets.filter((asset) => Boolean(asset.base64));
      const newUris = selectedAssets.map((asset) => asset.uri);
      const newBase64s = selectedAssets.map(
        (asset) => `data:image/jpeg;base64,${asset.base64}`
      );
      setImages((prev) => [...prev, ...newUris]);
      setBase64Images((prev) => [...prev, ...newBase64s]);
    }
  };

  const handleSubmit = async () => {
    if (!token) {
      Alert.alert("Login Required", "Please log in before submitting a trade-in request.");
      router.replace("/(auth)/login");
      return;
    }

    if (!make || !model || !year || !mileage || base64Images.length === 0) {
      Alert.alert(
        "Missing Information",
        "Please fill in all required fields (Make, Model, Year, Mileage) and upload at least one photo."
      );
      return;
    }

    setLoading(true);
    try {
      const payload = {
        make,
        model,
        year: parseInt(year),
        mileage: parseInt(mileage),
        condition,
        vin,
        targetCar,
        comments,
        images: base64Images,
      };

      const response = await axios.post(`${API_URL}/trade-in/api`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 201) {
        Alert.alert(
          "Offer Submitted",
          "Thank you! We will review your submission and get back to you with a trade-in offer soon.",
          [{ text: "OK", onPress: () => router.back() }]
        );
      }
    } catch (error: any) {
      console.error("Trade-in submission error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to submit trade-in request."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.subtitle}>
          Tell us about your car to get a competitive trade-in offer.
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.formGrid}>
          <TextInput
            style={styles.input}
            placeholder="Make (e.g., Toyota)"
            placeholderTextColor={COLORS.mutedForeground}
            value={make}
            onChangeText={setMake}
          />
          <TextInput
            style={styles.input}
            placeholder="Model (e.g., Vitz)"
            placeholderTextColor={COLORS.mutedForeground}
            value={model}
            onChangeText={setModel}
          />
        </View>
        <View style={styles.formGrid}>
          <TextInput
            style={styles.input}
            placeholder="Year (e.g., 2018)"
            placeholderTextColor={COLORS.mutedForeground}
            value={year}
            onChangeText={setYear}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            placeholder="Mileage (e.g., 55000)"
            placeholderTextColor={COLORS.mutedForeground}
            value={mileage}
            onChangeText={setMileage}
            keyboardType="numeric"
          />
        </View>

        <TextInput
          style={styles.input}
          placeholder="VIN (17-digit Vehicle Identification Number)"
          placeholderTextColor={COLORS.mutedForeground}
          value={vin}
          onChangeText={setVin}
          autoCapitalize="characters"
        />

        <TextInput
          style={styles.input}
          placeholder="Are you trading for a specific car? (e.g. Toyota RAV4)"
          placeholderTextColor={COLORS.mutedForeground}
          value={targetCar}
          onChangeText={setTargetCar}
        />

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Mention any upgrades, recent repairs, or known issues..."
          placeholderTextColor={COLORS.mutedForeground}
          value={comments}
          onChangeText={setComments}
          multiline
        />

        <Pressable style={styles.imagePickerButton} onPress={handleImagePick}>
          <Ionicons name="camera" size={20} color={COLORS.accent} />
          <Text style={styles.imagePickerText}>Upload Photos</Text>
        </Pressable>

        <ScrollView horizontal style={styles.imagePreviewContainer}>
          {images.map((uri, index) => (
            <Image key={index} source={{ uri }} style={styles.previewImage} />
          ))}
        </ScrollView>

        <Pressable
          testID="trade-in-submit"
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.foreground} />
          ) : (
            <Text style={styles.submitButtonText}>Submit for Offer</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 20, paddingBottom: 10 },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.foreground,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginTop: 8,
  },
  form: { padding: 20, gap: 15 },
  formGrid: { flexDirection: "row", gap: 15 },
  input: {
    flex: 1,
    backgroundColor: COLORS.card,
    color: COLORS.foreground,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 16,
  },
  textArea: { height: 100, textAlignVertical: "top" },
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
  imagePreviewContainer: {
    flexDirection: "row",
    marginTop: 10,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 10,
  },
  submitButton: {
    backgroundColor: COLORS.accent,
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  submitButtonText: {
    color: COLORS.foreground,
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default TradeInScreen;
