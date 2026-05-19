import React, { useCallback, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  Pressable,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";

import Footer from "@/components/_components/Footer";
import VehicleCard, { Vehicle } from "@/components/_components/VehicleCard";
import API_URL from "@/constants/Api";
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

function matchesSearchTerms(
  searchQuery: string,
  item: {
    year?: number;
    make?: string;
    model?: string;
    condition?: string;
    body_type?: string;
    drivetrain?: string;
    fuel_type?: string;
    mileage?: number;
    electric_range_km?: number | null;
  }
) {
  const terms = searchQuery
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (terms.length === 0) {
    return true;
  }

  const haystack = [
    item.year,
    item.make,
    item.model,
    item.condition,
    item.body_type,
    item.drivetrain,
    item.fuel_type,
    item.mileage,
    item.electric_range_km,
  ]
    .filter((value) => value !== undefined && value !== null)
    .join(" ")
    .toLowerCase();
  const normalizedHaystack = normalizeSearchText(haystack);
  const normalizedQuery = normalizeSearchText(searchQuery);
  return (
    normalizedHaystack.includes(normalizedQuery) ||
    terms.every((term) => haystack.includes(term))
  );
}

const AllListingsScreen = () => {
  const router = useRouter();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(q || "");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const searchRequestIdRef = React.useRef(0);
  const [compareItems, setCompareItems] = useState<
    { id: string; image: string }[]
  >([]);
  const [refreshing, setRefreshing] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
    condition: "",
    body_type: "",
    fuel_type: "",
    drivetrain: "",
  });
  // State for the new unified filter modal
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [tempFilters, setTempFilters] = useState(filters);

  const activeFilterEntries = (
    Object.entries(filters) as [keyof typeof filters, string][]
  ).filter(([, value]) => Boolean(value));
  const activeFilterCount = activeFilterEntries.length;
  const hasActiveFilters = activeFilterCount > 0;

  React.useEffect(() => {
    if (q) {
      setSearchQuery(q);
    }
  }, [q]);

  // Debounce search input to avoid excessive API calls
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // 500ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const fetchVehicles = useCallback(async (isRefresh = false) => {
    const currentRequestId = ++searchRequestIdRef.current;
    if (!isRefresh) setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (debouncedSearchQuery) {
        params.q = debouncedSearchQuery.trim();
      }
      if (filters.condition) {
        params.condition = filters.condition;
      }
      if (filters.body_type) {
        params.body_type = filters.body_type;
      }
      if (filters.fuel_type) {
        params.fuel_type = filters.fuel_type;
      }
      if (filters.drivetrain) {
        params.drivetrain = filters.drivetrain;
      }

      const response = await getListings(params);
      if (currentRequestId !== searchRequestIdRef.current) {
        return;
      }
      const data = response.data;

      const formattedData = data
        .filter((item: any) => matchesSearchTerms(debouncedSearchQuery, item))
        .map((item: any) => ({
          id: item.id.toString(),
          year: item.year,
          make: item.make,
          model: item.model,
          price: item.price_display || "N/A",
          image: item.image_url,
          mileage: item.mileage || 0,
          condition: item.condition,
          body_type: item.body_type,
          drivetrain: item.drivetrain,
          fuel_type: item.fuel_type,
          electric_range_km: item.electric_range_km,
          is_featured: item.is_featured,
          listingType: item.listing_type,
        }));

      setAllVehicles(formattedData);
    } catch (error) {
      if (currentRequestId === searchRequestIdRef.current) {
        console.error("Failed to fetch vehicles:", error);
        Alert.alert("Connection Error", `Could not connect to ${API_URL}`);
      }
    } finally {
      if (currentRequestId === searchRequestIdRef.current) {
        setLoading(false);
        if (isRefresh) setRefreshing(false);
      }
    }
  }, [debouncedSearchQuery, filters]);

  React.useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchVehicles(true);
  };

  const handleToggleCompare = (itemId: string) => {
    const isCurrentlyCompared = compareItems.some((item) => item.id === itemId);

    setCompareItems((prev) => {
      if (isCurrentlyCompared) {
        return prev.filter((item) => item.id !== itemId);
      }

      if (prev.length >= 4) {
        Alert.alert("Compare Limit", "You can only compare up to 4 cars at a time.");
        return prev;
      }

      const vehicle = allVehicles.find((v) => v.id === itemId);
      if (vehicle) {
        return [...prev, { id: vehicle.id, image: vehicle.image }];
      }
      return prev;
    });
  };
  const handleClearCompare = () => {
    setCompareItems([]);
  };

  const filterOptions = {
    condition: ["New", "Used"],
    body_type: ["SUV", "Sedan", "Hatchback", "Pickup", "Coupe", "Minivan"],
    fuel_type: ["Gasoline", "Diesel", "Electric", "Hybrid"],
    drivetrain: ["FWD", "RWD", "AWD", "4WD"],
  };

  const filterLabels: Record<keyof typeof filters, string> = {
    condition: "Condition",
    body_type: "Body Type",
    fuel_type: "Fuel Type",
    drivetrain: "Drivetrain",
  };

  const clearSingleFilter = (key: keyof typeof filters) => {
    setFilters((prev) => ({
      ...prev,
      [key]: "",
    }));
    setTempFilters((prev) => ({
      ...prev,
      [key]: "",
    }));
  };

  const clearAllFilters = () => {
    const clearedFilters = {
      condition: "",
      body_type: "",
      fuel_type: "",
      drivetrain: "",
    };
    setFilters(clearedFilters);
    setTempFilters(clearedFilters);
  };

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <View style={styles.searchRow}>
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
                    {filterLabels[key]}: {value}
                  </Text>
                  <Ionicons
                    name="close"
                    size={14}
                    color={COLORS.foreground}
                  />
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
      {loading && !refreshing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={{ color: COLORS.foreground, marginTop: 10 }}>
            Loading Listings...
          </Text>
        </View>
      )}
      <FlatList
        style={styles.list}
        data={!loading ? allVehicles : []}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        numColumns={2}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        columnWrapperStyle={{
          justifyContent: "space-between",
          paddingHorizontal: 20,
        }}
        contentContainerStyle={{
          paddingBottom: Platform.OS === "web" ? 8 : 20,
          paddingTop: 20,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
          />
        }
        renderItem={({ item }) => (
          <View style={{ width: "48%", marginBottom: 15 }}>
            <VehicleCard
              item={item}
              isCompared={compareItems.some((c) => c.id === item.id)}
              onToggleCompare={handleToggleCompare}
              style={{ width: "100%" }}
            />
          </View>
        )}
        ListFooterComponent={<Footer />}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.noResultsText}>
              No listings match your search criteria.
            </Text>
          ) : null
        }
      />
      {compareItems.length > 0 && (
        <View style={styles.comparisonBar}>
          <View style={styles.comparisonContent}>
            <View style={styles.comparisonCarsPreview}>
              {compareItems.map((car, index) => (
                <Image
                  key={car.id}
                  source={{ uri: car.image }}
                  style={[
                    styles.comparisonPreviewImg,
                    { zIndex: compareItems.length - index },
                  ]}
                />
              ))}
            </View>
            <Text
              style={styles.comparisonText}
            >{`Comparing ${compareItems.length} item(s)`}</Text>
          </View>
          <Pressable
            style={[styles.comparisonButton, styles.viewButton]}
            onPress={() => {
              if (compareItems.length > 1) {
                router.push({
                  pathname: "/compare",
                  params: { car_ids: compareItems.map((c) => c.id).join(",") },
                });
              } else {
                Alert.alert(
                  "Select More Cars",
                  "Please select at least two cars to compare."
                );
              }
            }}
          >
            <Text style={styles.viewButtonText}>View</Text>
          </Pressable>
          <Pressable
            style={[styles.comparisonButton, styles.clearButton]}
            onPress={handleClearCompare}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </Pressable>
        </View>
      )}
      {/* Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isFilterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <Pressable
          style={styles.modalContainer}
          onPress={() => setFilterModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filters</Text>
            <ScrollView
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
            >
              {/* Condition Filter */}
              <Text style={styles.modalSectionTitle}>Condition</Text>
              <View style={styles.modalOptionsGrid}>
                {filterOptions.condition.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.modalOption,
                      tempFilters.condition === option &&
                        styles.modalOptionSelected,
                    ]}
                    onPress={() =>
                      setTempFilters((f) => ({
                        ...f,
                        condition: f.condition === option ? "" : option,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        tempFilters.condition === option &&
                          styles.modalOptionTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Body Type Filter */}
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

              {/* Fuel Type Filter */}
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

              {/* Drivetrain Filter */}
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
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  list: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20, 24, 31, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "web" ? 14 : 20,
    paddingBottom: Platform.OS === "web" ? 16 : 20,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    padding: 20,
  },
  noResultsText: {
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginTop: 40,
    width: "100%",
    fontSize: 16,
  },
  // Comparison Bar Styles
  comparisonBar: {
    position: "absolute",
    bottom: 10,
    left: 20,
    right: 20,
    backgroundColor: "#2c3e50", // Dark blue-gray from web
    borderRadius: 50, // Pill shape
    padding: 10,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  comparisonContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },
  comparisonCarsPreview: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  comparisonPreviewImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    marginLeft: -12, // Create overlap
  },
  comparisonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
    flexShrink: 1, // Allow text to shrink if needed
  },
  comparisonButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginLeft: 10,
  },
  viewButton: {
    backgroundColor: COLORS.accent,
  },
  viewButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  clearButton: {
    backgroundColor: "#e74c3c", // Red color for clear/delete
  },
  clearButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  // Modal Styles
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
});

export default AllListingsScreen;
