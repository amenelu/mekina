import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// --- Mock Data (In a real app, this would be fetched from an API) ---
const rentalVehicles = [
  {
    id: "r1",
    year: 2023,
    make: "Toyota",
    model: "Vitz",
    price: "2,500 ETB/day",
    image:
      "https://imgs.search.brave.com/5-P_k5hXfVz_v-y_v-y_v-y_v-y_v-y_v-y_v-y/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9jYXJz/LmppamlnaC5jb20v/MjAyMy10b3lvdGEt/dml0ei1hdXRvbWF0/aWMtY2FyLmpwZw",
    description:
      "A compact and fuel-efficient car, perfect for city driving and daily commutes. Easy to park and maneuver.",
    specs: {
      Condition: "Like New",
      Mileage: "15,000 km",
      Transmission: "Automatic",
      "Fuel Type": "Gasoline",
    },
    features: ["Air Conditioning", "Bluetooth", "Backup Camera"],
    owner: {
      username: "RentalPro",
      email: "contact@rentalpro.com",
      phone: "0912345678",
    },
  },
  // Add other rental vehicles here if needed for direct access testing
];

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
  const [rental, setRental] = useState<(typeof rentalVehicles)[0] | null>(null);
  const [mainImage, setMainImage] = useState<string | null>(null);

  useEffect(() => {
    const foundRental = rentalVehicles.find((v) => v.id === id);
    setRental(foundRental || null);
    if (foundRental) {
      setMainImage(foundRental.image);
    }
  }, [id]);

  if (!rental) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  const thumbnails = [
    rental.image,
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
            source={{ uri: mainImage || rental.image }}
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
            <Text style={styles.priceValue}>{rental.price}</Text>
          </View>

          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{rental.description}</Text>

          <Text style={styles.sectionTitle}>Specifications</Text>
          <View style={styles.specsContainer}>
            {Object.entries(rental.specs).map(([key, value]) => (
              <View key={key} style={styles.specItem}>
                <Text style={styles.specLabel}>{key}</Text>
                <Text style={styles.specValue}>{value}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Features</Text>
          <View style={styles.specsContainer}>
            {rental.features.map((feature) => (
              <View key={feature} style={styles.specItem}>
                <Text style={styles.specValue}>{feature}</Text>
              </View>
            ))}
          </View>
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
