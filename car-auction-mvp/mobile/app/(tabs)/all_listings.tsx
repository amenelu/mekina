import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  Pressable,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import HeaderRight from "../_components/HeaderRight";
import Footer from "../_components/Footer";

// --- Mock Data (can be replaced with API call) ---
const allVehicles = [
  {
    id: "1",
    year: 2022,
    make: "Hyundai",
    model: "Ioniq 5",
    price: "3,800,000 ETB",
    image: "https://via.placeholder.com/300x200.png/1C212B/FFFFFF?text=Ioniq+5",
    listingType: "Sale",
  },
  {
    id: "2",
    year: 2021,
    make: "Volkswagen",
    model: "ID.4",
    price: "Current Bid: 3,100,000 ETB",
    image: "https://via.placeholder.com/300x200.png/1C212B/FFFFFF?text=ID.4",
    listingType: "Auction",
  },
  {
    id: "3",
    year: 2023,
    make: "BYD",
    model: "Atto 3",
    price: "2,950,000 ETB",
    image: "https://via.placeholder.com/300x200.png/1C212B/FFFFFF?text=Atto+3",
    listingType: "Sale",
  },
  {
    id: "4",
    year: 2020,
    make: "Mercedes-Benz",
    model: "EQC",
    price: "Current Bid: 4,500,000 ETB",
    image: "https://via.placeholder.com/300x200.png/1C212B/FFFFFF?text=EQC",
    listingType: "Auction",
  },
  {
    id: "5",
    year: 2023,
    make: "Toyota",
    model: "RAV4",
    price: "3,500,000 ETB",
    image: "https://via.placeholder.com/600x400.png/1C212B/FFFFFF?text=RAV4",
    listingType: "Sale",
  },
  {
    id: "6",
    year: 2024,
    make: "Ford",
    model: "Mustang Mach-E",
    price: "Current Bid: 4,200,000 ETB",
    image: "https://via.placeholder.com/600x400.png/1C212B/FFFFFF?text=Mach-E",
    listingType: "Auction",
  },
  {
    id: "7",
    year: 2022,
    make: "Kia",
    model: "EV6",
    price: "3,750,000 ETB",
    image: "https://via.placeholder.com/300x200.png/1C212B/FFFFFF?text=EV6",
    listingType: "Sale",
  },
  {
    id: "8",
    year: 2021,
    make: "Tesla",
    model: "Model Y",
    price: "Current Bid: 4,800,000 ETB",
    image: "https://via.placeholder.com/300x200.png/1C212B/FFFFFF?text=Model+Y",
    listingType: "Auction",
  },
];

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  mutedForeground: "#8A94A3",
  border: "#313843",
  secondary: "#313843",
};

const VehicleCard = ({ item }: { item: (typeof allVehicles)[0] }) => (
  <Pressable style={styles.vehicleCard}>
    <Image source={{ uri: item.image }} style={styles.vehicleCardImage} />
    <View style={styles.vehicleCardTagContainer}>
      <Text
        style={[
          styles.vehicleCardTag,
          {
            backgroundColor:
              item.listingType === "Sale" ? "#28a745" : COLORS.accent,
          },
        ]}
      >
        {item.listingType}
      </Text>
    </View>
    <View style={styles.vehicleCardContent}>
      <Text
        style={styles.vehicleCardTitle}
      >{`${item.year} ${item.make} ${item.model}`}</Text>
      <Text style={styles.vehicleCardPrice}>{item.price}</Text>
    </View>
  </Pressable>
);

const AllListingsScreen = () => {
  const [searchQuery, setSearchQuery] = useState("");

  // In a real app, you'd filter based on state. For now, we just display all.
  const filteredVehicles = allVehicles.filter((vehicle) =>
    `${vehicle.year} ${vehicle.make} ${vehicle.model}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  return (
    <>
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
          {/* Filters can be implemented with modals or custom dropdowns */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.quickFiltersContainer}
          >
            <Pressable style={styles.filterButton}>
              <Text style={styles.filterButtonText}>Any Condition</Text>
            </Pressable>
            <Pressable style={styles.filterButton}>
              <Text style={styles.filterButtonText}>Any Body Type</Text>
            </Pressable>
            <Pressable style={styles.filterButton}>
              <Text style={styles.filterButtonText}>Any Fuel Type</Text>
            </Pressable>
          </ScrollView>
        </View>

        {/* --- Listings Grid --- */}
        <View style={styles.gridContainer}>
          {filteredVehicles.length > 0 ? (
            filteredVehicles.map((item) => (
              <VehicleCard key={item.id} item={item} />
            ))
          ) : (
            <Text style={styles.noResultsText}>
              No listings match your search criteria.
            </Text>
          )}
        </View>

        <Footer />
      </ScrollView>
    </>
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
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    padding: 20,
  },
  vehicleCard: {
    width: "48%",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    marginBottom: 15,
    overflow: "hidden",
  },
  vehicleCardImage: {
    width: "100%",
    height: 120,
  },
  vehicleCardTagContainer: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  vehicleCardTag: {
    color: COLORS.foreground,
    fontSize: 12,
    fontWeight: "600",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    overflow: "hidden",
  },
  vehicleCardContent: {
    padding: 10,
  },
  vehicleCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  vehicleCardPrice: {
    fontSize: 14,
    color: COLORS.accent,
    marginTop: 5,
  },
  noResultsText: {
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginTop: 40,
    width: "100%",
    fontSize: 16,
  },
});

export default AllListingsScreen;
