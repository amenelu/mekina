import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  TextInput,
  Pressable,
  Platform,
} from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/hooks/useAuth";
import { mediaUrl } from "@/lib/api/client";
import { DEALER_ROUTES } from "@/lib/roleRoutes";
import {
  acceptTradeInOffer,
  getTradeInRequest,
  placeTradeInOffer,
  rateTradeInOffer,
} from "@/lib/api/tradeIn";
import {
  showNativeFlowAlert,
  showNativeFlowConfirm,
} from "@/lib/nativeFlowAlert";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  mutedForeground: "#8A94A3",
  border: "#313843",
  success: "#28a745",
  warning: "#ffc107",
  info: "#0dcaf0",
};

interface TradeInDetail {
  id: number;
  make: string;
  model: string;
  year: number;
  mileage: number;
  condition: string;
  vin: string;
  target_car: string;
  comments: string;
  status: string;
  created_at: string;
  photos: { id: number; image_url: string }[];
  buyer?: TradeInContact | null;
  viewer_role?: "buyer" | "dealer" | "admin";
  offers?: TradeInOffer[];
}

interface TradeInContact {
  id?: number;
  username?: string | null;
  email?: string | null;
  phone_number?: string | null;
}

interface TradeInOffer {
  id: number;
  dealer_id?: number;
  dealer_name: string;
  dealer_email?: string | null;
  dealer_phone_number?: string | null;
  amount: number;
  notes: string;
  has_rated?: boolean;
  rating?: { rating: number; review_text?: string | null } | null;
  offered_car_make?: string | null;
  offered_car_model?: string | null;
  offered_car_year?: number | null;
  offered_car_condition?: string | null;
  offered_car_mileage?: number | null;
  offered_car_specs?: string | null;
  offered_car_image_url?: string | null;
  created_at: string;
  status: string;
}

const ImageWithLoader = ({ uri }: { uri: string }) => {
  const [loading, setLoading] = useState(true);
  return (
    <View style={styles.photoContainer}>
      <Image
        source={{ uri }}
        style={styles.photo}
        onLoadEnd={() => setLoading(false)}
      />
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={COLORS.accent} />
        </View>
      )}
    </View>
  );
};

const TradeInRequestDetailScreen = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { token } = useAuth();
  const [request, setRequest] = useState<TradeInDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerNotes, setOfferNotes] = useState("");
  const [offeredMake, setOfferedMake] = useState("");
  const [offeredModel, setOfferedModel] = useState("");
  const [offeredYear, setOfferedYear] = useState("");
  const [offeredCondition, setOfferedCondition] = useState("New");
  const [offeredMileage, setOfferedMileage] = useState("");
  const [offeredSpecs, setOfferedSpecs] = useState("");
  const [offeredImageUri, setOfferedImageUri] = useState("");
  const [offeredImageBase64, setOfferedImageBase64] = useState("");
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const acceptedOffer = request?.offers?.find(
    (offer) => offer.status === "accepted"
  );

  const fetchDetails = useCallback(async () => {
    // Ensure we are hitting the USER endpoint, NOT the ADMIN endpoint
    try {
      // Calls the USER endpoint, not the ADMIN endpoint
      const response = await getTradeInRequest(String(id));
      setRequest(response.data.request);
    } catch (error: any) {
      console.error("Error fetching trade-in details:", error);
      const msg =
        error.response?.data?.message || "Failed to load trade-in details.";
      console.log("Server Error Message:", msg);
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const pickOfferedCarImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setOfferedImageUri(asset.uri);
      setOfferedImageBase64(
        asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : ""
      );
    }
  };

  const handleSubmitReview = async () => {
    if (!acceptedOffer) return;
    if (rating === 0) {
      Alert.alert("Rating Required", "Please select a star rating.");
      return;
    }

    setSubmittingReview(true);
    try {
      await rateTradeInOffer(String(id), acceptedOffer.id, {
        rating,
        comment: reviewText,
      });
      Alert.alert("Success", "Thank you for your review!");
      setRating(0);
      setReviewText("");
      await fetchDetails();
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to submit review."
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  const submitOffer = async () => {
    if (!offerAmount) {
      Alert.alert("Error", "Please enter the cash add-on amount.");
      return;
    }
    if (!offeredMake.trim() || !offeredModel.trim() || !offeredYear.trim()) {
      Alert.alert("Error", "Please enter the trade car make, model, and year.");
      return;
    }
    setSubmittingOffer(true);
    try {
      await placeTradeInOffer(String(id), {
        amount: parseInt(offerAmount),
        notes: offerNotes,
        offered_car_make: offeredMake.trim(),
        offered_car_model: offeredModel.trim(),
        offered_car_year: parseInt(offeredYear),
        offered_car_condition: offeredCondition.trim(),
        offered_car_mileage: offeredMileage ? parseInt(offeredMileage) : undefined,
        offered_car_specs: offeredSpecs.trim(),
        offered_car_image: offeredImageBase64,
      });
      showNativeFlowAlert(
        "Success",
        "Offer placed successfully.",
        () => router.replace(DEALER_ROUTES.dashboard as any)
      );
      setOfferAmount("");
      setOfferNotes("");
      setOfferedMake("");
      setOfferedModel("");
      setOfferedYear("");
      setOfferedCondition("New");
      setOfferedMileage("");
      setOfferedSpecs("");
      setOfferedImageUri("");
      setOfferedImageBase64("");
      fetchDetails(); // Refresh to show updated state if needed
    } catch (error: any) {
      const msg = error.response?.data?.message || "Failed to place offer.";
      Alert.alert("Error", msg);
    } finally {
      setSubmittingOffer(false);
    }
  };

  const handleAcceptOffer = async (offerId: number) => {
    showNativeFlowConfirm({
      title: "Accept Offer",
      message: "Are you sure you want to accept this offer? This action cannot be undone.",
      confirmText: "Accept",
      onConfirm: async () => {
        setLoading(true);
        try {
          await acceptTradeInOffer(String(id), offerId);
          showNativeFlowAlert("Success", "Offer accepted.", fetchDetails);
        } catch (error: any) {
          const msg =
            error.response?.data?.message || "Failed to accept offer.";
          Alert.alert("Error", msg);
          setLoading(false);
        }
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Request not found.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: `Trade-in #${request.id}` }} />
      <ScrollView style={styles.container}>
        {/* Status Banner */}
        <View style={styles.statusBanner}>
          <Text style={styles.statusLabel}>Status:</Text>
          <Text
            style={[
              styles.statusValue,
              { color: getStatusColor(request.status) },
            ]}
          >
            {request.status.toUpperCase()}
          </Text>
        </View>

        {/* Vehicle Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Vehicle</Text>
          <View style={styles.card}>
            <DetailRow
              label="Vehicle"
              value={`${request.year} ${request.make} ${request.model}`}
            />
            <DetailRow
              label="Mileage"
              value={`${request.mileage.toLocaleString()} km`}
            />
            <DetailRow label="Condition" value={request.condition} />
            <DetailRow label="VIN" value={request.vin || "N/A"} />
            <DetailRow
              label="Target Car"
              value={request.target_car || "None specified"}
            />
          </View>
        </View>

        {/* Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.photoScroll}
          >
            {request.photos.map((photo) => (
              <ImageWithLoader
                key={photo.id}
                uri={mediaUrl(photo.image_url) || ""}
              />
            ))}
          </ScrollView>
        </View>

        {/* Dealer Offers Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {request.status === "completed" ? "Trade-in Deal Summary" : "Dealer Offers"}
          </Text>
          <View style={styles.card}>
            {request.status === "completed" && acceptedOffer ? (
              <>
                <TradeInDealSummary request={request} offer={acceptedOffer} />
                {request.viewer_role === "buyer" && (
                  <TradeInRatingSection
                    dealerName={acceptedOffer.dealer_name}
                    hasRated={Boolean(acceptedOffer.has_rated)}
                    existingRating={acceptedOffer.rating?.rating}
                    rating={rating}
                    reviewText={reviewText}
                    submitting={submittingReview}
                    onRatingChange={setRating}
                    onReviewTextChange={setReviewText}
                    onSubmit={handleSubmitReview}
                  />
                )}
              </>
            ) : request.viewer_role === "dealer" ? (
              <View>
                <Text style={styles.offerPrompt}>
                  Offer a vehicle to trade for this car:
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Cash add-on amount (ETB)"
                  placeholderTextColor={COLORS.mutedForeground}
                  keyboardType="numeric"
                  value={offerAmount}
                  onChangeText={setOfferAmount}
                />
                <View style={styles.formGrid}>
                  <TextInput
                    style={[styles.input, styles.gridInput]}
                    placeholder="Trade car make"
                    placeholderTextColor={COLORS.mutedForeground}
                    value={offeredMake}
                    onChangeText={setOfferedMake}
                  />
                  <TextInput
                    style={[styles.input, styles.gridInput]}
                    placeholder="Trade car model"
                    placeholderTextColor={COLORS.mutedForeground}
                    value={offeredModel}
                    onChangeText={setOfferedModel}
                  />
                </View>
                <View style={styles.formGrid}>
                  <TextInput
                    style={[styles.input, styles.gridInput]}
                    placeholder="Year"
                    placeholderTextColor={COLORS.mutedForeground}
                    keyboardType="numeric"
                    value={offeredYear}
                    onChangeText={setOfferedYear}
                  />
                  <TextInput
                    style={[styles.input, styles.gridInput]}
                    placeholder="Mileage"
                    placeholderTextColor={COLORS.mutedForeground}
                    keyboardType="numeric"
                    value={offeredMileage}
                    onChangeText={setOfferedMileage}
                  />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Condition (e.g., New, Used, Excellent)"
                  placeholderTextColor={COLORS.mutedForeground}
                  value={offeredCondition}
                  onChangeText={setOfferedCondition}
                />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Trade car specs (trim, fuel type, drivetrain, features...)"
                  placeholderTextColor={COLORS.mutedForeground}
                  multiline
                  value={offeredSpecs}
                  onChangeText={setOfferedSpecs}
                />
                <Pressable
                  style={styles.imagePickerButton}
                  onPress={pickOfferedCarImage}
                >
                  <Text style={styles.imagePickerText}>
                    {offeredImageUri ? "Change Trade Car Photo" : "Add Trade Car Photo"}
                  </Text>
                </Pressable>
                {offeredImageUri ? (
                  <Image source={{ uri: offeredImageUri }} style={styles.offerPreviewImage} />
                ) : null}
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Notes for the buyer (optional)"
                  placeholderTextColor={COLORS.mutedForeground}
                  multiline
                  value={offerNotes}
                  onChangeText={setOfferNotes}
                />
                <Pressable
                  style={styles.submitButton}
                  onPress={submitOffer}
                  disabled={submittingOffer}
                >
                  {submittingOffer ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit Offer</Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <>
                {request.offers && request.offers.length > 0 ? (
                  request.offers.map((offer) => (
                    <View key={offer.id} style={styles.offerItem}>
                      {offer.offered_car_image_url ? (
                        <Image
                          source={{ uri: mediaUrl(offer.offered_car_image_url) || "" }}
                          style={styles.offerVehicleImage}
                        />
                      ) : null}
                      <View style={styles.offerHeader}>
                        <Text style={styles.offerAmount}>
                          + {offer.amount.toLocaleString()} ETB cash
                        </Text>
                        {request.status === "active" &&
                          request.viewer_role === "buyer" && (
                            <Pressable
                              style={styles.acceptButton}
                              onPress={() => handleAcceptOffer(offer.id)}
                            >
                              <Text style={styles.acceptButtonText}>
                                Accept
                              </Text>
                            </Pressable>
                          )}
                        {offer.status === "accepted" && (
                          <View style={styles.acceptedBadge}>
                            <Text style={styles.acceptedBadgeText}>
                              Accepted
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.offerDealer}>
                        by {offer.dealer_name}
                      </Text>
                      {offer.offered_car_make || offer.offered_car_model ? (
                        <View style={styles.offerVehicleCard}>
                          <Text style={styles.offerVehicleTitle}>
                            {offer.offered_car_year || ""}{" "}
                            {offer.offered_car_make || ""}{" "}
                            {offer.offered_car_model || ""}
                          </Text>
                          <Text style={styles.offerVehicleMeta}>
                            {[
                              offer.offered_car_condition,
                              offer.offered_car_mileage
                                ? `${offer.offered_car_mileage.toLocaleString()} km`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(" - ")}
                          </Text>
                          {offer.offered_car_specs ? (
                            <Text style={styles.offerNotes}>
                              {offer.offered_car_specs}
                            </Text>
                          ) : null}
                        </View>
                      ) : null}
                      {offer.notes ? (
                        <Text style={styles.offerNotes}>{offer.notes}</Text>
                      ) : null}
                    </View>
                  ))
                ) : (
                  <Text style={styles.noOffersText}>
                    {request.status === "pending"
                      ? "Your request is pending review. Offers will appear here once approved."
                      : "No offers received yet. We will notify you when a dealer makes an offer."}
                  </Text>
                )}
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const TradeInDealSummary = ({
  request,
  offer,
}: {
  request: TradeInDetail;
  offer: TradeInOffer;
}) => (
  <View style={styles.dealSummary}>
    <View style={styles.dealHeader}>
      <View>
        <Text style={styles.dealEyebrow}>Accepted trade-in offer</Text>
        <Text style={styles.dealTitle}>
          {offer.offered_car_year || ""} {offer.offered_car_make || ""}{" "}
          {offer.offered_car_model || ""}
        </Text>
      </View>
      <View style={styles.acceptedBadge}>
        <Text style={styles.acceptedBadgeText}>Accepted</Text>
      </View>
    </View>

    {offer.offered_car_image_url ? (
      <Image
        source={{ uri: mediaUrl(offer.offered_car_image_url) || "" }}
        style={styles.dealImage}
      />
    ) : null}

    <View style={styles.dealGrid}>
      <View style={styles.dealPanel}>
        <Text style={styles.dealPanelLabel}>Buyer trade-in</Text>
        <Text style={styles.dealPanelValue}>
          {request.year} {request.make} {request.model}
        </Text>
        <Text style={styles.dealPanelMeta}>
          {request.mileage.toLocaleString()} km - {request.condition}
        </Text>
      </View>
      <View style={styles.dealPanel}>
        <Text style={styles.dealPanelLabel}>Dealer vehicle</Text>
        <Text style={styles.dealPanelValue}>
          {offer.offered_car_year || "N/A"} {offer.offered_car_make || ""}{" "}
          {offer.offered_car_model || ""}
        </Text>
        <Text style={styles.dealPanelMeta}>
          {[offer.offered_car_condition, offer.offered_car_mileage
            ? `${offer.offered_car_mileage.toLocaleString()} km`
            : null]
            .filter(Boolean)
            .join(" - ") || "Details pending"}
        </Text>
      </View>
    </View>

    <View style={styles.cashSummary}>
      <Text style={styles.dealPanelLabel}>Cash add-on</Text>
      <Text style={styles.cashSummaryValue}>
        + {offer.amount.toLocaleString()} ETB
      </Text>
    </View>

    {offer.offered_car_specs ? (
      <Text style={styles.dealNotes}>{offer.offered_car_specs}</Text>
    ) : null}
    {offer.notes ? <Text style={styles.dealNotes}>{offer.notes}</Text> : null}

    <View style={styles.contactGrid}>
      <ContactCard
        title="Buyer"
        name={request.buyer?.username || "Buyer"}
        email={request.buyer?.email}
        phone={request.buyer?.phone_number}
      />
      <ContactCard
        title="Dealer"
        name={offer.dealer_name || "Dealer"}
        email={offer.dealer_email}
        phone={offer.dealer_phone_number}
      />
    </View>
  </View>
);

const ContactCard = ({
  title,
  name,
  email,
  phone,
}: {
  title: string;
  name: string;
  email?: string | null;
  phone?: string | null;
}) => (
  <View style={styles.contactCard}>
    <Text style={styles.dealPanelLabel}>{title} details</Text>
    <Text style={styles.contactName}>{name}</Text>
    <Text style={styles.contactLine}>{email || "Email not provided"}</Text>
    <Text style={styles.contactLine}>{phone || "Phone not provided"}</Text>
  </View>
);

const TradeInRatingSection = ({
  dealerName,
  hasRated,
  existingRating,
  rating,
  reviewText,
  submitting,
  onRatingChange,
  onReviewTextChange,
  onSubmit,
}: {
  dealerName: string;
  hasRated: boolean;
  existingRating?: number;
  rating: number;
  reviewText: string;
  submitting: boolean;
  onRatingChange: (rating: number) => void;
  onReviewTextChange: (text: string) => void;
  onSubmit: () => void;
}) => (
  <View style={styles.ratingContainer}>
    <Text style={styles.ratingTitle}>Rate Your Dealer</Text>
    {hasRated ? (
      <View>
        <Text style={styles.ratingHelp}>
          You rated {dealerName} {existingRating || ""}/5. Thank you for your
          feedback.
        </Text>
      </View>
    ) : (
      <>
        <Text style={styles.ratingHelp}>
          How was your trade-in experience with {dealerName}?
        </Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable key={star} onPress={() => onRatingChange(star)}>
              <Ionicons
                name={star <= rating ? "star" : "star-outline"}
                size={32}
                color="#FFD700"
                style={styles.starIcon}
              />
            </Pressable>
          ))}
        </View>
        <TextInput
          style={[styles.input, styles.reviewInput]}
          placeholder="Write a review (optional)..."
          placeholderTextColor={COLORS.mutedForeground}
          multiline
          value={reviewText}
          onChangeText={onReviewTextChange}
        />
        <Pressable
          style={styles.submitButton}
          onPress={onSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Review</Text>
          )}
        </Pressable>
      </>
    )}
  </View>
);

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "pending":
      return COLORS.warning;
    case "active":
      return COLORS.success;
    case "completed":
      return COLORS.accent;
    default:
      return COLORS.mutedForeground;
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  errorText: { color: COLORS.mutedForeground, fontSize: 16 },
  statusBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statusLabel: { color: COLORS.mutedForeground, fontSize: 16 },
  statusValue: { fontSize: 16, fontWeight: "bold" },
  section: { padding: 20, paddingBottom: 0 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.foreground,
    marginBottom: 10,
  },
  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 15 },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  detailLabel: { color: COLORS.mutedForeground, fontSize: 14, flex: 1 },
  detailValue: {
    color: COLORS.foreground,
    fontSize: 14,
    fontWeight: "600",
    flex: 2,
    textAlign: "right",
  },
  photoScroll: { flexDirection: "row" },
  photoContainer: {
    width: 120,
    height: 90,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: COLORS.card,
    overflow: "hidden",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.card,
  },
  noOffersText: {
    color: COLORS.mutedForeground,
    textAlign: "center",
    padding: 20,
    fontStyle: "italic",
  },
  input: {
    backgroundColor: COLORS.background,
    color: COLORS.foreground,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
    fontSize: Platform.OS === "web" ? 16 : undefined,
  },
  textArea: { height: 80, textAlignVertical: "top" },
  formGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridInput: {
    flex: 1,
    minWidth: 150,
  },
  imagePickerButton: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: COLORS.accent,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  imagePickerText: {
    color: COLORS.accent,
    fontWeight: "700",
  },
  offerPreviewImage: {
    width: "100%",
    height: 180,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: COLORS.background,
  },
  submitButton: {
    backgroundColor: COLORS.accent,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  submitButtonText: { color: "#fff", fontWeight: "bold" },
  offerPrompt: {
    color: COLORS.foreground,
    marginBottom: 10,
    fontWeight: "600",
  },
  offerItem: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 10,
  },
  offerVehicleImage: {
    width: "100%",
    height: 180,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: COLORS.background,
  },
  offerVehicleCard: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    marginTop: 8,
    marginBottom: 8,
  },
  offerVehicleTitle: {
    color: COLORS.foreground,
    fontWeight: "700",
    fontSize: 16,
  },
  offerVehicleMeta: {
    color: COLORS.mutedForeground,
    fontSize: 13,
    marginTop: 3,
  },
  offerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  offerAmount: {
    color: COLORS.success,
    fontSize: 18,
    fontWeight: "bold",
  },
  offerDealer: {
    color: COLORS.mutedForeground,
    fontSize: 14,
    marginBottom: 4,
  },
  offerNotes: {
    color: COLORS.foreground,
    fontSize: 14,
  },
  acceptButton: {
    backgroundColor: COLORS.success,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  acceptButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  acceptedBadge: {
    backgroundColor: COLORS.success,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  acceptedBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  dealSummary: {
    gap: 12,
  },
  dealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  dealEyebrow: {
    color: COLORS.mutedForeground,
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: "700",
    marginBottom: 4,
  },
  dealTitle: {
    color: COLORS.foreground,
    fontSize: 18,
    fontWeight: "800",
  },
  dealImage: {
    width: "100%",
    height: 210,
    borderRadius: 10,
    backgroundColor: COLORS.background,
  },
  dealGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  dealPanel: {
    flex: 1,
    minWidth: 220,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
  },
  dealPanelLabel: {
    color: COLORS.mutedForeground,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 5,
  },
  dealPanelValue: {
    color: COLORS.foreground,
    fontSize: 16,
    fontWeight: "800",
  },
  dealPanelMeta: {
    color: COLORS.mutedForeground,
    fontSize: 13,
    marginTop: 4,
  },
  cashSummary: {
    backgroundColor: "rgba(40, 167, 69, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(40, 167, 69, 0.35)",
    borderRadius: 10,
    padding: 12,
  },
  cashSummaryValue: {
    color: COLORS.success,
    fontSize: 20,
    fontWeight: "900",
  },
  dealNotes: {
    color: COLORS.foreground,
    lineHeight: 21,
  },
  contactGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  contactCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
  },
  contactName: {
    color: COLORS.foreground,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },
  contactLine: {
    color: COLORS.mutedForeground,
    fontSize: 14,
    marginTop: 3,
  },
  ratingContainer: {
    marginTop: 16,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
  },
  ratingTitle: {
    color: COLORS.foreground,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },
  ratingHelp: {
    color: COLORS.mutedForeground,
    lineHeight: 20,
  },
  starsRow: {
    flexDirection: "row",
    marginVertical: 12,
  },
  starIcon: {
    marginRight: 8,
  },
  reviewInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },
});

export default TradeInRequestDetailScreen;
