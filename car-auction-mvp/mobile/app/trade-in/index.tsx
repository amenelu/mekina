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
  Platform,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";
import { createTradeIn } from "@/lib/api/tradeIn";
import { showNativeFlowAlert } from "@/lib/nativeFlowAlert";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  border: "#313843",
  mutedForeground: "#8A94A3",
};

const MIN_TRADE_IN_PHOTOS = 10;
const MAX_TRADE_IN_PHOTOS = 20;

const TradeInScreen = () => {
  const router = useRouter();
  const { token } = useAuth();
  const { width } = useWindowDimensions();
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
  const isWideWeb = Platform.OS === "web" && width >= 1000;

  const handleImagePick = async () => {
    if (images.length >= MAX_TRADE_IN_PHOTOS) {
      Alert.alert(
        "Image Limit",
        `You can upload up to ${MAX_TRADE_IN_PHOTOS} photos for a trade-in.`
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
      base64: true,
      selectionLimit: MAX_TRADE_IN_PHOTOS - images.length,
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
      showNativeFlowAlert(
        "Login Required",
        "Please log in before submitting a trade-in request.",
        () => router.replace("/(auth)/login")
      );
      return;
    }

    if (!make || !model || !year || !mileage) {
      Alert.alert(
        "Missing Information",
        "Please fill in all required fields (Make, Model, Year, Mileage)."
      );
      return;
    }

    if (base64Images.length < MIN_TRADE_IN_PHOTOS) {
      Alert.alert(
        "More Photos Required",
        `Please upload at least ${MIN_TRADE_IN_PHOTOS} photos of your car before submitting.`
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

      const response = await createTradeIn(payload);

      if (response.status === 201) {
        showNativeFlowAlert(
          "Offer Submitted",
          "Thank you! We will review your submission and get back to you with a trade-in offer soon.",
          () => router.replace("/my-requests"),
          "Close"
        );
      }
    } catch (error: any) {
      console.error("Trade-in submission error:", error);
      showNativeFlowAlert(
        "Error",
        error.response?.data?.message ||
          error.userMessage ||
          "Failed to submit trade-in request."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.pageShell, isWideWeb && styles.pageShellWide]}>
          <View style={[styles.header, isWideWeb && styles.headerWide]}>
            {isWideWeb && (
              <Text style={styles.title}>Trade-in Offer</Text>
            )}
            <Text style={styles.subtitle}>
              Tell us about your car to get a competitive trade-in offer.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.formGrid}>
              <TextInput
                style={styles.gridInput}
                placeholder="Make (e.g., Toyota)"
                placeholderTextColor={COLORS.mutedForeground}
                value={make}
                onChangeText={setMake}
              />
              <TextInput
                style={styles.gridInput}
                placeholder="Model (e.g., Vitz)"
                placeholderTextColor={COLORS.mutedForeground}
                value={model}
                onChangeText={setModel}
              />
            </View>
            <View style={styles.formGrid}>
              <TextInput
                style={styles.gridInput}
                placeholder="Year (e.g., 2018)"
                placeholderTextColor={COLORS.mutedForeground}
                value={year}
                onChangeText={setYear}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.gridInput}
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
              <Text style={styles.imagePickerText}>
                Upload Photos ({images.length}/{MIN_TRADE_IN_PHOTOS} minimum)
              </Text>
            </Pressable>
            <Text style={styles.photoRequirementText}>
              Add at least {MIN_TRADE_IN_PHOTOS} clear photos: front, back, both
              sides, interior, dashboard, engine bay, tires, and any damage.
            </Text>

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
        </View>
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: {
    paddingBottom: 24,
  },
  pageShell: {
    width: "100%",
    maxWidth: Platform.OS === "web" ? 760 : undefined,
    alignSelf: "center",
  },
  pageShellWide: {
    maxWidth: 720,
    paddingTop: 34,
  },
  header: { padding: 20, paddingBottom: 10 },
  headerWide: {
    paddingBottom: 22,
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: COLORS.foreground,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginTop: 8,
  },
  form: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 15,
    width: "100%",
    backgroundColor: Platform.OS === "web" ? COLORS.card : "transparent",
    borderRadius: Platform.OS === "web" ? 16 : 0,
    borderWidth: Platform.OS === "web" ? 1 : 0,
    borderColor: COLORS.border,
  },
  formGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15,
    width: "100%",
  },
  input: {
    width: "100%",
    backgroundColor: Platform.OS === "web" ? COLORS.background : COLORS.card,
    color: COLORS.foreground,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 16,
    minWidth: 0,
  },
  gridInput: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: Platform.OS === "web" ? 240 : "100%",
    minWidth: Platform.OS === "web" ? 220 : "100%",
    backgroundColor: Platform.OS === "web" ? COLORS.background : COLORS.card,
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
  photoRequirementText: {
    color: COLORS.mutedForeground,
    fontSize: 13,
    lineHeight: 19,
    marginTop: -6,
  },
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
