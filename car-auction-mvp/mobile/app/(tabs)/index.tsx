import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  Pressable,
  Image,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import Footer from "../_components/Footer";
import VehicleCard, { Vehicle } from "../_components/VehicleCard";
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
    image:
      "https://imgs.search.brave.com/ovSqY64xh9cfSufhgUjn_OinRyzlpcflAXF1s5VT7yE/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9wbGF0/Zm9ybS5jc3RhdGlj/LWltYWdlcy5jb20v/bGFyZ2UvaW4vdjIv/YTQzNjFjZDctMGNj/MC01ZWI3LThkZGEt/NjNkYzljYmY3YTZh/LzI3MjI2YTNiLWY1/Y2QtNGMzOS05MTMz/LTdiNzA2NjQ2NjNh/Ny94QS1Tc0pRYWpn/TWRIeXVhNS1vbGlp/UzJ5VFkuanBn",
  },
  {
    id: "2",
    make: "Ford",
    model: "Mustang Mach-E",
    year: 2024,
    price: "Current Bid: 4,200,000 ETB",
    type: "For sale",
    image:
      "https://imgs.search.brave.com/ooRdlylf1TT_2eGNUXFQKfrsQzAbV7L_aInHnYj4oCs/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9tZWRp/YS5nZXR0eWltYWdl/cy5jb20vaWQvMTM2/Mzg4Njg3Ni9waG90/by9mb3JkLW11c3Rh/bmctbWFjaC1lLWd0/LW9uLWEtc3RyZWV0/LmpwZz9zPTYxMng2/MTImdz0wJms9MjAm/Yz1OZ3JSVkpaMFdT/MW1WOF85NWcwSlVj/cnc1YkZDRTFVRVVr/SVp4VEROVzFZPQ",
  },
];

const allVehicles: Vehicle[] = [
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
    listingType: "Sale",
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
  const router = useRouter();

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
            <Pressable key={filter.value} style={styles.filterButton}>
              <Text style={styles.filterButtonText}>{filter.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.heroActions}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Pressable
              style={[styles.heroButton, styles.primaryButton]}
              onPress={() => router.push("/request")}
            >
              <Text style={[styles.heroButtonText, styles.primaryButtonText]}>
                Let Us Find It For You
              </Text>
            </Pressable>
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Pressable
              style={[styles.heroButton, styles.secondaryButton]}
              onPress={() => router.push("/trade-in")}
            >
              <Text style={[styles.heroButtonText, styles.secondaryButtonText]}>
                Get a Trade-in Offer
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* --- Featured Cars Section --- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Featured Vehicles</Text>
        <FlatList
          horizontal
          data={featuredCars}
          renderItem={({ item }) => (
            <Pressable style={styles.featuredCard}>
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
            </Pressable>
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
          {allVehicles.map((item) => (
            <VehicleCard key={item.id} item={item} />
          ))}
        </View>
        <Pressable
          style={styles.viewAllButton}
          onPress={() => router.push("/all_listings")}
        >
          <Text style={styles.viewAllButtonText}>View All Listings</Text>
        </Pressable>
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
      <Footer />
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
    alignItems: "center",
  },
  heroButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    paddingHorizontal: 12,
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
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
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
    paddingHorizontal: 5, // Reduce padding to give flex items more space
    gap: 10, // Add a small gap between items
  },
  trustStat: {
    alignItems: "center",
    flex: 1, // Ensure each stat takes equal width
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
    marginTop: 8, // Increase top margin for better spacing
  },
});

export default HomeScreen;
