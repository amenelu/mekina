import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
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

const CONDITION_OPTIONS = ["Used", "New"] as const;
const BODY_TYPE_OPTIONS = [
  "SUV",
  "Sedan",
  "Hatchback",
  "Pickup",
  "Coupe",
  "Minivan",
] as const;
const TRANSMISSION_OPTIONS = ["Automatic", "Manual"] as const;
const DRIVETRAIN_OPTIONS = ["FWD", "RWD", "AWD", "4WD"] as const;
const FUEL_TYPE_OPTIONS = ["Gasoline", "Diesel", "Electric", "Hybrid"] as const;

const ChoiceGroup = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) => (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.choiceGroup}>
      {options.map((option) => {
        const selected = value === option;
        return (
          <Pressable
            key={option}
            style={[styles.choiceChip, selected && styles.choiceChipSelected]}
            onPress={() => onChange(option)}
          >
            <Text
              style={[
                styles.choiceChipText,
                selected && styles.choiceChipTextSelected,
              ]}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  </View>
);

export default function RentalSubmitScreen() {
  const { token } = useAuth() as any;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState<"error" | "success" | null>(null);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [pricePerDay, setPricePerDay] = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] =
    useState<(typeof CONDITION_OPTIONS)[number]>("Used");
  const [bodyType, setBodyType] =
    useState<(typeof BODY_TYPE_OPTIONS)[number]>("SUV");
  const [transmission, setTransmission] =
    useState<(typeof TRANSMISSION_OPTIONS)[number]>("Automatic");
  const [drivetrain, setDrivetrain] =
    useState<(typeof DRIVETRAIN_OPTIONS)[number]>("FWD");
  const [fuelType, setFuelType] =
    useState<(typeof FUEL_TYPE_OPTIONS)[number]>("Gasoline");
  const [mileage, setMileage] = useState("");
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);

  const showStatus = (
    type: "error" | "success",
    title: string,
    message: string
  ) => {
    setStatusType(type);
    setStatusMessage(message);
    if (Platform.OS !== "web") {
      Alert.alert(title, message);
    }
  };

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showStatus("error", "Permission Denied", "Photo library access is required.");
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

  const appendImagesToFormData = async (formData: FormData) => {
    for (const image of images) {
      const webFile = (image as any).file;

      if (Platform.OS === "web" && webFile instanceof File) {
        formData.append("images", webFile, webFile.name);
        continue;
      }

      if (Platform.OS === "web" && image.uri) {
        const response = await fetch(image.uri);
        const blob = await response.blob();
        formData.append(
          "images",
          blob,
          image.fileName || `rental_${Date.now()}.jpg`
        );
        continue;
      }

      formData.append("images", {
        uri: image.uri,
        name: image.fileName || `rental_${Date.now()}.jpg`,
        type: image.mimeType || "image/jpeg",
      } as any);
    }
  };

  const handleSubmit = async () => {
    if (!token) {
      showStatus("error", "Login Required", "Please log in before adding a rental.");
      router.replace("/(auth)/login");
      return;
    }

    if (!make || !model || !year || !pricePerDay) {
      showStatus("error", "Error", "Please fill in all required fields.");
      return;
    }

    if (images.length === 0) {
      showStatus("error", "Error", "Please upload at least one photo.");
      return;
    }

    setStatusMessage("");
    setStatusType(null);
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("make", make);
    formData.append("model", model);
    formData.append("year", year);
    formData.append("description", description);
    formData.append("listing_type", "rental");
    formData.append("price_per_day", pricePerDay);
    formData.append("condition", condition);
    formData.append("body_type", bodyType);
    formData.append("transmission", transmission);
    formData.append("drivetrain", drivetrain);
    formData.append("fuel_type", fuelType);
    if (mileage.trim()) {
      formData.append("mileage", mileage);
    }

    try {
      await appendImagesToFormData(formData);
      await axios.post(`${API_BASE_URL}/seller/api/cars`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (Platform.OS === "web") {
        setStatusType("success");
        setStatusMessage("Your rental has been submitted for approval.");
        router.replace("/(rental)/rental-dashboard");
        return;
      }

      Alert.alert("Success", "Your rental has been submitted for approval.", [
        { text: "OK", onPress: () => router.replace("/(rental)/rental-dashboard") },
      ]);
    } catch (error: any) {
      showStatus(
        "error",
        "Submission Failed",
        error.response?.data?.message || "Failed to submit rental."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.pageShell}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Add Rental Vehicle</Text>
            <Text style={styles.headerSubtitle}>
              Create a new fleet listing for daily rentals.
            </Text>
          </View>

          {statusMessage ? (
            <View
              style={[
                styles.statusBanner,
                statusType === "success"
                  ? styles.successBanner
                  : styles.errorBanner,
              ]}
            >
              <Text
                style={[
                  styles.statusBannerText,
                  statusType === "success"
                    ? styles.successBannerText
                    : styles.errorBannerText,
                ]}
              >
                {statusMessage}
              </Text>
            </View>
          ) : null}

          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Make</Text>
              <TextInput
                style={styles.input}
                value={make}
                onChangeText={(value) => {
                  setMake(value);
                  if (statusMessage) {
                    setStatusMessage("");
                    setStatusType(null);
                  }
                }}
                placeholder="e.g., Toyota"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Model</Text>
              <TextInput
                style={styles.input}
                value={model}
                onChangeText={(value) => {
                  setModel(value);
                  if (statusMessage) {
                    setStatusMessage("");
                    setStatusType(null);
                  }
                }}
                placeholder="e.g., Land Cruiser Prado"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Year</Text>
              <TextInput
                style={styles.input}
                value={year}
                onChangeText={(value) => {
                  setYear(value);
                  if (statusMessage) {
                    setStatusMessage("");
                    setStatusType(null);
                  }
                }}
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
                onChangeText={(value) => {
                  setPricePerDay(value);
                  if (statusMessage) {
                    setStatusMessage("");
                    setStatusType(null);
                  }
                }}
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
                onChangeText={(value) => {
                  setDescription(value);
                  if (statusMessage) {
                    setStatusMessage("");
                    setStatusType(null);
                  }
                }}
                multiline
                placeholder="Highlight pickup, seating, luggage room, driver options, or special terms."
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <ChoiceGroup
              label="Condition"
              value={condition}
              options={CONDITION_OPTIONS}
              onChange={(value) => {
                setCondition(value as (typeof CONDITION_OPTIONS)[number]);
                if (statusMessage) {
                  setStatusMessage("");
                  setStatusType(null);
                }
              }}
            />
            <ChoiceGroup
              label="Body Type"
              value={bodyType}
              options={BODY_TYPE_OPTIONS}
              onChange={(value) => {
                setBodyType(value as (typeof BODY_TYPE_OPTIONS)[number]);
                if (statusMessage) {
                  setStatusMessage("");
                  setStatusType(null);
                }
              }}
            />
            <ChoiceGroup
              label="Transmission"
              value={transmission}
              options={TRANSMISSION_OPTIONS}
              onChange={(value) => {
                setTransmission(value as (typeof TRANSMISSION_OPTIONS)[number]);
                if (statusMessage) {
                  setStatusMessage("");
                  setStatusType(null);
                }
              }}
            />
            <ChoiceGroup
              label="Drivetrain"
              value={drivetrain}
              options={DRIVETRAIN_OPTIONS}
              onChange={(value) => {
                setDrivetrain(value as (typeof DRIVETRAIN_OPTIONS)[number]);
                if (statusMessage) {
                  setStatusMessage("");
                  setStatusType(null);
                }
              }}
            />
            <ChoiceGroup
              label="Fuel Type"
              value={fuelType}
              options={FUEL_TYPE_OPTIONS}
              onChange={(value) => {
                setFuelType(value as (typeof FUEL_TYPE_OPTIONS)[number]);
                if (statusMessage) {
                  setStatusMessage("");
                  setStatusType(null);
                }
              }}
            />
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mileage {condition === "Used" ? "(Recommended)" : "(Optional)"}</Text>
              <TextInput
                style={styles.input}
                value={mileage}
                onChangeText={(value) => {
                  setMileage(value);
                  if (statusMessage) {
                    setStatusMessage("");
                    setStatusType(null);
                  }
                }}
                keyboardType="number-pad"
                placeholder="e.g., 42000"
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 24 },
  pageShell: {
    width: "100%",
    maxWidth: Platform.OS === "web" ? 980 : undefined,
    alignSelf: "center",
  },
  header: { padding: 20 },
  headerTitle: { color: COLORS.text, fontSize: 24, fontWeight: "bold" },
  headerSubtitle: { color: COLORS.textSecondary, marginTop: 4, fontSize: 16 },
  statusBanner: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  successBanner: {
    backgroundColor: "rgba(40, 167, 69, 0.14)",
    borderColor: "rgba(40, 167, 69, 0.34)",
  },
  errorBanner: {
    backgroundColor: "rgba(220, 53, 69, 0.14)",
    borderColor: "rgba(220, 53, 69, 0.34)",
  },
  statusBannerText: {
    fontSize: 14,
    fontWeight: "600",
  },
  successBannerText: {
    color: "#7ddc96",
  },
  errorBannerText: {
    color: "#ff9aa7",
  },
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
  choiceGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  choiceChip: {
    backgroundColor: COLORS.input,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  choiceChipSelected: {
    backgroundColor: "rgba(163, 112, 247, 0.18)",
    borderColor: COLORS.accent,
  },
  choiceChipText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  choiceChipTextSelected: {
    color: COLORS.accent,
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
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  submitButtonText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
});
