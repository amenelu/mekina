import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// --- Mock Data based on home.html ---
const quickFilters = [
  { label: "New", value: "New" },
  { label: "Used", value: "Used" },
  { label: "EV", value: "EV" },
  { label: "Hybrid", value: "Hybrid" },
  { label: "SUV", value: "SUV" },
  { label: "Sedan", value: "Sedan" },
];

const featuredCars = [
  {
    id: "1",
    make: "Toyota",
    model: "RAV4",
    year: 2023,
    price: "3,500,000 ETB",
    type: "For Sale",
    image: "https://via.placeholder.com/600x400.png/1C212B/FFFFFF?text=RAV4",
  },
  {
    id: "2",
    make: "Ford",
    model: "Mustang Mach-E",
    year: 2024,
    price: "Current Bid: 4,200,000 ETB",
    type: "Auction",
    image: "https://via.placeholder.com/600x400.png/1C212B/FFFFFF?text=Mach-E",
  },
];

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
];

const trustStats = [
  { value: "100%", label: "Admin Reviewed Listings" },
  { value: "Direct", label: "Seller Communication" },
  { value: "Verified", label: "User Accounts" },
];

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  mutedForeground: "#8A94A3",
  border: "#313843",
  primary: "#A370F7",
  secondary: "#313843",
};

const HomeScreen = () => {
  const renderVehicleCard = (item: (typeof allVehicles)[0]) => (
    <TouchableOpacity key={item.id} style={styles.vehicleCard}>
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
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* --- Search Hero Section --- */}
      <View style={styles.searchHero}>
        <Text style={styles.heroTitle}>Find Your Next Car</Text>
        <Text style={styles.heroSubtitle}>
          Search Ethiopia's best selection of modern cars for sale.
        </Text>
        <View style={styles.searchBar}>
          <Ionicons
            name="search"
            size={20}
            color={COLORS.mutedForeground}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Make, model, year..."
            placeholderTextColor={COLORS.mutedForeground}
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickFiltersContainer}
        >
          {quickFilters.map((filter) => (
            <TouchableOpacity key={filter.value} style={styles.filterButton}>
              <Text style={styles.filterButtonText}>{filter.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.heroActions}>
          <TouchableOpacity style={[styles.heroButton, styles.primaryButton]}>
            <Text style={[styles.heroButtonText, styles.primaryButtonText]}>
              Let Us Find It For You
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.heroButton, styles.secondaryButton]}>
            <Text style={[styles.heroButtonText, styles.secondaryButtonText]}>
              Get a Trade-in Offer
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* --- Featured Cars Section --- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Featured Vehicles</Text>
        <FlatList
          horizontal
          data={featuredCars}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.featuredCard}>
              <Image
                source={{ uri: item.image }}
                style={styles.featuredImage}
              />
              <View style={styles.featuredCaption}>
                <Text
                  style={styles.featuredTitle}
                >{`${item.year} ${item.make} ${item.model}`}</Text>
                <Text style={styles.featuredPrice}>{item.price}</Text>
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        />
      </View>

      {/* --- All Vehicles Section --- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>All Vehicles for Sale</Text>
        <View style={styles.vehicleGrid}>
          {allVehicles.map((item) => renderVehicleCard(item))}
        </View>
        <TouchableOpacity style={styles.viewAllButton}>
          <Text style={styles.viewAllButtonText}>View All Listings</Text>
        </TouchableOpacity>
      </View>

      {/* --- Trust Section --- */}
      <View style={[styles.section, styles.trustSection]}>
        <Text style={styles.sectionTitle}>Built on Trust & Transparency</Text>
        <View style={styles.trustGrid}>
          {trustStats.map((stat, index) => (
            <View key={index} style={styles.trustStat}>
              <Text style={styles.trustValue}>{stat.value}</Text>
              <Text style={styles.trustLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  // Hero Section
  searchHero: {
    backgroundColor: COLORS.card,
    padding: 20,
    paddingBottom: 30,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.foreground,
    textAlign: "center",
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginBottom: 20,
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
    marginTop: 20,
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
    color: COLORS.foreground,
    fontWeight: "500",
  },
  heroActions: {
    marginTop: 30,
    flexDirection: "row",
    justifyContent: "space-around",
    gap: 15,
  },
  heroButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  heroButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  primaryButtonText: {
    color: COLORS.foreground,
  },
  secondaryButtonText: {
    color: COLORS.primary,
  },
  // General Section
  section: {
    marginTop: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  // Featured Section
  featuredCard: {
    width: 300,
    marginRight: 15,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    overflow: "hidden",
  },
  featuredImage: {
    width: "100%",
    height: 180,
  },
  featuredCaption: {
    padding: 15,
  },
  featuredTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  featuredPrice: {
    fontSize: 14,
    color: COLORS.mutedForeground,
    marginTop: 5,
  },
  // All Vehicles Section
  vehicleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 20,
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
  viewAllButton: {
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  viewAllButtonText: {
    color: COLORS.foreground,
    fontSize: 16,
    fontWeight: "600",
  },
  // Trust Section
  trustSection: {
    backgroundColor: COLORS.card,
    paddingVertical: 30,
    marginTop: 30,
  },
  trustGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 20,
  },
  trustStat: {
    alignItems: "center",
  },
  trustValue: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.accent,
  },
  trustLabel: {
    fontSize: 14,
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginTop: 5,
  },
});

export default HomeScreen;
