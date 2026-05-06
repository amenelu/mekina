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
  RefreshControl,
  Alert,
  Platform,
} from "react-native";
import { useRouter, useNavigation } from "expo-router";
import { useScrollToTop } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import API_URL from "@/constants/Api";
import { useAuth } from "@/hooks/useAuth";
import { getItemAsync, setItemAsync } from "@/lib/appStorage";

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

function matchesSearchTerms(searchQuery: string, item: { year?: number; make?: string; model?: string }) {
  const terms = searchQuery
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (terms.length === 0) {
    return true;
  }

  const haystack = `${item.year ?? ""} ${item.make ?? ""} ${item.model ?? ""}`.toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

const HomeScreen = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const { user, token } = useAuth();
  const ref = useRef<ScrollView>(null);
  const searchRequestIdRef = useRef(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Vehicle[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeFilter, setActiveFilter] = useState("");
  const [featuredVehicles, setFeaturedVehicles] = useState<Vehicle[]>([]);
  const [recentVehicles, setRecentVehicles] = useState<Vehicle[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    const checkInfoStatus = async () => {
      if (user) {
        const hasSeen = await getItemAsync("has_seen_request_info");
        if (!hasSeen) {
          setShowInfo(true);
        }
      } else {
        setShowInfo(false);
      }
    };
    checkInfoStatus();
  }, [user]);

  const handleDismissInfo = async () => {
    setShowInfo(false);
    await setItemAsync("has_seen_request_info", "true");
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim()) {
        const currentRequestId = ++searchRequestIdRef.current;
        setIsSearching(true);
        try {
          const searchParams = new URLSearchParams({ q: searchQuery.trim() });
          if (activeFilter) {
            if (activeFilter === "New" || activeFilter === "Used") {
              searchParams.set("condition", activeFilter);
            } else if (activeFilter === "EV") {
              searchParams.set("fuel_type", "Electric");
            } else if (activeFilter === "Hybrid") {
              searchParams.set("fuel_type", "Hybrid");
            } else if (activeFilter === "SUV" || activeFilter === "Sedan") {
              searchParams.set("body_type", activeFilter);
            }
          }
          const response = await fetch(
            `${API_URL}/api/listings?${searchParams.toString()}`
          );
          if (!response.ok) {
            throw new Error(`Search request failed with status ${response.status}`);
          }
          const data = await response.json();
          if (currentRequestId !== searchRequestIdRef.current) {
            return;
          }
          const formattedData = data
            .filter((item: any) => matchesSearchTerms(searchQuery, item))
            .map((item: any) => ({
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
          if (currentRequestId === searchRequestIdRef.current) {
            console.error("Search error:", error);
          }
        } finally {
          if (currentRequestId === searchRequestIdRef.current) {
            setIsSearching(false);
          }
        }
      } else {
        searchRequestIdRef.current += 1;
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, activeFilter]);

  const fetchHomeData = async () => {
    try {
      const [featuredRes, recentRes, trendingRes] = await Promise.all([
        fetch(`${API_URL}/api/home`),
        fetch(`${API_URL}/api/listings?limit=4`),
        fetch(`${API_URL}/api/trending-searches`),
      ]);

      if (!featuredRes.ok || !recentRes.ok || !trendingRes.ok) {
        throw new Error("Failed to load home data.");
      }

      const featuredData = await featuredRes.json();
      const recentData = await recentRes.json();
      const trendingData = await trendingRes.json();

      if (featuredData.featured_cars) {
        setFeaturedVehicles(
          featuredData.featured_cars.map((item: any) => {
            let price = "N/A";
            if (item.listing_type === "sale" && item.fixed_price) {
              price = `${item.fixed_price.toLocaleString()} ETB`;
            } else if (
              item.listing_type === "auction" &&
              item.auction_details
            ) {
              price = `Current Bid: ${item.auction_details.current_price.toLocaleString()} ETB`;
            }
            return {
              id: item.id.toString(),
              year: item.year,
              make: item.make,
              model: item.model,
              price: price,
              image: item.primary_image_url,
              mileage: item.mileage || 0,
              listingType: item.listing_type,
            };
          })
        );
      }

      if (Array.isArray(recentData)) {
        setRecentVehicles(
          recentData.slice(0, 4).map((item: any) => ({
            id: item.id.toString(),
            year: item.year,
            make: item.make,
            model: item.model,
            price: item.price_display || "N/A",
            image: item.image_url,
            mileage: item.mileage || 0,
            listingType: item.listing_type,
          }))
        );
      }

      if (trendingData.trending) {
        setTrendingSearches(trendingData.trending);
      }
    } catch (error) {
      console.error("Failed to fetch home data:", error);
    }
  };

  useEffect(() => {
    fetchHomeData();
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchHomeData();
    setRefreshing(false);
  }, []);

  const logSearch = async (term: string) => {
    try {
      await fetch(`${API_URL}/api/log-search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ q: term }),
      });
    } catch (error) {
      console.error("Failed to log search:", error);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      logSearch(searchQuery);
      router.push({
        pathname: "/all_listings",
        params: { q: searchQuery },
      });
    }
  };

  const requireLogin = (message: string) => {
    if (Platform.OS === "web") {
      router.push("/login");
      return;
    }

    Alert.alert("Login Required", message, [
      { text: "Cancel", style: "cancel" },
      { text: "Login", onPress: () => router.push("/login") },
    ]);
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
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.accent}
        />
      }
    >
      <View style={styles.searchHero}>
        <Text style={styles.heroTitle}>Find Your Next Car</Text>
        <Text style={styles.heroSubtitle}>
          {"Search Ethiopia's best selection of modern cars for sale."}
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
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => setSearchQuery("")}
                hitSlop={10}
                style={{ padding: 4 }}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={COLORS.mutedForeground}
                />
              </Pressable>
            )}
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

          {/* Trending Searches Section */}
          {trendingSearches.length > 0 && !searchQuery && (
            <View style={styles.trendingContainer}>
              <Text style={styles.trendingLabel}>Trending:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
              >
                {trendingSearches.map((term, index) => (
                  <Pressable
                    key={index}
                    style={styles.trendingChip}
                    onPress={() => setSearchQuery(term)}
                  >
                    <Text style={styles.trendingChipText}>{term}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

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
                    onPress={() => {
                      logSearch(searchQuery);
                      router.push(`/${car.id}`);
                    }}
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
              testID="home-find-request-button"
              style={[styles.heroButton, styles.primaryButton]}
              onPress={() => {
                if (!user) {
                  requireLogin("Please log in to let us find a car for you.");
                } else {
                  router.push("/request");
                }
              }}
            >
              <Text style={[styles.heroButtonText, styles.primaryButtonText]}>
                Let Us Find It For You
              </Text>
            </Pressable>
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Pressable
              testID="home-trade-in-button"
              style={[styles.heroButton, styles.secondaryButton]}
              onPress={() => {
                if (!user) {
                  requireLogin("Please log in to get a trade-in offer.");
                } else {
                  router.push("/trade-in");
                }
              }}
            >
              <Text style={[styles.heroButtonText, styles.secondaryButtonText]}>
                Get a Trade-in Offer
              </Text>
            </Pressable>
          </View>
        </View>
        {user && showInfo && (
          <View style={styles.infoContainer}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={COLORS.accent}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.infoText}>
              Your request is sent to our verified dealer network. Dealers will
              review your needs and send you competitive offers or trade-in
              valuations directly in the app.
            </Text>
            <Pressable onPress={handleDismissInfo} hitSlop={10}>
              <Ionicons name="close" size={20} color={COLORS.mutedForeground} />
            </Pressable>
          </View>
        )}
      </View>

      {/* --- Featured Cars Section --- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Featured Vehicles</Text>
        <FlatList
          horizontal
          data={featuredVehicles}
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
          {recentVehicles.map((item) => (
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
    paddingBottom: Platform.OS === "web" ? 12 : 40,
  },
  headerTitleText: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.foreground,
  },
  // Hero Section
  searchHero: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "web" ? 14 : 20,
    paddingBottom: Platform.OS === "web" ? 24 : 30,
  },
  heroTitle: {
    fontSize: Platform.OS === "web" ? 24 : 28,
    fontWeight: "700",
    color: COLORS.foreground,
    textAlign: "center",
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: Platform.OS === "web" ? 15 : 16,
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginBottom: Platform.OS === "web" ? 16 : 20,
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
  infoContainer: {
    marginTop: 20,
    flexDirection: "row",
    backgroundColor: "rgba(163, 112, 247, 0.1)",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  infoText: {
    flex: 1,
    color: COLORS.mutedForeground,
    fontSize: 13,
    lineHeight: 18,
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
  trendingContainer: {
    marginTop: 15,
    flexDirection: "row",
    alignItems: "center",
  },
  trendingLabel: {
    color: COLORS.mutedForeground,
    fontSize: 12,
    fontWeight: "bold",
    marginRight: 8,
  },
  trendingChip: {
    backgroundColor: "rgba(163, 112, 247, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "rgba(163, 112, 247, 0.3)",
  },
  trendingChipText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: "500",
    textTransform: "capitalize",
  },
});

export default HomeScreen;
