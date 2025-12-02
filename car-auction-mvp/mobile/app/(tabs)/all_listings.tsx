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
  const [compareItems, setCompareItems] = useState<
    { id: string; image: string }[]
  >([]);

  React.useEffect(() => {
    const fetchVehicles = async () => {
      try {
        // IMPORTANT: Replace with your computer's local IP address
        const response = await fetch(`${API_BASE_URL}/api/listings`);
        const data = await response.json();

        const formattedData = data.map((item: any) => ({
          id: item.id.toString(),
          year: item.year,
          make: item.make,
          model: item.model,
          price: item.price_display,
          image: item.image_url,
          mileage: item.mileage || 0,
          is_featured: item.is_featured,
          listingType: item.listing_type === "Auction" ? "Auction" : "Sale",
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
  }, []);

  const filteredVehicles = allVehicles.filter((vehicle) =>
    `${vehicle.year} ${vehicle.make} ${vehicle.model}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

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
              <VehicleCard
                key={item.id}
                item={item}
                isCompared={compareItems.some((c) => c.id === item.id)}
                onToggleCompare={handleToggleCompare}
              />
            ))
          ) : (
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
});

export default AllListingsScreen;
