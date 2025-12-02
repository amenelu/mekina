import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, Stack, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import VehicleCard, { Vehicle } from "./_components/VehicleCard";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  mutedForeground: "#8A94A3",
  border: "#313843",
  success: "#28a745",
};

const CarDetailScreen = () => {
  const { id } = useLocalSearchParams();
  const [car, setCar] = useState<any | null>(null); // Use 'any' for now to match API response
  const [similarCars, setSimilarCars] = useState<Vehicle[]>([]);
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const { width } = useWindowDimensions();

  useEffect(() => {
    const fetchCarDetails = async () => {
      if (!id) return;
      setLoading(true);
      try {
        // IMPORTANT: Replace with your computer's local IP address
        const response = await fetch(
          `http://192.168.100.9:5001/api/cars/${id}`
        );
        const data = await response.json();
        if (data.car) {
          setCar(data.car);
          setSimilarCars(data.similar_cars || []);
          setMainImage(data.car.primary_image_url);
        }
      } catch (error) {
        console.error("Failed to fetch car details:", error);
        Alert.alert("Error", "Could not load car details.");
      } finally {
        setLoading(false);
      }
    };

    fetchCarDetails();
  }, [id]);

  // Use a layout effect to set the title. This runs before the paint,
  // preventing the `[id]` from ever showing.
  React.useLayoutEffect(() => {
    const title = car
      ? `${car.year} ${car.make} ${car.model}`
      : id
      ? "Loading..."
      : "Not Found";
    navigation.setOptions({ title });
  }, [navigation, car, id]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={{ color: COLORS.foreground, marginTop: 10 }}>
          Loading Car Details...
        </Text>
      </View>
    );
  }

  if (!car) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: COLORS.foreground }}>Car not found.</Text>
      </View>
    );
  }

  // Mock thumbnails - in a real app, these would come from the API
  const thumbnails = [
    car.primary_image_url,
    ...Array(4).fill("https://via.placeholder.com/100"),
  ];

  return (
    <>
      <Stack.Screen />
      <ScrollView style={styles.container}>
        {/* Image Gallery */}
        <View style={styles.imageGallery}>
          <View>
            <Image
              source={{ uri: mainImage || car.primary_image_url }}
              style={styles.mainImage}
            />
            {car.is_featured && (
              <View style={styles.featuredTagContainer}>
                <Text style={styles.featuredTag}>Featured</Text>
              </View>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {thumbnails.map((thumbUri, index) => (
              <Pressable key={index} onPress={() => setMainImage(thumbUri)}>
                <Image source={{ uri: thumbUri }} style={styles.thumbnail} />
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Main Content */}
        <View style={styles.contentContainer}>
          <View style={styles.titleContainer}>
            <Text
              style={styles.title}
            >{`${car.year} ${car.make} ${car.model}`}</Text>
            <Text
              style={[
                styles.listingTypeTag,
                {
                  backgroundColor:
                    car.listing_type === "sale"
                      ? COLORS.success
                      : COLORS.accent,
                },
              ]}
            >
              {car.listing_type === "sale" ? "For Sale" : "Auction"}
            </Text>
          </View>

          {/* Conditional UI for Sale vs Auction */}
          {car.listing_type === "sale" ? (
            <View style={styles.priceBox}>
              <Text style={styles.priceLabel}>Fixed Price</Text>
              <Text style={styles.priceValue}>{car.price_display}</Text>
            </View>
          ) : (
            <View style={styles.bidBox}>
              <View style={styles.bidInfo}>
                <Text style={styles.bidLabel}>Current Bid</Text>
                <Text style={styles.bidValue}>{car.price_display}</Text>
              </View>
              <View style={styles.bidInfo}>
                <Text style={styles.bidLabel}>Time Left</Text>
                <Text style={styles.bidValue}>
                  {car.auction_details?.time_left || "N/A"}
                </Text>
              </View>
            </View>
          )}

          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{car.description}</Text>

          <Text style={styles.sectionTitle}>Specifications</Text>
          <View style={styles.specsContainer}>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Condition</Text>
              <Text style={styles.specValue}>{car.condition}</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Mileage</Text>
              <Text style={styles.specValue}>
                {car.mileage ? `${car.mileage.toLocaleString()} km` : "N/A"}
              </Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Transmission</Text>
              <Text style={styles.specValue}>{car.transmission}</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Fuel Type</Text>
              <Text style={styles.specValue}>{car.fuel_type}</Text>
            </View>
          </View>

          {/* Similar Cars Section */}
          {similarCars.length > 0 && (
            <View style={styles.similarSection}>
              <Text style={styles.sectionTitle}>Similar Listings</Text>
              <View style={styles.vehicleGrid}>
                {similarCars.map((item) => (
                  <VehicleCard
                    key={item.id}
                    item={item}
                    style={{ width: width / 2 - 30 }}
                  />
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
      {/* Floating Action Button */}
      <View style={styles.footer}>
        <Pressable style={styles.contactButton}>
          <Ionicons name="chatbubbles-outline" size={20} color="#fff" />
          <Text style={styles.contactButtonText}>Contact Seller</Text>
        </Pressable>
      </View>
    </>
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
  imageGallery: {
    // Styles for the gallery container
  },
  mainImage: {
    width: "100%",
    height: 250,
    resizeMode: "cover",
  },
  thumbnail: {
    width: 80,
    height: 80,
    resizeMode: "cover",
    margin: 5,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  featuredTagContainer: {
    position: "absolute",
    top: 15,
    left: 15,
    zIndex: 1,
  },
  featuredTag: {
    backgroundColor: COLORS.accent,
    color: COLORS.foreground,
    fontSize: 14,
    fontWeight: "bold",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: "hidden",
  },
  contentContainer: {
    padding: 20,
  },
  titleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.foreground,
    flex: 1,
    marginRight: 10,
  },
  listingTypeTag: {
    color: "#fff",
    fontWeight: "bold",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    fontSize: 12,
    overflow: "hidden",
  },
  priceBox: {
    backgroundColor: COLORS.card,
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  priceLabel: {
    color: COLORS.mutedForeground,
    fontSize: 14,
    marginBottom: 5,
  },
  priceValue: {
    color: COLORS.accent,
    fontSize: 22,
    fontWeight: "bold",
  },
  bidBox: {
    backgroundColor: COLORS.card,
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  bidInfo: {
    alignItems: "center",
  },
  bidLabel: {
    color: COLORS.mutedForeground,
    fontSize: 14,
    marginBottom: 5,
  },
  bidValue: {
    color: COLORS.foreground,
    fontSize: 18,
    fontWeight: "bold",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.foreground,
    marginTop: 10,
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: COLORS.mutedForeground,
    lineHeight: 24,
  },
  specsContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 15,
  },
  specItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  specLabel: {
    color: COLORS.mutedForeground,
    fontSize: 16,
  },
  specValue: {
    color: COLORS.foreground,
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    padding: 20,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  contactButton: {
    backgroundColor: COLORS.accent,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  contactButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
  similarSection: {
    marginTop: 20,
  },
  vehicleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
  },
});

export default CarDetailScreen;
