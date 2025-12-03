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
} from "react-native";
import { useNavigation } from "expo-router";
import { useScrollToTop } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Footer from "../_components/Footer";
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

export type RentalVehicle = {
  id: number; // The API sends the car ID as a number
  year: number;
  make: string;
  model: string;
  price_display: string;
  image_url: string;
};

import { useRouter } from "expo-router";

const RentalCard = ({ item }: { item: RentalVehicle }) => {
  const router = useRouter();
  return (
    <Pressable
      style={styles.rentalCard}
      onPress={() =>
        router.push({
          pathname: "/rentals/[id]",
          params: { id: item.id.toString() }, // The detail page expects the car ID
        })
      }
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
  const [rentalVehicles, setRentalVehicles] = useState<RentalVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // This hook handles scrolling to top when the active tab is pressed
  useScrollToTop(ref);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <Pressable
          onPress={() => ref.current?.scrollTo({ y: 0, animated: true })}
        >
          <Text style={styles.headerTitleText}>Rentals</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    const fetchRentals = async () => {
      setLoading(true);
      try {
        // The backend uses the main listings endpoint with a query parameter for rentals.
        const response = await fetch(
          `${API_BASE_URL}/api/listings?listing_type=rental`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setRentalVehicles(data.rentals || []);
      } catch (error) {
        console.error("Failed to fetch rental vehicles:", error);
        Alert.alert(
          "Connection Error",
          "Could not load rental listings. Please try again later."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRentals();
  }, []);

  const filteredVehicles = rentalVehicles.filter((vehicle) =>
    `${vehicle.year} ${vehicle.make} ${vehicle.model}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  if (loading) {
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
    <ScrollView style={styles.container} ref={ref}>
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickFiltersContainer}
        >
          <Pressable style={styles.filterButton}>
            <Text style={styles.filterButtonText}>Any Price</Text>
          </Pressable>
          <Pressable style={styles.filterButton}>
            <Text style={styles.filterButtonText}>Any Body Type</Text>
          </Pressable>
          <Pressable style={styles.filterButton}>
            <Text style={styles.filterButtonText}>Any Transmission</Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* --- Listings Grid --- */}
      <View style={styles.gridContainer}>
        {filteredVehicles.length > 0 ? (
          filteredVehicles.map((item) => (
            <RentalCard key={item.id} item={item} />
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
    padding: 20,
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
    height: 200,
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
    marginTop: 5,
  },
});

export default RentalsScreen;
