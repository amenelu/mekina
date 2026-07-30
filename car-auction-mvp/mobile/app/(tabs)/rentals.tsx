import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  Pressable,
  ImageBackground,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
  Modal,
  TouchableOpacity,
  useWindowDimensions,
  StyleProp,
  ViewStyle,
} from "react-native";
import { Redirect, useNavigation, useRouter } from "expo-router";
import { useScrollToTop } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Footer from "@/components/_components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { ADMIN_ROUTES } from "@/lib/roleRoutes";
import { getListings } from "@/lib/api/listings";



const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  mutedForeground: "#8A94A3",
  border: "#313843",
  secondary: "#313843",
};

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/\s+/g, "");
}

function getRentalDailyPrice(vehicle: RentalVehicle) {
  if (typeof vehicle.price_per_day === "number") {
    return vehicle.price_per_day;
  }

  const parsed = Number(String(vehicle.price_display || "").replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export type RentalVehicle = {
  id: number; // The API sends the car ID as a number
  year: number;
  make: string;
  model: string;
  price_display: string;
  image_url: string;
  price_per_day?: number | null;
  body_type?: string | null;
  transmission?: string | null;
  drivetrain?: string | null;
  fuel_type?: string | null;
};

const RentalCard = ({
  item,
  style,
}: {
  item: RentalVehicle;
  style?: StyleProp<ViewStyle>;
}) => {
  const router = useRouter();
  return (
    <Pressable
      style={[styles.rentalCard, style]}
      onPress={() => router.push(`/${item.id}`)}
    >
      <ImageBackground
        source={{ uri: item.image_url }}
        style={styles.rentalCardImage}
        resizeMode="cover"
      >
        <View style={styles.rentalCardOverlay} />
        <View style={styles.rentalCardContent}>
          <Text style={styles.rentalCardTitle}>
            {item.year} {item.make} {item.model}
          </Text>
          <Text style={styles.rentalCardPrice}>{item.price_display}</Text>
        </View>
      </ImageBackground>
    </Pressable>
  );
};

const RentalsScreen = () => {
  const navigation = useNavigation();
  const ref = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();
  const { hasHydrated, user } = useAuth();
  const [rentalVehicles, setRentalVehicles] = useState<RentalVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    max_daily_price: "",
    body_type: "",
    fuel_type: "",
    transmission: "",
    drivetrain: "",
  });
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [tempFilters, setTempFilters] = useState(filters);

  const filterOptions = {
    max_daily_price: [
      { label: "Under 2k/day", value: "2000" },
      { label: "Under 5k/day", value: "5000" },
      { label: "Under 10k/day", value: "10000" },
    ],
    body_type: ["SUV", "Sedan", "Hatchback", "Pickup", "Coupe", "Minivan"],
    fuel_type: ["Gasoline", "Diesel", "Electric", "Hybrid"],
    transmission: ["Automatic", "Manual"],
    drivetrain: ["FWD", "RWD", "AWD", "4WD"],
  };

  const filterLabels: Record<keyof typeof filters, string> = {
    max_daily_price: "Daily Rate",
    body_type: "Body Type",
    fuel_type: "Fuel Type",
    transmission: "Transmission",
    drivetrain: "Drivetrain",
  };

  const getFilterDisplayValue = (key: keyof typeof filters, value: string) => {
    if (key === "max_daily_price") {
      return filterOptions.max_daily_price.find((option) => option.value === value)
        ?.label || `Under ${value}/day`;
    }
    return value;
  };

  const activeFilterEntries = (
    Object.entries(filters) as [keyof typeof filters, string][]
  ).filter(([, value]) => Boolean(value));
  const activeFilterCount = activeFilterEntries.length;
  const hasActiveFilters = activeFilterCount > 0;
  const isWideWeb = Platform.OS === "web" && width >= 1000;
  const rentalColumns = isWideWeb ? (width >= 1500 ? 3 : 2) : 1;
  const rentalCardWidth = isWideWeb
    ? `${100 / rentalColumns - 1.4}%`
    : "100%";

  const clearSingleFilter = (key: keyof typeof filters) => {
    setFilters((prev) => ({ ...prev, [key]: "" }));
    setTempFilters((prev) => ({ ...prev, [key]: "" }));
  };

  const clearAllFilters = () => {
    const clearedFilters = {
      max_daily_price: "",
      body_type: "",
      fuel_type: "",
      transmission: "",
      drivetrain: "",
    };
    setFilters(clearedFilters);
    setTempFilters(clearedFilters);
  };

  // This hook handles scrolling to top when the active tab is pressed
  useScrollToTop(ref);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitleAlign: "center",
      headerTitle: () => (
        <Pressable
          onPress={() => ref.current?.scrollTo({ y: 0, animated: true })}
        >
          <Text style={styles.headerTitleText}>Rentals</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  const fetchRentals = async (isRefresh = false) => {
    if (!hasHydrated || user?.is_admin) {
      return;
    }

    if (!isRefresh) setLoading(true);
    try {
      // The backend uses the main listings endpoint with a query parameter for rentals.
      const response = await getListings({ listing_type: "rental" });
      const data = response.data;
      const rentals = Array.isArray(data)
        ? data
        : Array.isArray(data.rentals)
        ? data.rentals
        : [];
      // The API sends a list of car objects. We need to map them to the RentalVehicle type.
      const formattedData = rentals.map((item: any) => ({
        id: item.id,
        year: item.year,
        make: item.make,
        model: item.model,
        price_display: item.price_display || "N/A", // Ensure price_display is mapped
        image_url: item.image_url,
        price_per_day:
          item.rental_details?.price_per_day ??
          item.rental_listing?.price_per_day ??
          item.price_per_day ??
          null,
        body_type: item.body_type ?? null,
        transmission: item.transmission ?? null,
        drivetrain: item.drivetrain ?? null,
        fuel_type: item.fuel_type ?? null,
      }));
      setRentalVehicles(formattedData);
    } catch (error) {
      console.error("Failed to fetch rental vehicles:", error);
      Alert.alert(
        "Connection Error",
        "Could not load rental listings. Please try again later."
      );
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!hasHydrated || user?.is_admin) {
      return;
    }

    fetchRentals();
  }, [hasHydrated, user?.is_admin]);

  if (hasHydrated && user?.is_admin) {
    return <Redirect href={ADMIN_ROUTES.rentals} />;
  }

  const onRefresh = () => {
    setRefreshing(true);
    fetchRentals(true);
  };

  const filteredVehicles = rentalVehicles.filter((vehicle) => {
    const haystack = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${
      vehicle.body_type || ""
    } ${vehicle.transmission || ""} ${vehicle.drivetrain || ""} ${
      vehicle.fuel_type || ""
    }`;
    const normalizedQuery = normalizeSearchText(searchQuery);
    const matchesSearch =
      normalizedQuery.length === 0 ||
      normalizeSearchText(haystack).includes(normalizedQuery);

    if (!matchesSearch) {
      return false;
    }

    const dailyPrice = getRentalDailyPrice(vehicle);
    const bodyType = normalizeSearchText(vehicle.body_type || "");
    const transmission = normalizeSearchText(vehicle.transmission || "");
    const drivetrain = normalizeSearchText(vehicle.drivetrain || "");
    const fuelType = normalizeSearchText(vehicle.fuel_type || "");

    if (
      filters.max_daily_price &&
      (dailyPrice <= 0 || dailyPrice > Number(filters.max_daily_price))
    ) {
      return false;
    }
    if (
      filters.body_type &&
      !bodyType.includes(normalizeSearchText(filters.body_type))
    ) {
      return false;
    }
    if (
      filters.fuel_type &&
      !fuelType.includes(normalizeSearchText(filters.fuel_type))
    ) {
      return false;
    }
    if (
      filters.transmission &&
      !transmission.includes(normalizeSearchText(filters.transmission))
    ) {
      return false;
    }
    if (
      filters.drivetrain &&
      !drivetrain.includes(normalizeSearchText(filters.drivetrain))
    ) {
      return false;
    }

    return true;
  });

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={{ color: COLORS.foreground, marginTop: 10 }}>
          Loading Rentals...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      ref={ref}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.accent}
        />
      }
    >
      <View
        style={[
          styles.filterContainer,
          isWideWeb && styles.filterContainerWide,
        ]}
      >
        <View style={[styles.filterInner, isWideWeb && styles.filterInnerWide]}>
          {isWideWeb && (
            <View style={styles.pageIntro}>
              <Text style={styles.pageTitle}>Rental Vehicles</Text>
              <Text style={styles.pageSubtitle}>
                Browse rental listings with daily-rate and vehicle-specific
                filters.
              </Text>
            </View>
          )}
        <View style={[styles.searchRow, isWideWeb && styles.searchRowWide]}>
          <View style={styles.searchBar}>
            <Ionicons
              name="search"
              size={20}
              color={COLORS.mutedForeground}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search rental make, model, or year..."
              placeholderTextColor={COLORS.mutedForeground}
              value={searchQuery}
              onChangeText={setSearchQuery}
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
          <Pressable
            style={[
              styles.filterButtonInline,
              hasActiveFilters && styles.filterButtonInlineActive,
            ]}
            onPress={() => {
              setTempFilters(filters);
              setFilterModalVisible(true);
            }}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={hasActiveFilters ? COLORS.foreground : COLORS.mutedForeground}
            />
            {hasActiveFilters && (
              <View style={styles.filterCountBadge}>
                <Text style={styles.filterCountBadgeText}>
                  {activeFilterCount}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
        {hasActiveFilters && (
          <View style={styles.activeFiltersRow}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.activeFiltersContent}
            >
              {activeFilterEntries.map(([key, value]) => (
                <Pressable
                  key={key}
                  style={styles.filterChip}
                  onPress={() => clearSingleFilter(key)}
                >
                  <Text style={styles.filterChipText}>
                    {filterLabels[key]}: {getFilterDisplayValue(key, value)}
                  </Text>
                  <Ionicons name="close" size={14} color={COLORS.foreground} />
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              style={styles.clearFiltersInlineButton}
              onPress={clearAllFilters}
            >
              <Text style={styles.clearFiltersInlineText}>Clear all</Text>
            </Pressable>
          </View>
        )}
        </View>
      </View>

      <Modal
        animationType="slide"
        transparent
        visible={isFilterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <Pressable
          style={styles.modalContainer}
          onPress={() => setFilterModalVisible(false)}
        >
          <Pressable style={styles.modalContent} onPress={() => undefined}>
            <Text style={styles.modalTitle}>Rental Filters</Text>
            <ScrollView
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.modalSectionTitle}>Daily Rate</Text>
              <View style={styles.modalOptionsGrid}>
                {filterOptions.max_daily_price.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.modalOption,
                      tempFilters.max_daily_price === option.value &&
                        styles.modalOptionSelected,
                    ]}
                    onPress={() =>
                      setTempFilters((f) => ({
                        ...f,
                        max_daily_price:
                          f.max_daily_price === option.value ? "" : option.value,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        tempFilters.max_daily_price === option.value &&
                          styles.modalOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalSectionTitle}>Body Type</Text>
              <View style={styles.modalOptionsGrid}>
                {filterOptions.body_type.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.modalOption,
                      tempFilters.body_type === option &&
                        styles.modalOptionSelected,
                    ]}
                    onPress={() =>
                      setTempFilters((f) => ({
                        ...f,
                        body_type: f.body_type === option ? "" : option,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        tempFilters.body_type === option &&
                          styles.modalOptionTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalSectionTitle}>Fuel Type</Text>
              <View style={styles.modalOptionsGrid}>
                {filterOptions.fuel_type.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.modalOption,
                      tempFilters.fuel_type === option &&
                        styles.modalOptionSelected,
                    ]}
                    onPress={() =>
                      setTempFilters((f) => ({
                        ...f,
                        fuel_type: f.fuel_type === option ? "" : option,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        tempFilters.fuel_type === option &&
                          styles.modalOptionTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalSectionTitle}>Transmission</Text>
              <View style={styles.modalOptionsGrid}>
                {filterOptions.transmission.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.modalOption,
                      tempFilters.transmission === option &&
                        styles.modalOptionSelected,
                    ]}
                    onPress={() =>
                      setTempFilters((f) => ({
                        ...f,
                        transmission: f.transmission === option ? "" : option,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        tempFilters.transmission === option &&
                          styles.modalOptionTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalSectionTitle}>Drivetrain</Text>
              <View style={styles.modalOptionsGrid}>
                {filterOptions.drivetrain.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.modalOption,
                      tempFilters.drivetrain === option &&
                        styles.modalOptionSelected,
                    ]}
                    onPress={() =>
                      setTempFilters((f) => ({
                        ...f,
                        drivetrain: f.drivetrain === option ? "" : option,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        tempFilters.drivetrain === option &&
                          styles.modalOptionTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalClearButton}
                onPress={() => {
                  clearAllFilters();
                  setFilterModalVisible(false);
                }}
              >
                <Text style={styles.modalClearButtonText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalApplyButton}
                onPress={() => {
                  setFilters(tempFilters);
                  setFilterModalVisible(false);
                }}
              >
                <Text style={styles.modalApplyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* --- Listings Grid --- */}
      <View
        style={[
          styles.gridContainer,
          isWideWeb && styles.gridContainerWide,
        ]}
      >
        {filteredVehicles.length > 0 ? (
          filteredVehicles.map((item) => (
            <RentalCard
              key={item.id}
              item={item}
              style={{ width: rentalCardWidth as any }}
            />
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerTitleText: {
    fontSize: 18, // Match default header title size
    fontWeight: "600",
    color: COLORS.foreground,
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "web" ? 14 : 20,
    paddingBottom: Platform.OS === "web" ? 16 : 20,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterContainerWide: {
    paddingHorizontal: 28,
    paddingTop: 42,
    paddingBottom: 34,
    backgroundColor: "#202733",
  },
  filterInner: {
    width: "100%",
  },
  filterInnerWide: {
    maxWidth: 1220,
    width: "100%",
    alignSelf: "center",
  },
  pageIntro: {
    alignItems: "center",
    marginBottom: 28,
  },
  pageTitle: {
    color: COLORS.foreground,
    fontSize: 36,
    fontWeight: "800",
    textAlign: "center",
  },
  pageSubtitle: {
    color: COLORS.mutedForeground,
    fontSize: 18,
    marginTop: 10,
    textAlign: "center",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchRowWide: {
    maxWidth: 860,
    width: "100%",
    alignSelf: "center",
  },
  searchHero: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "web" ? 14 : 20,
    paddingBottom: Platform.OS === "web" ? 24 : 30,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
  searchPanel: {
    zIndex: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    flex: 1,
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
  activeFilterButton: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  activeFilterButtonText: {
    color: "#FFFFFF",
  },
  activeFiltersRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  activeFiltersContent: {
    paddingRight: 8,
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: COLORS.accent,
  },
  filterChipText: {
    color: COLORS.foreground,
    fontSize: 13,
    fontWeight: "600",
  },
  clearFiltersInlineButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  clearFiltersInlineText: {
    color: COLORS.mutedForeground,
    fontSize: 13,
    fontWeight: "600",
  },
  filterButtonInline: {
    width: 50,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.secondary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  filterButtonInlineActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  filterCountBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  filterCountBadgeText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: "700",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.foreground,
    marginBottom: 10,
    textAlign: "center",
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.mutedForeground,
    marginTop: 20,
    marginBottom: 10,
  },
  modalOptionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  modalOption: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalOptionSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  modalOptionText: {
    fontSize: 14,
    color: COLORS.mutedForeground,
    fontWeight: "500",
  },
  modalOptionTextSelected: {
    color: COLORS.foreground,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  modalClearButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  modalClearButtonText: {
    color: COLORS.mutedForeground,
    fontSize: 16,
    fontWeight: "bold",
  },
  modalApplyButton: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    flex: 1,
    marginLeft: 10,
  },
  modalApplyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  gridContainer: {
    padding: 20,
  },
  gridContainerWide: {
    padding: 28,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
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
    height: Platform.OS === "web" ? 260 : 200,
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
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginTop: 5,
  },
});

export default RentalsScreen;
