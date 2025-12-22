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
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  useLocalSearchParams,
  Stack,
  useNavigation,
  useRouter,
} from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import VehicleCard, { Vehicle } from "./_components/VehicleCard";
import axios from "axios";
import API_BASE_URL from "@/constants/Api";
import { useAuth } from "@/hooks/useAuth";
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
  const { token, user } = useAuth() as any;
  const router = useRouter();

  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    const fetchCarDetails = async () => {
      if (!id) return;
      setLoading(true);
      try {
        // IMPORTANT: Replace with your computer's local IP address
        const response = await fetch(`${API_BASE_URL}/api/cars/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const data = await response.json();
        if (data.car) {
          setCar(data.car);
          // Map similar cars to match Vehicle interface expected by VehicleCard
          const mappedSimilarCars = (data.similar_cars || []).map(
            (item: any) => ({
              id: item.id,
              year: item.year,
              make: item.make,
              model: item.model,
              price: item.price_display,
              image: item.image_url,
              listingType: item.listing_type,
            })
          );
          setSimilarCars(mappedSimilarCars);
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

  const handleContactSeller = async () => {
    if (!token) {
      Alert.alert("Login Required", "Please log in to contact the seller.", [
        { text: "Cancel", style: "cancel" },
        { text: "Login", onPress: () => router.push("/login") },
      ]);
      return;
    }

    if (car.owner?.id === user?.id) {
      Alert.alert("Info", "You cannot contact yourself.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/chat/history/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.conversation_id) {
        router.push(`/messages/${response.data.conversation_id}`);
      } else {
        setContactModalVisible(true);
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to check chat history.");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) return;
    if (!token) {
      Alert.alert("Error", "Please log in to send a message.");
      return;
    }
    setSendingMessage(true);
    try {
      await axios.post(
        `${API_BASE_URL}/chat/send`,
        { car_id: id, message: message },
        { headers: { Authorization: `Bearer ${token.trim()}` } }
      );
      // After sending, check history again to get the new conversation ID and navigate
      const response = await axios.get(`${API_BASE_URL}/chat/history/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setContactModalVisible(false);
      setMessage("");

      if (response.data.conversation_id) {
        router.push(`/messages/${response.data.conversation_id}`);
      } else {
        Alert.alert("Success", "Message sent!");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to send message.");
    } finally {
      setSendingMessage(false);
    }
  };

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
                      : car.listing_type === "rental"
                      ? COLORS.accent
                      : COLORS.accent,
                },
              ]}
            >
              {car.listing_type === "sale"
                ? "For Sale"
                : car.listing_type === "rental"
                ? "For Rent"
                : "Auction"}
            </Text>
          </View>

          {car.owner && (
            <Pressable
              style={styles.dealerRow}
              onPress={() => {
                if (car.owner.is_dealer) {
                  router.push(`/(details)/dealers/public/${car.owner.id}`);
                }
              }}
              disabled={!car.owner.is_dealer}
            >
              <Text style={styles.dealerText}>
                Listed by{" "}
                <Text
                  style={
                    car.owner.is_dealer
                      ? styles.dealerName
                      : { color: COLORS.foreground }
                  }
                >
                  {car.owner?.username}
                </Text>
              </Text>
              {car.owner.is_dealer && (
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={COLORS.mutedForeground}
                  style={{ marginLeft: 4 }}
                />
              )}
            </Pressable>
          )}

          {/* Conditional UI for Sale vs Auction */}
          {car.listing_type === "sale" || car.listing_type === "rental" ? (
            <View style={styles.priceBox}>
              <Text style={styles.priceLabel}>
                {car.listing_type === "rental"
                  ? "Price Per Day"
                  : "Fixed Price"}
              </Text>
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
        <Pressable style={styles.contactButton} onPress={handleContactSeller}>
          <Ionicons name="chatbubbles-outline" size={20} color="#fff" />
          <Text style={styles.contactButtonText}>Contact Seller</Text>
        </Pressable>
      </View>

      {/* Contact Seller Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={contactModalVisible}
        onRequestClose={() => setContactModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Contact Seller</Text>
            <Text style={styles.modalSubtitle}>
              Start a conversation about this {car.year} {car.make} {car.model}.
            </Text>
            <TextInput
              style={styles.messageInput}
              placeholder="Hi, is this still available?"
              placeholderTextColor={COLORS.mutedForeground}
              multiline
              numberOfLines={4}
              value={message}
              onChangeText={setMessage}
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setContactModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.sendButton]}
                onPress={sendMessage}
                disabled={sendingMessage}
              >
                {sendingMessage ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.sendButtonText}>Send</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  dealerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  dealerText: {
    color: COLORS.mutedForeground,
    fontSize: 14,
  },
  dealerName: {
    color: COLORS.accent,
    fontWeight: "bold",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.foreground,
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.mutedForeground,
    marginBottom: 15,
  },
  messageInput: {
    backgroundColor: COLORS.background,
    color: COLORS.foreground,
    borderRadius: 8,
    padding: 12,
    height: 100,
    textAlignVertical: "top",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: COLORS.border,
  },
  sendButton: {
    backgroundColor: COLORS.accent,
  },
  cancelButtonText: {
    color: COLORS.foreground,
    fontWeight: "600",
  },
  sendButtonText: {
    color: "#fff",
    fontWeight: "600",
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
