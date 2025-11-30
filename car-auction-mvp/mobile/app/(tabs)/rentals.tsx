import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  Pressable,
  ImageBackground,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Footer from "../_components/Footer";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  mutedForeground: "#8A94A3",
  border: "#313843",
  secondary: "#313843",
};

// Mock Data for Rentals
const rentalVehicles = [
  {
    id: "r1",
    year: 2023,
    make: "Toyota",
    model: "Vitz",
    price: "2,500 ETB/day",
    image:
      "https://imgs.search.brave.com/5-P_k5hXfVz_v-y_v-y_v-y_v-y_v-y_v-y_v-y/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9jYXJz/LmppamlnaC5jb20v/MjAyMy10b3lvdGEt/dml0ei1hdXRvbWF0/aWMtY2FyLmpwZw",
  },
  {
    id: "r2",
    year: 2022,
    make: "Suzuki",
    model: "Dzire",
    price: "2,200 ETB/day",
    image:
      "https://imgs.search.brave.com/5-P_k5hXfVz_v-y_v-y_v-y_v-y_v-y_v-y_v-y/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9jYXJz/LmppamlnaC5jb20v/MjAyMi1zdXp1a2kt/ZHppcmUtYXV0b21h/dGljLWNhci5qcGc",
  },
  {
    id: "r3",
    year: 2023,
    make: "Toyota",
    model: "RAV4",
    price: "4,500 ETB/day",
    image:
      "https://imgs.search.brave.com/v2a8HQzdx9CdYjNiPZWMjNhP0Ijrs6m42WMY2dApHWE/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9oaXBz/LmhlYXJzdGFwcHMu/Y29tL2htZy1wcm9k/L2ltYWdlcy8yMDIz/LXRveW90YS1yYXY0/LWh5YnJpZC13b29k/bGFuZC1lZGl0aW9u/LTM2NTktMTY3NTEx/NjM1Ni5qcGc_Y3Jv/cD0xeHc6MXhoO2Nl/bnRlcix0b3A",
  },
  {
    id: "r4",
    year: 2022,
    make: "Hyundai",
    model: "Tucson",
    price: "4,000 ETB/day",
    image:
      "https://imgs.search.brave.com/IMfjRFIBmlHG1FAY9P4j_f3ygIpC6_-Lq48rCDOeoz4/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9kaS11/cGxvYWRzLXBvZDku/ZGVhbGVyaW5zcGly/ZS5jb20vY2FwaXRv/bGh5dW5kYWlzYW5q/b3NlL3VwbG9hZHMv/MjAyMS8xMi8yMDIy/LUh5dW5kYWktSU9O/SVEtNS1JbnRyby5w/bmc",
  },
];

import { useRouter } from "expo-router";

const RentalCard = ({ item }: { item: (typeof rentalVehicles)[0] }) => {
  const router = useRouter();
  return (
    <Pressable
      style={styles.rentalCard}
      onPress={() =>
        router.push({
          pathname: "/rentals/[id]",
          params: { id: item.id },
        })
      }
    >
      <ImageBackground
        source={{ uri: item.image }}
        style={styles.rentalCardImage}
        resizeMode="cover"
      >
        <View style={styles.rentalCardOverlay} />
        <View style={styles.rentalCardContent}>
          <Text style={styles.rentalCardTitle}>
            {item.year} {item.make} {item.model}
          </Text>
          <Text style={styles.rentalCardPrice}>{item.price}</Text>
        </View>
      </ImageBackground>
    </Pressable>
  );
};

const RentalsScreen = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredVehicles = rentalVehicles.filter((vehicle) =>
    `${vehicle.year} ${vehicle.make} ${vehicle.model}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  return (
    <ScrollView style={styles.container}>
      {/* --- Search & Filter Section --- */}
      <View style={styles.filterContainer}>
        <View style={styles.searchBar}>
          <Ionicons
            name="search"
            size={20}
            color={COLORS.mutedForeground}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by make, model, or year..."
            placeholderTextColor={COLORS.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickFiltersContainer}
        >
          <Pressable style={styles.filterButton}>
            <Text style={styles.filterButtonText}>Any Price</Text>
          </Pressable>
          <Pressable style={styles.filterButton}>
            <Text style={styles.filterButtonText}>Any Body Type</Text>
          </Pressable>
          <Pressable style={styles.filterButton}>
            <Text style={styles.filterButtonText}>Any Transmission</Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* --- Listings Grid --- */}
      <View style={styles.gridContainer}>
        {filteredVehicles.length > 0 ? (
          filteredVehicles.map((item) => (
            <RentalCard key={item.id} item={item} />
          ))
        ) : (
          <Text style={styles.noResultsText}>
            No rentals match your search criteria.
          </Text>
        )}
      </View>

      <Footer />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  filterContainer: {
    padding: 20,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    color: COLORS.foreground,
    fontSize: 16,
  },
  quickFiltersContainer: {
    marginTop: 15,
    flexDirection: "row",
  },
  filterButton: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonText: {
    color: COLORS.mutedForeground,
    fontWeight: "500",
  },
  gridContainer: {
    padding: 20,
  },
  noResultsText: {
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginTop: 40,
    width: "100%",
    fontSize: 16,
  },
  // Rental Card Styles
  rentalCard: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
    overflow: "hidden",
    backgroundColor: COLORS.card,
  },
  rentalCardImage: {
    width: "100%",
    height: "100%",
    justifyContent: "flex-end",
  },
  rentalCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  rentalCardContent: {
    padding: 15,
  },
  rentalCardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.foreground,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  rentalCardPrice: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.accent,
    marginTop: 5,
  },
});

export default RentalsScreen;
