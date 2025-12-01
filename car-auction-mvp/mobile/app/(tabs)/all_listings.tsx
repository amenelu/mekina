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
import { useRouter } from "expo-router";

import HeaderRight from "../_components/HeaderRight";
import Footer from "../_components/Footer";
import VehicleCard, { Vehicle } from "../_components/VehicleCard";

// --- Mock Data (can be replaced with API call) ---
const allVehicles: Vehicle[] = [
  {
    id: "1",
    year: 2022,
    make: "Hyundai",
    model: "Ioniq 5",
    price: "3,800,000 ETB",
    image:
      "https://imgs.search.brave.com/IMfjRFIBmlHG1FAY9P4j_f3ygIpC6_-Lq48rCDOeoz4/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9kaS11/cGxvYWRzLXBvZDku/ZGVhbGVyaW5zcGly/ZS5jb20vY2FwaXRv/bGh5dW5kYWlzYW5q/b3NlL3VwbG9hZHMv/MjAyMS8xMi8yMDIy/LUh5dW5kYWktSU9O/SVEtNS1JbnRyby5w/bmc",
    mileage: 25000,
    listingType: "Sale",
  },
  {
    id: "2",
    year: 2021,
    make: "Volkswagen",
    model: "ID.4",
    price: "Current Bid: 3,100,000 ETB",
    image:
      "https://imgs.search.brave.com/qt8FWIjaoCfMuFfwo7qFDXLFJenfb37wtMaiMqEyDsA/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9jbGVh/bnRlY2huaWNhLmNv/bS93cC1jb250ZW50/L3VwbG9hZHMvMjAy/NC8wNS9WVy12b2xr/c3dhZ2VuLWlkLjQt/aWQ0LWN1di1jcm9z/c292ZXItc3V2LWVs/ZWN0cmljLWV2LUtZ/TEUtRklFTEQtQ2xl/YW5UZWNobmljYS04/MDB4NDQ1LmpwZw",
    mileage: 45000,
    listingType: "Auction",
  },
  {
    id: "3",
    year: 2023,
    make: "BYD",
    model: "Atto 3",
    price: "2,950,000 ETB",
    image:
      "https://imgs.search.brave.com/qt8FWIjaoCfMuFfwo7qFDXLFJenfb37wtMaiMqEyDsA/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9jbGVh/bnRlY2huaWNhLmNv/bS93cC1jb250ZW50/L3VwbG9hZHMvMjAy/NC8wNS9WVy12b2xr/c3dhZ2VuLWlkLjQt/aWQ0LWN1di1jcm9z/c292ZXItc3V2LWVs/ZWN0cmljLWV2LUtZ/TEUtRklFTEQtQ2xl/YW5UZWNobmljYS04/MDB4NDQ1LmpwZw",
    mileage: 15000,
    listingType: "Sale",
  },
  {
    id: "4",
    year: 2020,
    make: "Mercedes-Benz",
    model: "EQC",
    price: "Current Bid: 4,500,000 ETB",
    image:
      "https://imgs.search.brave.com/1-RrtfNbEgi3rUJFAdyLJfc4cwd9PAlVKZ3FFQe8HPw/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly90My5m/dGNkbi5uZXQvanBn/LzA0LzA1LzA1Lzk2/LzM2MF9GXzQwNTA1/OTYyOV9sZkFDb0Vu/WXo0Z1RGd0dXSks2/aWxLMUtjQmNYdGQy/Vi5qcGc",
    mileage: 60000,
    listingType: "Auction",
  },
  {
    id: "5",
    year: 2023,
    make: "Toyota",
    model: "RAV4",
    price: "3,500,000 ETB",
    image:
      "https://imgs.search.brave.com/v2a8HQzdx9CdYjNiPZWMjNhP0Ijrs6m42WMY2dApHWE/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9oaXBz/LmhlYXJzdGFwcHMu/Y29tL2htZy1wcm9k/L2ltYWdlcy8yMDIz/LXRveW90YS1yYXY0/LWh5YnJpZC13b29k/bGFuZC1lZGl0aW9u/LTM2NTktMTY3NTEx/NjM1Ni5qcGc_Y3Jv/cD0xeHc6MXhoO2Nl/bnRlcix0b3A",
    mileage: 5000,
    listingType: "Sale",
  },
  {
    id: "6",
    year: 2024,
    make: "Ford",
    model: "Mustang Mach-E",
    price: "Current Bid: 4,200,000 ETB",
    image:
      "https://imgs.search.brave.com/_06DoRpRgtWgSfBoiobDkKKpTvv8D9tZBomMujqgwjU/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9waWN0/dXJlcy5kZWFsZXIu/Y29tL2EvYXV0b25h/dGlvbmthdHlmb3Jk/ZmQvMTIzNC9jNTkz/OGNjY2U2ZTQ0MmFm/YjY2MjA0MWVlODAw/ZmYxOS5wbmc_aW1w/b2xpY3k9ZG93bnNp/emVfYmtwdCZ3PTI1/MDA",
    mileage: 12000,
    listingType: "Auction",
  },
  {
    id: "7",
    year: 2022,
    make: "Kia",
    model: "EV6",
    price: "3,750,000 ETB",
    image:
      "https://imgs.search.brave.com/flY_UFc1PtTX3AZTE_v5AOnEf3eYwwSPwHf8FFAt9oY/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly93d3cu/dGhlZHJpdmUuY29t/L3dwLWNvbnRlbnQv/dXBsb2Fkcy8yMDI0/LzA1LzE0L2tpYV9l/djZfNjY3LmpwZWc_/cXVhbGl0eT04NSZ3/PTc2OA",
    mileage: 30000,
    listingType: "Sale",
  },
  {
    id: "8",
    year: 2021,
    make: "Tesla",
    model: "Model Y",
    price: "Current Bid: 4,800,000 ETB",
    image:
      "https://imgs.search.brave.com/16ZSeFix5EMCTRLxyO4ZHklz2lGf44dO19lib87n2Ko/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9kaWdp/dGFsYXNzZXRzLnRl/c2xhLmNvbS90ZXNs/YS1jb250ZW50cy9p/bWFnZS91cGxvYWQv/Zl9hdXRvLHFfYXV0/by9sZWFybl9uZXdf/bW9kZWx5X2V4dF8x/LmpwZw",
    mileage: 20000,
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

const AllListingsScreen = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [compareItems, setCompareItems] = useState<
    { id: string; image: string }[]
  >([]);

  // In a real app, you'd filter based on state. For now, we just display all.
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
            onPress={() =>
              router.push({
                pathname: "/compare",
                params: { car_ids: compareItems.map((c) => c.id) },
              })
            }
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
