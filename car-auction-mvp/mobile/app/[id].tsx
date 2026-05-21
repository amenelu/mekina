import React, { useState, useEffect, useCallback, useRef } from "react";
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
  RefreshControl,
  FlatList,
  Dimensions,
  Animated,
  PanResponder,
} from "react-native";
import {
  useLocalSearchParams,
  Stack,
  useNavigation,
  useRouter,
} from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import VehicleCard, { Vehicle } from "@/components/_components/VehicleCard";
import { useAuth } from "@/hooks/useAuth";
import { getListing, toggleFavorite } from "@/lib/api/listings";
import { createRequest } from "@/lib/api/requests";
import { getChatHistory, sendChatMessage } from "@/lib/api/messages";
import {
  showNativeFlowAlert,
  showNativeFlowConfirm,
} from "@/lib/nativeFlowAlert";
import { saveRecentSubmittedRequest } from "@/lib/recentSubmittedRequests";
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === "web" && width >= 1000;
  const { token, user } = useAuth() as any;
  const [isFavorite, setIsFavorite] = useState(false);
  const router = useRouter();
  const [isImageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const imageViewerTranslateY = React.useRef(new Animated.Value(0)).current;
  const carouselRef = useRef<FlatList<string>>(null);
  const thumbnailScrollRef = useRef<ScrollView>(null);
  const mainImageWidth = isWideWeb
    ? Math.min(Math.max(width - 56, 1), 1220)
    : Math.max(width, 1);

  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const fetchCarDetails = useCallback(async (isRefresh = false) => {
    if (!id) return;
    if (!isRefresh) setLoading(true);
    try {
      const response = await getListing(String(id));
      const data = response.data;
      if (data.car) {
        setCar(data.car);
        setIsFavorite(data.car.is_favorite);
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
      }
    } catch (error: any) {
      console.error("Failed to fetch car details:", error);
      Alert.alert("Error", error.message || "Could not load car details.");
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCarDetails();
  }, [fetchCarDetails]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      return;
    }

    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscrollBehavior = body.style.overscrollBehavior;
    const previousHtmlOverflow = documentElement.style.overflow;
    const previousHtmlOverscrollBehavior =
      documentElement.style.overscrollBehavior;

    if (isImageViewerVisible) {
      body.style.overflow = "hidden";
      body.style.overscrollBehavior = "none";
      documentElement.style.overflow = "hidden";
      documentElement.style.overscrollBehavior = "none";
    }

    return () => {
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscrollBehavior;
      documentElement.style.overflow = previousHtmlOverflow;
      documentElement.style.overscrollBehavior =
        previousHtmlOverscrollBehavior;
    };
  }, [isImageViewerVisible]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCarDetails(true);
  };

  // Use a layout effect to set the title. This runs before the paint,
  // preventing the `[id]` from ever showing.
  React.useLayoutEffect(() => {
    const title = car
      ? `${car.year} ${car.make} ${car.model}`
      : id
      ? "Loading..."
      : "Not Found";
    navigation.setOptions({
      title,
      headerTitleAlign: "center",
    });
  }, [navigation, car, id]);

  const closeImageViewer = () => {
    setImageViewerVisible(false);
    imageViewerTranslateY.setValue(0);
  };

  const imageViewerPanResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) &&
          gestureState.dy > 8,
        onPanResponderMove: (_, gestureState) => {
          imageViewerTranslateY.setValue(Math.max(0, gestureState.dy));
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 140) {
            Animated.timing(imageViewerTranslateY, {
              toValue: Dimensions.get("window").height,
              duration: 180,
              useNativeDriver: true,
            }).start(() => {
              closeImageViewer();
            });
            return;
          }

          Animated.spring(imageViewerTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(imageViewerTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start();
        },
      }),
    [imageViewerTranslateY]
  );

  const galleryImages = [
    car?.primary_image_url,
    ...((car?.image_urls || []) as string[]),
    ...((car?.images || []).map((image: any) => image.image_url) as string[]),
  ].filter((uri, index, self) => Boolean(uri) && self.indexOf(uri) === index);

  const thumbnails =
    galleryImages.length > 0
      ? galleryImages
      : car?.primary_image_url
      ? [car.primary_image_url]
      : [];
  const isViewingOwnListing = car?.owner?.id === user?.id;
  const showBuyerActions = !isViewingOwnListing;

  const openImageViewer = (index: number) => {
    setSelectedImageIndex(index);
    setImageViewerVisible(true);
  };

  useEffect(() => {
    if (!thumbnails.length) {
      setSelectedImageIndex(0);
      return;
    }

    const safeIndex = Math.min(selectedImageIndex, thumbnails.length - 1);
    if (safeIndex !== selectedImageIndex) {
      setSelectedImageIndex(safeIndex);
    }
  }, [selectedImageIndex, thumbnails]);

  const scrollToImage = useCallback(
    (index: number) => {
      if (index < 0 || index >= thumbnails.length) return;
      setSelectedImageIndex(index);
      carouselRef.current?.scrollToIndex({ index, animated: true });
      thumbnailScrollRef.current?.scrollTo({
        x: Math.max(0, index * 92 - width / 2 + 40),
        animated: true,
      });
    },
    [thumbnails, width]
  );

  const handleCarouselMomentumEnd = useCallback(
    (event: any) => {
      const nextIndex = Math.round(
        event.nativeEvent.contentOffset.x / mainImageWidth
      );
      if (nextIndex !== selectedImageIndex) {
        setSelectedImageIndex(nextIndex);
      }
      thumbnailScrollRef.current?.scrollTo({
        x: Math.max(0, nextIndex * 92 - mainImageWidth / 2 + 40),
        animated: true,
      });
    },
    [mainImageWidth, selectedImageIndex]
  );

  const handleCarouselScroll = useCallback(
    (event: any) => {
      const nextIndex = Math.round(
        event.nativeEvent.contentOffset.x / mainImageWidth
      );
      if (
        nextIndex >= 0 &&
        nextIndex < thumbnails.length &&
        nextIndex !== selectedImageIndex
      ) {
        setSelectedImageIndex(nextIndex);
      }
    },
    [mainImageWidth, selectedImageIndex, thumbnails.length]
  );

  if (loading && !refreshing) {
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

  const handleContactSeller = async () => {
    if (!token) {
      showNativeFlowConfirm({
        title: "Login Required",
        message: "Please log in to contact the seller.",
        confirmText: "Login",
        onConfirm: () => router.push("/login"),
      });
      return;
    }

    if (car.owner?.id === user?.id) {
      Alert.alert("Info", "You cannot contact yourself.");
      return;
    }

    setLoading(true);
    try {
      const response = await getChatHistory(String(id));

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

  const handleRequestCar = async () => {
    if (!token) {
      showNativeFlowConfirm({
        title: "Login Required",
        message: "Please log in to request this car.",
        confirmText: "Login",
        onConfirm: () => router.push("/login"),
      });
      return;
    }

    if (car.owner?.id === user?.id) {
      Alert.alert("Info", "You cannot request your own car.");
      return;
    }

    setRequestModalVisible(true);
  };

  const submitCarRequest = async () => {
    if (requestSubmitting) return;

    setRequestSubmitting(true);
    try {
      const response = await createRequest({
        make: car.make,
        model: car.model,
        min_year: car.year,
        request_source: "specific",
        target_car_id: car.id,
        notes: `I am interested in purchasing this specific vehicle: ${car.year} ${car.make} ${car.model}.`,
      });
      setRequestModalVisible(false);
      await saveRecentSubmittedRequest(response.data.request, user?.id);

      showNativeFlowAlert(
        "Success",
        "Your request has been submitted successfully!",
        () => router.replace("/my-requests"),
        "Close"
      );
    } catch (error: any) {
      console.error(error);
      const errorMessage =
        error.response?.data?.message ||
        error.userMessage ||
        "Failed to submit request.";
      showNativeFlowAlert("Request Failed", errorMessage);
    } finally {
      setRequestSubmitting(false);
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
      await sendChatMessage({ car_id: String(id), message });
      // After sending, check history again to get the new conversation ID and navigate
      const response = await getChatHistory(String(id));

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

  const handleToggleFavorite = async () => {
    if (!token) {
      showNativeFlowConfirm({
        title: "Login Required",
        message: "Please log in to add to favorites.",
        confirmText: "Login",
        onConfirm: () => router.push("/login"),
      });
      return;
    }

    // Optimistic update
    const previousState = isFavorite;
    setIsFavorite(!isFavorite);

    try {
      await toggleFavorite(String(id));
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      setIsFavorite(previousState); // Revert on error
      Alert.alert("Error", "Failed to update favorite status.");
    }
  };

  return (
    <>
      <Stack.Screen />
      <ScrollView
        style={styles.container}
        scrollEnabled={!isImageViewerVisible}
        refreshControl={
          !isImageViewerVisible ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
          />
          ) : undefined
        }
      >
        {/* Image Gallery */}
        <View style={[styles.imageGallery, isWideWeb && styles.imageGalleryWide]}>
          <View>
            <FlatList
              ref={carouselRef}
              data={thumbnails}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) => `gallery-image-${index}-${item}`}
              initialScrollIndex={Math.max(0, selectedImageIndex)}
              extraData={selectedImageIndex}
              getItemLayout={(_, index) => ({
                length: mainImageWidth,
                offset: mainImageWidth * index,
                index,
              })}
              onScroll={handleCarouselScroll}
              scrollEventThrottle={16}
              onMomentumScrollEnd={handleCarouselMomentumEnd}
              renderItem={({ item, index }) => (
                <Pressable onPress={() => openImageViewer(index)}>
                  <Image
                    source={{ uri: item }}
                    style={[
                      styles.mainImage,
                      isWideWeb && styles.mainImageWide,
                      { width: mainImageWidth },
                    ]}
                  />
                </Pressable>
              )}
            />
            {car.is_featured && (
              <View style={styles.featuredTagContainer}>
                <Text style={styles.featuredTag}>Featured</Text>
              </View>
            )}
            {showBuyerActions && (
              <Pressable
                style={styles.favoriteButton}
                onPress={handleToggleFavorite}
              >
                <Ionicons
                  name={isFavorite ? "heart" : "heart-outline"}
                  size={28}
                  color={isFavorite ? "#e74c3c" : "#fff"}
                />
              </Pressable>
            )}
          </View>
          <ScrollView
            ref={thumbnailScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.thumbnailRow,
              isWideWeb && styles.thumbnailRowWide,
            ]}
          >
            {thumbnails.map((thumbUri, index) => (
              <Pressable
                key={index}
                style={[
                  styles.thumbnailButton,
                  index === selectedImageIndex && styles.thumbnailButtonActive,
                ]}
                onPress={() => scrollToImage(index)}
              >
                <Image
                  source={{ uri: thumbUri }}
                  style={styles.thumbnail}
                />
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Main Content */}
        <View
          style={[
            styles.contentContainer,
            isWideWeb && styles.contentContainerWide,
          ]}
        >
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
            {(car.fuel_type === "Electric" || car.fuel_type === "Hybrid") && (
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Range</Text>
                <Text style={styles.specValue}>
                  {car.electric_range_km
                    ? `${car.electric_range_km.toLocaleString()} km`
                    : "N/A"}
                </Text>
              </View>
            )}
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Body Type</Text>
              <Text style={styles.specValue}>{car.body_type || "N/A"}</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Drivetrain</Text>
              <Text style={styles.specValue}>{car.drivetrain || "N/A"}</Text>
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
                    style={{
                      width: isWideWeb ? "23.5%" : width / 2 - 30,
                    }}
                  />
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
      {/* Floating Action Button */}
      {showBuyerActions && (
        <View style={[styles.footer, isWideWeb && styles.footerWide]}>
          <Pressable style={styles.requestButton} onPress={handleRequestCar}>
            <Text style={styles.requestButtonText}>Request This Car</Text>
          </Pressable>
          <Pressable style={styles.contactButton} onPress={handleContactSeller}>
            <Ionicons name="chatbubbles-outline" size={17} color="#fff" />
            <Text style={styles.contactButtonText}>Contact Seller</Text>
          </Pressable>
        </View>
      )}

      {/* Contact Seller Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showBuyerActions && contactModalVisible}
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

      <Modal
        animationType="fade"
        transparent={true}
        visible={showBuyerActions && requestModalVisible}
        onRequestClose={() => {
          if (!requestSubmitting) setRequestModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request This Car</Text>
            <Text style={styles.modalSubtitle}>
              Submit a buyer request for this {car.year} {car.make} {car.model}.
              Dealers will be able to respond with offers.
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setRequestModalVisible(false)}
                disabled={requestSubmitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.sendButton]}
                onPress={submitCarRequest}
                disabled={requestSubmitting}
              >
                {requestSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.sendButtonText}>Submit Request</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isImageViewerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeImageViewer}
      >
        <View style={styles.imageViewerBackdrop}>
          <Animated.View
            style={styles.imageViewerContainer}
            {...imageViewerPanResponder.panHandlers}
          >
          <Pressable style={styles.closeButton} onPress={closeImageViewer}>
            <Ionicons name="close" size={36} color={COLORS.foreground} />
          </Pressable>
          <Animated.View
            style={{
              width: Dimensions.get("window").width,
              transform: [{ translateY: imageViewerTranslateY }],
              opacity: imageViewerTranslateY.interpolate({
                inputRange: [0, 250],
                outputRange: [1, 0.85],
                extrapolate: "clamp",
              }),
            }}
          >
            <FlatList
              data={thumbnails}
              style={styles.imageViewerPager}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) => `car-image-${index}`}
              initialScrollIndex={Math.max(0, selectedImageIndex)}
              getItemLayout={(data, index) => ({
                length: Dimensions.get("window").width,
                offset: Dimensions.get("window").width * index,
                index,
              })}
              onMomentumScrollEnd={(event) => {
                const nextIndex = Math.round(
                  event.nativeEvent.contentOffset.x / Dimensions.get("window").width
                );
                setSelectedImageIndex(nextIndex);
              }}
              renderItem={({ item }) => (
                <View style={styles.imageViewerPage}>
                  <Image source={{ uri: item }} style={styles.fullscreenImage} />
                </View>
              )}
            />
          </Animated.View>
          </Animated.View>
        </View>
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
    marginBottom: 8,
  },
  imageGalleryWide: {
    width: "100%",
    maxWidth: 1220,
    alignSelf: "center",
    marginTop: 28,
    borderRadius: 14,
    overflow: "hidden",
  },
  mainImage: {
    height: 250,
    resizeMode: "cover",
    backgroundColor: COLORS.card,
  },
  mainImageWide: {
    height: 560,
    borderRadius: 14,
  },
  thumbnailRow: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 4,
  },
  thumbnailRowWide: {
    justifyContent: "center",
    width: "100%",
  },
  thumbnailButton: {
    width: 88,
    height: 88,
    marginHorizontal: 5,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "transparent",
    padding: 2,
    opacity: 0.72,
  },
  thumbnailButtonActive: {
    borderColor: COLORS.accent,
    opacity: 1,
    backgroundColor: "rgba(163, 112, 247, 0.16)",
  },
  thumbnail: {
    width: 80,
    height: 80,
    resizeMode: "cover",
    borderRadius: 8,
  },
  imageViewerBackdrop: {
    flex: 1,
    backgroundColor: "transparent",
  },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    overscrollBehavior: "none",
  },
  imageViewerPager: {
    width: Dimensions.get("window").width,
  },
  imageViewerPage: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenImage: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
    resizeMode: "contain",
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 25,
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
  favoriteButton: {
    position: "absolute",
    top: 15,
    right: 15,
    zIndex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 8,
  },
  contentContainer: {
    padding: 20,
  },
  contentContainerWide: {
    width: "100%",
    maxWidth: 1220,
    alignSelf: "center",
    paddingHorizontal: 28,
    paddingTop: 28,
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
    padding: 17,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: "row",
    gap: 10,
  },
  footerWide: {
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  contactButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 12,
    paddingHorizontal: 13,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    flex: 1,
  },
  contactButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  requestButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.accent,
    paddingVertical: 12,
    paddingHorizontal: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  requestButtonText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: "bold",
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
