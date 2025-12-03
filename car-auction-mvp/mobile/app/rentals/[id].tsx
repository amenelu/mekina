import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../../apiConfig";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  mutedForeground: "#8A94A3",
  border: "#313843",
  success: "#28a745",
};

const RentalDetailScreen = () => {
  const { id } = useLocalSearchParams();
  const [rental, setRental] = useState<any | null>(null);
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRentalDetails = async () => {
      if (!id) return;
      setLoading(true);
      try {
        // The correct endpoint to get rental details from a car ID is `/api/rentals/car/<id>`
        const response = await fetch(`${API_BASE_URL}/rentals/api/car/${id}`);
        const data = await response.json();
        if (data.rental) {
          setRental(data.rental);
          setMainImage(data.rental.primary_image_url);
        } else {
          setRental(null);
        }
      } catch (error) {
        console.error("Failed to fetch rental details:", error);
        Alert.alert("Error", "Could not load rental details.");
      } finally {
        setLoading(false);
      }
    };

    fetchRentalDetails();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }
  if (!rental) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: COLORS.foreground }}>Rental not found.</Text>
      </View>
    );
  }

  const thumbnails = [
    rental.primary_image_url,
    ...Array(4).fill("https://via.placeholder.com/100"),
  ];

  return (
    <>
      <Stack.Screen
        options={{ title: `${rental.year} ${rental.make} ${rental.model}` }}
      />
      <ScrollView style={styles.container}>
        {/* Image Gallery */}
        <View>
          <Image
            source={{ uri: mainImage || rental.primary_image_url }}
            style={styles.mainImage}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {thumbnails.map((thumbUri, index) => (
              <Pressable key={index} onPress={() => setMainImage(thumbUri)}>
                <Image source={{ uri: thumbUri }} style={styles.thumbnail} />
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Main Content */}
        <View style={styles.contentContainer}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>
              {`${rental.year} ${rental.make} ${rental.model}`}
            </Text>
            <Text
              style={[
                styles.listingTypeTag,
                { backgroundColor: COLORS.accent },
              ]}
            >
              For Rent
            </Text>
          </View>

          <View style={styles.priceBox}>
            <Text style={styles.priceLabel}>Price Per Day</Text>
            <Text style={styles.priceValue}>{rental.price_display}</Text>
          </View>

          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{rental.description}</Text>

          <Text style={styles.sectionTitle}>Specifications</Text>
          <View style={styles.specsContainer}>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Condition</Text>
              <Text style={styles.specValue}>{rental.condition}</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Mileage</Text>
              <Text style={styles.specValue}>
                {rental.mileage
                  ? `${rental.mileage.toLocaleString()} km`
                  : "N/A"}
              </Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Transmission</Text>
              <Text style={styles.specValue}>{rental.transmission}</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Fuel Type</Text>
              <Text style={styles.specValue}>{rental.fuel_type}</Text>
            </View>
          </View>

          {/* You can add a features section here if the API provides it */}
        </View>
      </ScrollView>
      {/* Floating Action Button */}
      <View style={styles.footer}>
        <Pressable style={styles.contactButton}>
          <Ionicons name="call-outline" size={20} color="#fff" />
          <Text style={styles.contactButtonText}>Contact Owner</Text>
        </Pressable>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  container: { flex: 1, backgroundColor: COLORS.background },
  mainImage: { width: "100%", height: 250, resizeMode: "cover" },
  thumbnail: {
    width: 80,
    height: 80,
    resizeMode: "cover",
    margin: 5,
    borderRadius: 8,
  },
  contentContainer: { padding: 20 },
  titleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.foreground,
    flex: 1,
    marginRight: 10,
  },
  listingTypeTag: {
    color: "#fff",
    fontWeight: "bold",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    fontSize: 12,
    overflow: "hidden",
  },
  priceBox: {
    backgroundColor: COLORS.card,
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  priceLabel: { color: COLORS.mutedForeground, fontSize: 14, marginBottom: 5 },
  priceValue: { color: COLORS.accent, fontSize: 22, fontWeight: "bold" },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.foreground,
    marginTop: 10,
    marginBottom: 10,
  },
  description: { fontSize: 16, color: COLORS.mutedForeground, lineHeight: 24 },
  specsContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 15,
  },
  specItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  specLabel: { color: COLORS.mutedForeground, fontSize: 16 },
  specValue: { color: COLORS.foreground, fontSize: 16, fontWeight: "600" },
  footer: {
    padding: 20,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  contactButton: {
    backgroundColor: COLORS.accent,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  contactButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
});

export default RentalDetailScreen;
