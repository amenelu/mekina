import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  SafeAreaView,
  FlatList,
  useWindowDimensions,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { mediaUrl } from "@/lib/api/client";
import { getListing } from "@/lib/api/listings";
import { updateDealerCar } from "@/lib/api/dealer";
import { showNativeFlowAlert } from "@/lib/nativeFlowAlert";

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
  order?: number;
}

interface CarResponse {
  make: string;
  model: string;
  year: number;
  fixed_price?: number;
  description?: string;
  primary_image_url?: string;
  image_urls?: string[];
  images?: CarImage[];
}

interface GalleryImage {
  id?: number;
  uri: string;
  isPrimary?: boolean;
}

function resolveImageUrl(imageUrl?: string) {
  if (!imageUrl) {
    return undefined;
  }

  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  return mediaUrl(imageUrl) || undefined;
}

const EditListingScreen = () => {
  const { id, returnTo } = useLocalSearchParams<{
    id: string;
    returnTo?: string | string[];
  }>();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === "web" && width >= 1000;
  const galleryWidth = isWideWeb ? Math.min(width - 56, 1120) : width;
  const resolvedReturnTo = Array.isArray(returnTo) ? returnTo[0] : returnTo;

  const handleExit = () => {
    if (resolvedReturnTo) {
      router.navigate(resolvedReturnTo as any);
      return;
    }

    router.back();
  };

  useEffect(() => {
    const fetchCarDetails = async () => {
      if (!id || !token) return;
      setLoading(true);
      try {
        const response = await getListing(id);
        const car = response.data.car as CarResponse;
        setMake(car.make);
        setModel(car.model);
        setYear(car.year.toString());
        setPrice(car.fixed_price?.toString() || "");
        setDescription(car.description || "");

        let resolvedGallery: GalleryImage[] = [];
        if (car.images && car.images.length > 0) {
          resolvedGallery = car.images.reduce<GalleryImage[]>((acc, img) => {
            const uri = resolveImageUrl(img.image_url);
            if (uri) {
              acc.push({
                id: img.id,
                uri,
                isPrimary: img.is_primary,
              });
            }
            return acc;
          }, []);
        } else {
          resolvedGallery = [
            resolveImageUrl(car.primary_image_url),
            ...(car.image_urls || []).map((uri) => resolveImageUrl(uri)),
          ]
            .filter(
              (uri, index, self): uri is string =>
                Boolean(uri) && self.indexOf(uri) === index,
            )
            .map((uri, index) => ({ uri, isPrimary: index === 0 }));
        }

        setGalleryImages(resolvedGallery);

        const primaryIndexFromImages = resolvedGallery.findIndex(
          (img) => img.isPrimary,
        );
        const initialIndex =
          primaryIndexFromImages >= 0
            ? Math.min(
                primaryIndexFromImages,
                Math.max(0, resolvedGallery.length - 1),
              )
            : 0;
        setSelectedImageIndex(initialIndex);
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
    const missingFields = [
      !make.trim() ? "Make" : null,
      !model.trim() ? "Model" : null,
      !year.trim() ? "Year" : null,
      !price.trim() ? "Price" : null,
    ].filter(Boolean);

    if (missingFields.length > 0) {
      showNativeFlowAlert(
        "Missing Required Details",
        `Please fill in: ${missingFields.join(", ")}.`,
      );
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await updateDealerCar(id, {
        make,
        model,
        year,
        price,
        description,
        primary_image_id: galleryImages[selectedImageIndex]?.id,
      });

      showNativeFlowAlert(
        "Success",
        response.data.message || "Listing updated successfully.",
        handleExit,
      );
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Failed to update listing.";
      showNativeFlowAlert("Update Failed", message);
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

  const activeImage = galleryImages[selectedImageIndex] || galleryImages[0];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.gallerySection}>
          {activeImage ? (
            <Image
              source={{ uri: activeImage.uri }}
              style={[styles.headerImage, { width: galleryWidth }]}
            />
          ) : (
            <View style={[styles.headerImage, styles.headerImageFallback]}>
              <Ionicons
                name="image-outline"
                size={36}
                color={COLORS.textSecondary}
              />
            </View>
          )}

          <LinearGradient
            colors={["rgba(0,0,0,0.78)", "rgba(0,0,0,0.18)", "transparent"]}
            style={styles.topGradient}
            pointerEvents="none"
          />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.16)", "rgba(0,0,0,0.75)"]}
            style={styles.bottomGradient}
            pointerEvents="none"
          />
          <View style={styles.imageHeaderOverlay} pointerEvents="box-none">
            <Pressable onPress={handleExit} style={styles.backButton}>
              <Ionicons name="arrow-back" size={28} color={COLORS.text} />
            </Pressable>
            <Text style={styles.imageTitle}>
              {year} {make} {model}
            </Text>
            <Text style={styles.imageSubtitle}>Editing Your Listing</Text>
          </View>

          {galleryImages.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailRow}
            >
              {galleryImages.map((image, index) => (
                <Pressable
                  key={`${image.uri}-${index}`}
                  style={styles.thumbnailButton}
                  onPress={() => {
                    setSelectedImageIndex(index);
                  }}
                >
                  <Image
                    source={{ uri: image.uri }}
                    style={[
                      styles.thumbnail,
                      index === selectedImageIndex && styles.thumbnailActive,
                    ]}
                  />
                  {index === selectedImageIndex ? (
                    <View style={styles.displayBadge}>
                      <Text style={styles.displayBadgeText}>Display</Text>
                    </View>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        <View
          style={[
            styles.contentContainer,
            isWideWeb && styles.contentContainerWide,
          ]}
        >
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
  gallerySection: {
    backgroundColor: COLORS.background,
    marginBottom: 8,
    position: "relative",
    alignItems: "center",
  },
  headerImage: {
    height: 250,
    resizeMode: "cover",
    backgroundColor: COLORS.card,
  },
  headerImageFallback: {
    justifyContent: "center",
    alignItems: "center",
  },
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  bottomGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 86,
    height: 120,
  },
  imageHeaderOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    minHeight: 64,
    justifyContent: "flex-start",
  },
  backButton: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 22,
    padding: 8,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  imageTitle: {
    position: "absolute",
    top: 20,
    left: 64,
    right: 64,
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "center",
  },
  imageSubtitle: {
    position: "absolute",
    top: 50,
    left: 64,
    right: 64,
    fontSize: 16,
    color: "#D9DEE6",
    fontWeight: "600",
    textAlign: "center",
  },
  thumbnailRow: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  thumbnailButton: {
    position: "relative",
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 10,
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: "transparent",
    opacity: 0.8,
    backgroundColor: COLORS.card,
  },
  thumbnailActive: {
    borderColor: COLORS.accent,
    opacity: 1,
  },
  displayBadge: {
    position: "absolute",
    left: 8,
    bottom: 6,
    backgroundColor: COLORS.accent,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  displayBadgeText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: "800",
  },
  contentContainer: { padding: 20 },
  contentContainerWide: {
    maxWidth: 1120,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 28,
  },
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
