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

// In a real app, this data would come from a shared source or API
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
];

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  mutedForeground: "#8A94A3",
  border: "#313843",
};

const parsePrice = (priceString: string): number => {
  const numericString = priceString.replace(/[^0-9]/g, "");
  return parseInt(numericString, 10) || Infinity;
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
  const { car_ids } = useLocalSearchParams<{ car_ids: string[] }>();
  const [carsToCompare, setCarsToCompare] = useState<Vehicle[]>([]);
  const [bestValues, setBestValues] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (car_ids && car_ids.length > 0) {
      const filteredCars = allVehicles.filter((car) =>
        car_ids.includes(car.id)
      );
      setCarsToCompare(filteredCars);

      if (filteredCars.length > 0) {
        // Calculate best values
        const prices = filteredCars.map((c) => parsePrice(c.price));
        const years = filteredCars.map((c) => c.year);
        const mileages = filteredCars.map((c) => c.mileage);

        const minPrice = Math.min(...prices);
        const maxYear = Math.max(...years);
        const minMileage = Math.min(...mileages);

        setBestValues({
          price: {
            ids: filteredCars
              .filter((c) => parsePrice(c.price) === minPrice)
              .map((c) => c.id),
          },
          year: {
            ids: filteredCars
              .filter((c) => c.year === maxYear)
              .map((c) => c.id),
          },
          mileage: {
            ids: filteredCars
              .filter((c) => c.mileage === minMileage)
              .map((c) => c.id),
          },
        });
      }
    }
    setLoading(false);
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
    height: 200,
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
