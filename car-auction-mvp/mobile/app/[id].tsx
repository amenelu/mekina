import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Vehicle } from "./_components/VehicleCard";

// --- Mock Data (In a real app, this would be fetched from an API) ---
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
  success: "#28a745",
};

const CarDetailScreen = () => {
  const { id } = useLocalSearchParams();
  const [car, setCar] = useState<Vehicle | null>(null);
  const [mainImage, setMainImage] = useState<string | null>(null);

  useEffect(() => {
    // Find the car from our mock data source
    const foundCar = allVehicles.find((v) => v.id === id);
    setCar(foundCar || null);
    if (foundCar) {
      setMainImage(foundCar.image); // Set the initial main image
    }
  }, [id]);

  if (!car) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={{ color: COLORS.foreground, marginTop: 10 }}>
          Loading Car Details...
        </Text>
      </View>
    );
  }

  // Mock thumbnails - in a real app, these would come from the API
  const thumbnails = [
    car.image,
    ...Array(4).fill("https://via.placeholder.com/100"),
  ];

  return (
    <>
      <Stack.Screen
        options={{ title: `${car.year} ${car.make} ${car.model}` }}
      />
      <ScrollView style={styles.container}>
        {/* Image Gallery */}
        <View style={styles.imageGallery}>
          <Image
            source={{ uri: mainImage || car.image }}
            style={styles.mainImage}
          />
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
                    car.listingType === "Sale" ? COLORS.success : COLORS.accent,
                },
              ]}
            >
              {car.listingType}
            </Text>
          </View>

          {/* Conditional UI for Sale vs Auction */}
          {car.listingType === "Sale" ? (
            <View style={styles.priceBox}>
              <Text style={styles.priceLabel}>Fixed Price</Text>
              <Text style={styles.priceValue}>{car.price}</Text>
            </View>
          ) : (
            <View style={styles.bidBox}>
              <View style={styles.bidInfo}>
                <Text style={styles.bidLabel}>Current Bid</Text>
                <Text style={styles.bidValue}>
                  {car.price.replace("Current Bid: ", "")}
                </Text>
              </View>
              <View style={styles.bidInfo}>
                <Text style={styles.bidLabel}>Time Left</Text>
                <Text style={styles.bidValue}>2d 14h 30m</Text>
              </View>
            </View>
          )}

          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>
            This is a great example of the {car.make} {car.model}.
            Well-maintained and in excellent condition. Comes with a full
            service history. A perfect choice for city driving and long trips.
          </Text>

          <Text style={styles.sectionTitle}>Specifications</Text>
          <View style={styles.specsContainer}>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Condition</Text>
              <Text style={styles.specValue}>Used</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Mileage</Text>
              <Text style={styles.specValue}>45,000 km</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Transmission</Text>
              <Text style={styles.specValue}>Automatic</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Fuel Type</Text>
              <Text style={styles.specValue}>Gasoline</Text>
            </View>
          </View>
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
});

export default CarDetailScreen;
