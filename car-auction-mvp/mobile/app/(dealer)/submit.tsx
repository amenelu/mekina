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
};

const CarSubmissionForm = () => {
  const navigation = useNavigation();
  const router = useRouter();
  const { token } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);

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

    if (!make || !model || !year || !price) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    if (images.length === 0) {
      Alert.alert("Error", "Please upload at least one photo of the car.");
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
    // Add other default values
    formData.append("condition", "Used");
    formData.append("body_type", "Sedan");
    formData.append("transmission", "Automatic");
    formData.append("drivetrain", "FWD");
    formData.append("fuel_type", "Gasoline");

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
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>List a New Car</Text>
          <Text style={styles.headerSubtitle}>
            Fill out the details below to submit your vehicle for approval.
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
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Car Photos</Text>
          {images.length > 0 && (
            <ScrollView horizontal style={styles.imageScrollView}>
              {images.map((img, index) => (
                <Image
                  key={index}
                  source={{ uri: img.uri }}
                  style={styles.thumbnail}
                />
              ))}
            </ScrollView>
          )}
          <Pressable style={styles.imagePickerButton} onPress={handleImagePick}>
            <Ionicons name="camera" size={20} color={COLORS.accent} />
            <Text style={styles.imagePickerText}>
              {images.length > 0 ? "Reselect Images" : "Select Images"}
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitButtonText}>Submit for Approval</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 20 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: COLORS.text },
  headerSubtitle: { fontSize: 16, color: COLORS.textSecondary, marginTop: 4 },
  formCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
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
  submitButton: {
    backgroundColor: COLORS.accent,
    margin: 20,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
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
  imagePickerText: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: "600",
  },
});

export default CarSubmissionForm;
