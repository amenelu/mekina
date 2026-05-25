import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { DEALER_ROUTES } from "@/lib/roleRoutes";
import { createSellerCar } from "@/lib/api/rentals";
import { showNativeFlowAlert } from "@/lib/nativeFlowAlert";
import { isWebRuntime, replaceWebRoute } from "@/lib/webRouteReset";

const COLORS = {
  background: "#14181F",
  card: "#1C212B",
  text: "#F8F8F8",
  textSecondary: "#8A94A3",
  accent: "#A370F7",
  input: "#14181F",
  border: "#313843",
  danger: "#E35D6A",
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

const CarSubmissionForm = () => {
  const { width } = useWindowDimensions();
  const navigation = useNavigation();
  const router = useRouter();
  const { token } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] =
    useState<(typeof CONDITION_OPTIONS)[number]>("Used");
  const [mileage, setMileage] = useState("");
  const [bodyType, setBodyType] =
    useState<(typeof BODY_TYPE_OPTIONS)[number]>("SUV");
  const [transmission, setTransmission] =
    useState<(typeof TRANSMISSION_OPTIONS)[number]>("Automatic");
  const [drivetrain, setDrivetrain] =
    useState<(typeof DRIVETRAIN_OPTIONS)[number]>("FWD");
  const [fuelType, setFuelType] =
    useState<(typeof FUEL_TYPE_OPTIONS)[number]>("Gasoline");
  const [electricRangeKm, setElectricRangeKm] = useState("");
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0);
  const needsRange = fuelType === "Electric" || fuelType === "Hybrid";
  const isWideWeb = Platform.OS === "web" && width >= 1000;
  const showRequiredAlert = (message: string) => {
    showNativeFlowAlert("Missing Required Details", message);
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
          image.fileName || `dealer_${Date.now()}.jpg`
        );
        continue;
      }

      formData.append("images", {
        uri: image.uri,
        name: image.fileName || `dealer_${Date.now()}.jpg`,
        type: image.mimeType || "image/jpeg",
      } as any);
    }
  };

  const handleSubmit = async () => {
    if (!token) {
      showNativeFlowAlert(
        "Login Required",
        "Please log in before submitting a listing.",
        () => router.replace("/(auth)/login")
      );
      return;
    }

    const missingFields = [
      !make.trim() ? "Make" : null,
      !model.trim() ? "Model" : null,
      !year.trim() ? "Year" : null,
      !price.trim() ? "Sale price" : null,
    ].filter(Boolean);

    if (missingFields.length > 0) {
      showRequiredAlert(`Please fill in: ${missingFields.join(", ")}.`);
      return;
    }

    if (condition === "Used" && !mileage.trim()) {
      showRequiredAlert("Mileage is required for used cars.");
      return;
    }

    if (needsRange && !electricRangeKm.trim()) {
      showRequiredAlert("Range is required for hybrid and electric cars.");
      return;
    }

    if (images.length === 0) {
      showRequiredAlert("Please upload at least one photo of the car.");
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("make", make);
    formData.append("model", model);
    formData.append("year", year);
    formData.append("description", description);
    formData.append("listing_type", "sale");
    formData.append("fixed_price", price);
    formData.append("condition", condition);
    formData.append("body_type", bodyType);
    formData.append("transmission", transmission);
    formData.append("drivetrain", drivetrain);
    formData.append("fuel_type", fuelType);
    formData.append("primary_image_index", String(primaryImageIndex));
    if (condition === "Used" && mileage.trim()) {
      formData.append("mileage", mileage);
    }
    if (needsRange && electricRangeKm.trim()) {
      formData.append("electric_range_km", electricRangeKm);
    }

    try {
      await appendImagesToFormData(formData);

      // Using the seller API endpoint to submit a new car
      await createSellerCar(formData);

      if (isWebRuntime()) {
        showNativeFlowAlert(
          "Success",
          "Your car has been submitted for approval.",
          () => {
            replaceWebRoute(DEALER_ROUTES.dashboard);
          }
        );
        return;
      }

      showNativeFlowAlert(
        "Success",
        "Your car has been submitted for approval.",
        () => {
          navigation.goBack();
        }
      );
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.userMessage ||
        "Failed to submit car.";
      showNativeFlowAlert("Submission Failed", message);
    } finally {
      setIsSubmitting(false);
    }
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
      quality: 0.7,
      selectionLimit: 8,
    });
    if (!result.canceled) {
      setImages(result.assets);
      setPrimaryImageIndex(0);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={[styles.pageShell, isWideWeb && styles.pageShellWide]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>List a New Car</Text>
          <Text style={styles.headerSubtitle}>
            Fill out the details below to submit your vehicle for approval.
          </Text>
        </View>

        <View style={[styles.formCard, isWideWeb && styles.formCardWide]}>
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
              placeholder="e.g., Camry"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Year</Text>
            <TextInput
              style={styles.input}
              value={year}
              onChangeText={setYear}
              placeholder="e.g., 2021"
              keyboardType="number-pad"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sale Price (ETB)</Text>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              placeholder="e.g., 2,500,000"
              keyboardType="number-pad"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, { height: 100, textAlignVertical: "top" }]}
              value={description}
              onChangeText={setDescription}
              multiline
              placeholder="Add any extra details about the car..."
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>
          <ChoiceGroup
            label="Condition"
            value={condition}
            options={CONDITION_OPTIONS}
            onChange={(value) => {
              setCondition(value as (typeof CONDITION_OPTIONS)[number]);
              if (value === "New") {
                setMileage("");
              }
            }}
          />
          {condition === "Used" && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mileage (km)</Text>
              <TextInput
                style={styles.input}
                value={mileage}
                onChangeText={setMileage}
                placeholder="e.g., 42000"
                keyboardType="number-pad"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
          )}
          <ChoiceGroup
            label="Body Type"
            value={bodyType}
            options={BODY_TYPE_OPTIONS}
            onChange={(value) =>
              setBodyType(value as (typeof BODY_TYPE_OPTIONS)[number])
            }
          />
          <ChoiceGroup
            label="Transmission"
            value={transmission}
            options={TRANSMISSION_OPTIONS}
            onChange={(value) =>
              setTransmission(value as (typeof TRANSMISSION_OPTIONS)[number])
            }
          />
          <ChoiceGroup
            label="Drivetrain"
            value={drivetrain}
            options={DRIVETRAIN_OPTIONS}
            onChange={(value) =>
              setDrivetrain(value as (typeof DRIVETRAIN_OPTIONS)[number])
            }
          />
          <ChoiceGroup
            label="Fuel Type"
            value={fuelType}
            options={FUEL_TYPE_OPTIONS}
            onChange={(value) => {
              setFuelType(value as (typeof FUEL_TYPE_OPTIONS)[number]);
              if (value !== "Electric" && value !== "Hybrid") {
                setElectricRangeKm("");
              }
            }}
          />
          {needsRange && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Range (km)</Text>
              <TextInput
                style={styles.input}
                value={electricRangeKm}
                onChangeText={setElectricRangeKm}
                placeholder="e.g., 450"
                keyboardType="number-pad"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
          )}
        </View>

        <View style={[styles.formCard, isWideWeb && styles.formCardWide]}>
          <Text style={styles.label}>Car Photos</Text>
          {images.length > 0 && (
            <ScrollView horizontal style={styles.imageScrollView}>
              {images.map((img, index) => (
                <Pressable
                  key={index}
                  style={styles.thumbnailButton}
                  onPress={() => setPrimaryImageIndex(index)}
                >
                  <Image
                    source={{ uri: img.uri }}
                    style={[
                      styles.thumbnail,
                      index === primaryImageIndex && styles.thumbnailSelected,
                    ]}
                  />
                  {index === primaryImageIndex ? (
                    <View style={styles.displayBadge}>
                      <Text style={styles.displayBadgeText}>Display</Text>
                    </View>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          )}
          {images.length > 0 ? (
            <Text style={styles.imageHint}>
              Tap a photo to choose the display picture.
            </Text>
          ) : null}
          <Pressable style={styles.imagePickerButton} onPress={handleImagePick}>
            <Ionicons name="camera" size={20} color={COLORS.accent} />
            <Text style={styles.imagePickerText}>
              {images.length > 0 ? "Reselect Images" : "Select Images"}
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={[styles.submitButton, isWideWeb && styles.submitButtonWide]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitButtonText}>Submit for Approval</Text>
          )}
        </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  pageShell: { width: "100%" },
  pageShellWide: {
    maxWidth: 1040,
    width: "100%",
    alignSelf: "center",
    paddingTop: 28,
    paddingHorizontal: 28,
  },
  header: { padding: 20 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: COLORS.text },
  headerSubtitle: { fontSize: 16, color: COLORS.textSecondary, marginTop: 4 },
  formCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
  },
  formCardWide: {
    marginHorizontal: 0,
    marginBottom: 20,
    padding: 24,
  },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 8 },
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
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.input,
  },
  choiceChipSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accent,
  },
  choiceChipText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  choiceChipTextSelected: {
    color: COLORS.text,
  },
  submitButton: {
    backgroundColor: COLORS.accent,
    margin: 20,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  submitButtonWide: {
    marginHorizontal: 0,
    marginTop: 4,
    marginBottom: 36,
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  imageScrollView: {
    marginBottom: 15,
  },
  thumbnailButton: {
    marginRight: 10,
    position: "relative",
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#14181F",
    borderWidth: 2,
    borderColor: "transparent",
  },
  thumbnailSelected: {
    borderColor: COLORS.accent,
  },
  displayBadge: {
    position: "absolute",
    left: 6,
    bottom: 6,
    backgroundColor: COLORS.accent,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  displayBadgeText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "800",
  },
  imageHint: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 12,
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
  imagePickerText: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: "600",
  },
});

export default CarSubmissionForm;
