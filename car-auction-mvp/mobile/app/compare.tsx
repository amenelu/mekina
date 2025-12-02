import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { Vehicle } from "./_components/VehicleCard";
import { API_BASE_URL } from "../apiConfig";

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
  const isBestPrice = bestValues.price.ids.includes(car.id);
  const isBestYear = bestValues.year.ids.includes(car.id);
  const isBestMileage = bestValues.mileage.ids.includes(car.id);

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
            {car.price_display || car.price}
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
  const { car_ids } = params as { car_ids: string | string[] };
  const [carsToCompare, setCarsToCompare] = useState<Vehicle[]>([]);
  const [bestValues, setBestValues] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComparisonData = async () => {
      if (!car_ids) {
        setLoading(false);
        return;
      }
      try {
        // IMPORTANT: Replace with your computer's local IP address
        const response = await fetch(
          `${API_BASE_URL}/api/compare?ids=${car_ids}`
        );
        const data = await response.json();
        if (data.cars && data.best_values) {
          setCarsToCompare(data.cars);
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
      <Stack.Screen options={{ title: "Compare Vehicles" }} />
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {carsToCompare.map((car) => (
          <ComparisonCard key={car.id} car={car} bestValues={bestValues} />
        ))}
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    paddingVertical: 20,
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
