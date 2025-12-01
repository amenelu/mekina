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
  {
    id: "r2",
    year: 2022,
    make: "Suzuki",
    model: "Dzire",
    price: "2,200 ETB/day",
    image:
      "https://imgs.search.brave.com/5-P_k5hXfVz_v-y_v-y_v-y_v-y_v-y_v-y_v-y/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9jYXJz/LmppamlnaC5jb20v/MjAyMi1zdXp1a2kt/ZHppcmUtYXV0b21h/dGljLWNhci5qcGc",
    description:
      "An affordable and reliable sedan, great for families and business trips.",
    specs: {
      Condition: "Used",
      Mileage: "35,000 km",
      Transmission: "Automatic",
      "Fuel Type": "Gasoline",
    },
    features: ["Air Conditioning", "Power Windows"],
    owner: {
      username: "CityRentals",
      email: "info@cityrentals.et",
      phone: "0911121314",
    },
  },
  {
    id: "r3",
    year: 2023,
    make: "Toyota",
    model: "RAV4",
    price: "4,500 ETB/day",
    image:
      "https://imgs.search.brave.com/v2a8HQzdx9CdYjNiPZWMjNhP0Ijrs6m42WMY2dApHWE/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9oaXBz/LmhlYXJzdGFwcHMu/Y29tL2htZy1wcm9k/L2ltYWdlcy8yMDIz/LXRveW90YS1yYXY0/LWh5YnJpZC13b29k/bGFuZC1lZGl0aW9u/LTM2NTktMTY3NTEx/NjM1Ni5qcGc_Y3Jv/cD0xeHc6MXhoO2Nl/bnRlcix0b3A",
    description:
      "A spacious and versatile SUV, perfect for road trips and adventures.",
    specs: {
      Condition: "New",
      Mileage: "5,000 km",
      Transmission: "Automatic",
      "Fuel Type": "Hybrid",
    },
    features: ["Sunroof", "All-Wheel Drive", "Apple CarPlay"],
    owner: {
      username: "AdventureRides",
      email: "book@adventurerides.com",
      phone: "0922334455",
    },
  },
  {
    id: "r4",
    year: 2022,
    make: "Hyundai",
    model: "Tucson",
    price: "4,000 ETB/day",
    image:
      "https://imgs.search.brave.com/IMfjRFIBmlHG1FAY9P4j_f3ygIpC6_-Lq48rCDOeoz4/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9kaS11/cGxvYWRzLXBvZDku/ZGVhbGVyaW5zcGly/ZS5jb20vY2FwaXRv/bGh5dW5kYWlzYW5q/b3NlL3VwbG9hZHMv/MjAyMS8xMi8yMDIy/LUh5dW5kYWktSU9O/SVEtNS1JbnRyby5w/bmc",
    description:
      "A modern and stylish SUV with the latest technology and safety features.",
    specs: {
      Condition: "Used",
      Mileage: "25,000 km",
      Transmission: "Automatic",
      "Fuel Type": "Gasoline",
    },
    features: ["Panoramic Sunroof", "Lane Keep Assist", "Heated Seats"],
    owner: {
      username: "PrestigeRentals",
      email: "support@prestige.et",
      phone: "0944556677",
    },
  },
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
