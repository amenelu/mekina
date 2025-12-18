import React, { useRef, useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  Pressable,
  Image,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useRouter, useNavigation } from "expo-router";
import { useScrollToTop } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import API_URL from "@/constants/Api";

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
    id: "101",
    year: 2022,
    make: "Hyundai",
    model: "Ioniq 5",
    price: "3,800,000 ETB",
    image: "https://via.placeholder.com/300x200.png/1C212B/FFFFFF?text=Ioniq+5",
    mileage: 25000,
    listingType: "Sale",
  },
  {
    id: "102",
    year: 2021,
    make: "Volkswagen",
    model: "ID.4",
    price: "Current Bid: 3,100,000 ETB",
    image: "https://via.placeholder.com/300x200.png/1C212B/FFFFFF?text=ID.4",
    mileage: 45000,
    listingType: "Sale",
  },
  {
    id: "103",
    year: 2023,
    make: "BYD",
    model: "Atto 3",
    price: "2,950,000 ETB",
    image: "https://via.placeholder.com/300x200.png/1C212B/FFFFFF?text=Atto+3",
    mileage: 15000,
    listingType: "Sale",
  },
  {
    id: "104",
    year: 2020,
    make: "Mercedes-Benz",
    model: "EQC",
    price: "Current Bid: 4,500,000 ETB",
    image: "https://via.placeholder.com/300x200.png/1C212B/FFFFFF?text=EQC",
    mileage: 60000,
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
  const navigation = useNavigation();
  const ref = useRef<ScrollView>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Vehicle[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeFilter, setActiveFilter] = useState("");

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim()) {
        setIsSearching(true);
        try {
          let url = `${API_URL}/api/listings?q=${searchQuery}`;
          if (activeFilter) {
            if (activeFilter === "New" || activeFilter === "Used") {
              url += `&condition=${activeFilter}`;
            } else if (activeFilter === "EV") {
              url += `&fuel_type=Electric`;
            } else if (activeFilter === "Hybrid") {
              url += `&fuel_type=Hybrid`;
            } else if (activeFilter === "SUV" || activeFilter === "Sedan") {
              url += `&body_type=${activeFilter}`;
            }
          }
          const response = await fetch(url);
          const data = await response.json();
          const formattedData = data.map((item: any) => ({
            id: item.id.toString(),
            year: item.year,
            make: item.make,
            model: item.model,
            price: item.price_display || "N/A",
            image: item.image_url,
            mileage: item.mileage || 0,
            listingType: item.listing_type,
          }));
          setSearchResults(formattedData);
        } catch (error) {
          console.error("Search error:", error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, activeFilter]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push({
        pathname: "/all_listings",
        params: { q: searchQuery },
      });
    }
  };

  // This hook handles scrolling to top when the active tab is pressed
  useScrollToTop(ref);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <Pressable
          onPress={() => ref.current?.scrollTo({ y: 0, animated: true })}
        >
          <Text style={styles.headerTitleText}>Mekina</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  return (
    <ScrollView
      ref={ref}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* --- Search Hero Section --- */}
      <View style={styles.searchHero}>
        <Text style={styles.heroTitle}>Find Your Next Car</Text>
        <Text style={styles.heroSubtitle}>
          Search Ethiopia's best selection of modern cars for sale.
        </Text>
        <View style={{ zIndex: 10 }}>
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
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.quickFiltersContainer}
          >
            {quickFilters.map((filter) => (
              <Pressable
                key={filter.value}
                style={[
                  styles.filterButton,
                  activeFilter === filter.value && styles.activeFilterButton,
                ]}
                onPress={() =>
                  setActiveFilter(
                    activeFilter === filter.value ? "" : filter.value
                  )
                }
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    activeFilter === filter.value &&
                      styles.activeFilterButtonText,
                  ]}
                >
                  {filter.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          {searchQuery.length > 0 && (
            <View style={styles.searchDropdown}>
              {isSearching ? (
                <ActivityIndicator
                  size="small"
                  color={COLORS.accent}
                  style={{ padding: 20 }}
                />
              ) : searchResults.length > 0 ? (
                searchResults.slice(0, 5).map((car) => (
                  <Pressable
                    key={car.id}
                    style={styles.searchResultItem}
                    onPress={() => router.push(`/${car.id}`)}
                  >
                    <Image
                      source={{ uri: car.image }}
                      style={styles.searchResultImage}
                    />
                    <View style={styles.searchResultTextContainer}>
                      <Text style={styles.searchResultTitle}>
                        {car.year} {car.make} {car.model}
                      </Text>
                      <Text style={styles.searchResultPrice}>{car.price}</Text>
                    </View>
                  </Pressable>
                ))
              ) : (
                <Text style={styles.noResultsText}>No cars found</Text>
              )}
            </View>
          )}
        </View>
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
            <Pressable
              style={styles.featuredCard}
              onPress={() => router.push(`/${item.id}`)}
            >
              <Image
                source={{ uri: item.image }}
                style={styles.featuredImage}
              />
              <View style={styles.featuredTagContainer}>
                <Text style={styles.featuredTag}>Featured</Text>
              </View>
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
  headerTitleText: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.foreground,
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
  searchDropdown: {
    position: "absolute",
    top: 115,
    left: 0,
    right: 0,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    overflow: "hidden",
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchResultImage: {
    width: 50,
    height: 35,
    borderRadius: 4,
    marginRight: 10,
  },
  searchResultTextContainer: {
    flex: 1,
  },
  searchResultTitle: {
    color: COLORS.foreground,
    fontSize: 14,
    fontWeight: "600",
  },
  searchResultPrice: {
    color: COLORS.accent,
    fontSize: 12,
  },
  noResultsText: {
    color: COLORS.mutedForeground,
    textAlign: "center",
    padding: 15,
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
  featuredTagContainer: {
    position: "absolute",
    top: 12,
    left: 12,
  },
  featuredTag: {
    backgroundColor: COLORS.accent,
    color: COLORS.foreground,
    fontSize: 12,
    fontWeight: "bold",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: "hidden", // Ensures border radius works on iOS
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
  activeFilterButton: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  activeFilterButtonText: {
    color: "#FFFFFF",
  },
});

export default HomeScreen;
