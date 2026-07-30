import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Pressable,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { Vehicle } from "@/components/_components/VehicleCard";
import { getCompareListings } from "@/lib/api/listings";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  mutedForeground: "#8A94A3",
  border: "#313843",
};

const ComparisonCard = ({
  car,
  bestValues,
}: {
  car: Vehicle;
  bestValues: any;
}) => {
  const router = useRouter();
  const isBestPrice = bestValues.price.ids.includes(Number(car.id));
  const isBestYear = bestValues.year.ids.includes(Number(car.id));
  const isBestMileage = bestValues.mileage.ids.includes(Number(car.id));

  return (
    <View style={styles.comparisonCard}>
      <Image source={{ uri: car.image }} style={styles.comparisonImage} />
      <Text style={styles.comparisonCarTitle}>
        {car.year} {car.make} {car.model}
      </Text>
      <View style={styles.cardBody}>
        <View style={[styles.specRow, isBestPrice && styles.bestValueRow]}>
          <Text style={styles.specLabel}>Price</Text>
          <Text style={[styles.specValue, isBestPrice && styles.bestValueText]}>
            {car.price}
          </Text>
        </View>
        <View style={[styles.specRow, isBestYear && styles.bestValueRow]}>
          <Text style={styles.specLabel}>Year</Text>
          <Text style={[styles.specValue, isBestYear && styles.bestValueText]}>
            {car.year}
          </Text>
        </View>
        <View style={[styles.specRow, isBestMileage && styles.bestValueRow]}>
          <Text style={styles.specLabel}>Mileage</Text>
          <Text
            style={[styles.specValue, isBestMileage && styles.bestValueText]}
          >
            {car.mileage.toLocaleString()} km
          </Text>
        </View>
        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Listing Type</Text>
          <Text style={styles.specValue}>{car.listingType}</Text>
        </View>
      </View>
      <Pressable
        style={styles.viewButton}
        onPress={() => router.push(`/${car.id}`)}
      >
        <Text style={styles.viewButtonText}>View Listing</Text>
      </Pressable>
    </View>
  );
};

const CompareScreen = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { car_ids } = params as { car_ids: string | string[] };
  const { width } = useWindowDimensions();
  const [carsToCompare, setCarsToCompare] = useState<Vehicle[]>([]);
  const [bestValues, setBestValues] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const isWideWeb = Platform.OS === "web" && width >= 1000;

  useEffect(() => {
    const fetchComparisonData = async () => {
      if (!car_ids) {
        setLoading(false);
        return;
      }
      try {
        const response = await getCompareListings(String(car_ids));
        const data = response.data;
        if (data.cars && data.best_values) {
          // Map the API response to the Vehicle type structure
          const formattedCars = data.cars.map((item: any) => ({
            id: item.id.toString(),
            year: item.year,
            make: item.make,
            model: item.model,
            price: item.price_display || "N/A",
            image: item.image_url,
            mileage: item.mileage || 0,
            listingType: item.listing_type,
          }));
          setCarsToCompare(formattedCars);
          setBestValues(data.best_values);
        } else {
          // Handle case where API returns an error or empty data
          setCarsToCompare([]);
          setBestValues(null);
        }
      } catch (error) {
        console.error("Failed to fetch comparison data:", error);
        setCarsToCompare([]);
        setBestValues(null);
      } finally {
        setLoading(false);
      }
    };

    fetchComparisonData();
  }, [car_ids]);

  // Also wait for bestValues to be calculated
  if (loading || !bestValues) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (carsToCompare.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>No cars selected for comparison.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
              return;
            }
            router.replace("/(tabs)/all_listings" as any);
          }}
          style={styles.headerBackButton}
        >
          <Text style={styles.headerBackIcon}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Compare Vehicles</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView
        horizontal={!isWideWeb}
        pagingEnabled={!isWideWeb}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.container,
          isWideWeb && styles.containerWide,
        ]}
      >
        {isWideWeb && (
          <View style={styles.pageIntro}>
            <Text style={styles.pageTitle}>Compare Vehicles</Text>
            <Text style={styles.pageSubtitle}>
              Review selected listings side by side before opening the full
              details.
            </Text>
          </View>
        )}
        {carsToCompare.map((car) => (
          <ComparisonCard key={car.id} car={car} bestValues={bestValues} />
        ))}
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 58,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  headerBackButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBackIcon: {
    color: COLORS.foreground,
    fontSize: 34,
    fontWeight: "500",
    lineHeight: 38,
  },
  headerTitle: {
    flex: 1,
    color: COLORS.foreground,
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  headerSpacer: {
    width: 42,
  },
  container: {
    backgroundColor: COLORS.background,
    paddingVertical: 20,
  },
  containerWide: {
    minHeight: "100%",
    width: "100%",
    paddingHorizontal: 28,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: 20,
  },
  pageIntro: {
    width: "100%",
    alignItems: "center",
    marginBottom: 8,
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.foreground,
  },
  comparisonCard: {
    width: 320,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    marginHorizontal: 15,
    overflow: "hidden",
  },
  comparisonImage: {
    width: "100%",
    height: 180,
  },
  comparisonCarTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.foreground,
    padding: 15,
    textAlign: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cardBody: {
    padding: 15,
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  specLabel: {
    color: COLORS.mutedForeground,
    fontSize: 16,
  },
  specValue: {
    color: COLORS.foreground,
    fontSize: 16,
    fontWeight: "500",
  },
  bestValueRow: {
    backgroundColor: "rgba(163, 112, 247, 0.1)", // A light purple highlight
    marginHorizontal: -15, // Extend highlight to the edges of the card body
    paddingHorizontal: 15,
  },
  bestValueText: {
    color: COLORS.accent,
    fontWeight: "bold",
  },
  viewButton: {
    backgroundColor: COLORS.accent,
    padding: 15,
    margin: 15,
    marginTop: "auto", // Push button to the bottom
    borderRadius: 10,
    alignItems: "center",
  },
  viewButtonText: {
    color: COLORS.foreground,
    fontSize: 16,
    fontWeight: "600",
  },
});

export default CompareScreen;
