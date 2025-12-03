import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import HeaderRight from "../_components/HeaderRight";
import Footer from "../_components/Footer";
import VehicleCard, { Vehicle } from "../_components/VehicleCard";
import { API_BASE_URL } from "../../apiConfig";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  mutedForeground: "#8A94A3",
  border: "#313843",
  secondary: "#313843",
};

const AllListingsScreen = () => {
  const router = useRouter();
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [compareItems, setCompareItems] = useState<
    { id: string; image: string }[]
  >([]);

  // Filter states
  const [filters, setFilters] = useState({
    condition: "",
    body_type: "",
    fuel_type: "",
  });
  // State for the new unified filter modal
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [tempFilters, setTempFilters] = useState(filters);

  // Debounce search input to avoid excessive API calls
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // 500ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  React.useEffect(() => {
    const fetchVehicles = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (debouncedSearchQuery) {
          params.append("q", debouncedSearchQuery);
        }
        if (filters.condition) {
          params.append("condition", filters.condition);
        }
        if (filters.body_type) {
          params.append("body_type", filters.body_type);
        }
        if (filters.fuel_type) {
          params.append("fuel_type", filters.fuel_type);
        }

        const response = await fetch(
          `${API_BASE_URL}/api/listings?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        const formattedData = data.map((item: any) => ({
          id: item.id.toString(),
          year: item.year,
          make: item.make,
          model: item.model,
          price: item.price_display || "N/A",
          image: item.image_url,
          mileage: item.mileage || 0,
          is_featured: item.is_featured,
          listingType: item.listing_type,
        }));

        setAllVehicles(formattedData);
      } catch (error) {
        console.error("Failed to fetch vehicles:", error);
        Alert.alert(
          "Connection Error",
          "Could not connect to the server. Please make sure your backend is running and you are on the same network."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, [debouncedSearchQuery, filters]);

  const handleToggleCompare = (itemId: string) => {
    const isCurrentlyCompared = compareItems.some((item) => item.id === itemId);

    setCompareItems((prev) => {
      if (isCurrentlyCompared) {
        return prev.filter((item) => item.id !== itemId);
      }
      const vehicle = allVehicles.find((v) => v.id === itemId);
      if (vehicle) {
        return [...prev, { id: vehicle.id, image: vehicle.image }];
      }
      return prev;
    });
    // Limit comparison to 4 items
    if (compareItems.length >= 4 && !isCurrentlyCompared) {
      alert("You can only compare up to 4 cars at a time.");
      setCompareItems((prev) => prev.slice(0, 4));
    }
  };
  const handleClearCompare = () => {
    setCompareItems([]);
  };

  const filterOptions = {
    condition: ["New", "Used"],
    body_type: ["SUV", "Sedan", "Hatchback", "Pickup", "Coupe", "Minivan"],
    fuel_type: ["Gasoline", "Diesel", "Electric", "Hybrid"],
  };

  const clearAllFilters = () => {
    setFilters({
      condition: "",
      body_type: "",
      fuel_type: "",
    });
    setSearchQuery("");
  };
  return (
    <>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={{ color: COLORS.foreground, marginTop: 10 }}>
            Loading Listings...
          </Text>
        </View>
      )}
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
          <View style={styles.quickFiltersContainer}>
            <Pressable
              style={styles.filterButton}
              onPress={() => {
                setTempFilters(filters); // Sync temp state with active filters
                setFilterModalVisible(true);
              }}
            >
              <Ionicons
                name="options-outline"
                size={20}
                color={COLORS.mutedForeground}
              />
              <Text style={styles.filterButtonText}>Filter</Text>
            </Pressable>
            {/* You can add a clear all button here if desired */}
          </View>
        </View>

        {/* --- Listings Grid --- */}
        <View style={styles.gridContainer}>
          {!loading && allVehicles.length > 0
            ? allVehicles.map((item) => (
                <VehicleCard
                  key={item.id}
                  item={item}
                  isCompared={compareItems.some((c) => c.id === item.id)}
                  onToggleCompare={handleToggleCompare}
                />
              ))
            : !loading && (
                <Text style={styles.noResultsText}>
                  No listings match your search criteria.
                </Text>
              )}
        </View>

        <Footer />
      </ScrollView>
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
            <ScrollView>
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
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalClearButton}
                onPress={() => {
                  // Clear the main filters directly and close the modal
                  setFilters({
                    condition: "",
                    body_type: "",
                    fuel_type: "",
                  });
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
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20, 24, 31, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
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
    alignItems: "center",
  },
  filterButton: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  clearFiltersButton: {
    padding: 8,
    justifyContent: "center",
  },
  filterButtonText: {
    color: COLORS.mutedForeground,
    fontWeight: "500",
    fontSize: 14,
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
