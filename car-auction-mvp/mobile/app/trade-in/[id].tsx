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
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/hooks/useAuth";
import { mediaUrl } from "@/lib/api/client";
import { DEALER_ROUTES } from "@/lib/roleRoutes";
import {
  acceptTradeInOffer,
  getTradeInRequest,
  placeTradeInOffer,
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
  viewer_role?: "buyer" | "dealer" | "admin";
  offers?: TradeInOffer[];
}

interface TradeInOffer {
  id: number;
  dealer_name: string;
  amount: number;
  notes: string;
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
  const [offeredCondition, setOfferedCondition] = useState("");
  const [offeredMileage, setOfferedMileage] = useState("");
  const [offeredSpecs, setOfferedSpecs] = useState("");
  const [offeredImageUri, setOfferedImageUri] = useState("");
  const [offeredImageBase64, setOfferedImageBase64] = useState("");
  const [submittingOffer, setSubmittingOffer] = useState(false);

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
      setOfferedCondition("");
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
          <Text style={styles.sectionTitle}>Dealer Offers</Text>
          <View style={styles.card}>
            {request.viewer_role === "dealer" ? (
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
                              .join(" • ")}
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

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "pending":
      return COLORS.warning;
    case "active":
      return COLORS.success;
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
});

export default TradeInRequestDetailScreen;
