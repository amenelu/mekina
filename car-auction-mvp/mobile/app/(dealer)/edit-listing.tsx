import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ImageBackground,
  SafeAreaView,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import axios from "axios";
import { useAuth } from "@/hooks/useAuth";
import API_BASE_URL from "@/constants/Api";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const COLORS = {
  background: "#14181F",
  card: "#1C212B",
  text: "#F8F8F8",
  textSecondary: "#8A94A3",
  accent: "#A370F7",
  input: "#14181F",
  border: "#313843",
  destructive: "#dc3545",
};

interface CarImage {
  id: number;
  image_url: string;
  is_primary: boolean;
}

const EditListingScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<CarImage[]>([]);

  useEffect(() => {
    const fetchCarDetails = async () => {
      if (!id || !token) return;
      setLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/api/cars/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const car = response.data.car;
        setMake(car.make);
        setModel(car.model);
        setYear(car.year.toString());
        setPrice(car.fixed_price?.toString() || "");
        setDescription(car.description || "");
        setImages(car.images || []);
      } catch (error) {
        console.error("Failed to fetch car details:", error);
        Alert.alert("Error", "Could not load car details.");
      } finally {
        setLoading(false);
      }
    };
    fetchCarDetails();
  }, [id, token]);

  const handleUpdate = async () => {
    if (!make || !model || !year || !price) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await axios.put(
        `${API_BASE_URL}/dealer/api/cars/${id}/update`,
        {
          make,
          model,
          year,
          price,
          description,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert("Success", response.data.message, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Failed to update listing.";
      Alert.alert("Update Failed", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ActivityIndicator
        size="large"
        color={COLORS.accent}
        style={{ flex: 1, backgroundColor: COLORS.background }}
      />
    );
  }

  const primaryImage = images.find((img) => img.is_primary) || images[0];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <ImageBackground
            source={{
              uri: primaryImage
                ? `${API_BASE_URL}${primaryImage.image_url}`
                : undefined,
            }}
            style={styles.headerImage}
          >
            <LinearGradient
              colors={["rgba(0,0,0,0.8)", "transparent", "rgba(0,0,0,0.8)"]}
              style={styles.gradientOverlay}
            />
            <View style={styles.headerContent}>
              <Pressable
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={28} color={COLORS.text} />
              </Pressable>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>
                  {year} {make} {model}
                </Text>
                <Text style={styles.headerSubtitle}>Editing Your Listing</Text>
              </View>
            </View>
          </ImageBackground>
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Core Details</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Make</Text>
              <TextInput
                style={styles.input}
                value={make}
                onChangeText={setMake}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Model</Text>
              <TextInput
                style={styles.input}
                value={model}
                onChangeText={setModel}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Year</Text>
              <TextInput
                style={styles.input}
                value={year}
                onChangeText={setYear}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Sale Price (ETB)</Text>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Description</Text>
            <View style={styles.inputGroup}>
              <TextInput
                style={[
                  styles.input,
                  { height: 120, textAlignVertical: "top" },
                ]}
                value={description}
                onChangeText={setDescription}
                multiline
              />
            </View>
          </View>
        </View>

        <Pressable
          style={styles.updateButton}
          onPress={handleUpdate}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.updateButtonText}>Update Listing</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { height: 250, backgroundColor: COLORS.card },
  headerImage: {
    flex: 1,
  },
  gradientOverlay: { ...StyleSheet.absoluteFillObject },
  headerContent: {
    flex: 1,
    justifyContent: "space-between",
    padding: 20,
  },
  backButton: {
    position: "absolute",
    top: 20,
    left: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 4,
    zIndex: 10, // Ensure it's on top
  },
  headerTextContainer: {
    alignSelf: "flex-start",
    paddingLeft: 50, // Add padding to avoid the back button
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.text,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  contentContainer: { padding: 20 },
  formCard: {
    backgroundColor: COLORS.card,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 15,
  },
  updateButton: {
    backgroundColor: COLORS.accent,
    margin: 20,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  updateButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default EditListingScreen;
