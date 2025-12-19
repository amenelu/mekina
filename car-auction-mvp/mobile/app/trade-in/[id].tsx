import React, { useEffect, useState } from "react";
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
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import axios from "axios";
import API_URL from "@/constants/Api";
import { useAuth } from "@/hooks/useAuth";

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
  const { token } = useAuth();
  const [request, setRequest] = useState<TradeInDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerNotes, setOfferNotes] = useState("");
  const [submittingOffer, setSubmittingOffer] = useState(false);

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const fetchDetails = async () => {
    // Ensure we are hitting the USER endpoint, NOT the ADMIN endpoint
    const url = `${API_URL}/trade-in/api/requests/${id}`;
    console.log(">>> MOUNTED: User Trade-In View. Fetching:", url);
    try {
      // Calls the USER endpoint, not the ADMIN endpoint
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
  };

  const submitOffer = async () => {
    if (!offerAmount) {
      Alert.alert("Error", "Please enter an offer amount.");
      return;
    }
    setSubmittingOffer(true);
    try {
      await axios.post(
        `${API_URL}/trade-in/api/requests/${id}/offer`,
        { amount: parseInt(offerAmount), notes: offerNotes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("Success", "Offer placed successfully!");
      setOfferAmount("");
      setOfferNotes("");
      fetchDetails(); // Refresh to show updated state if needed
    } catch (error: any) {
      const msg = error.response?.data?.message || "Failed to place offer.";
      Alert.alert("Error", msg);
    } finally {
      setSubmittingOffer(false);
    }
  };

  const handleAcceptOffer = async (offerId: number) => {
    Alert.alert(
      "Accept Offer",
      "Are you sure you want to accept this offer? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept",
          onPress: async () => {
            setLoading(true);
            try {
              await axios.post(
                `${API_URL}/trade-in/api/requests/${id}/offers/${offerId}/accept`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
              );
              Alert.alert("Success", "Offer accepted!");
              fetchDetails();
            } catch (error: any) {
              const msg =
                error.response?.data?.message || "Failed to accept offer.";
              Alert.alert("Error", msg);
              setLoading(false);
            }
          },
        },
      ]
    );
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
                uri={`${API_URL}${photo.image_url}`}
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
                  Place an offer on this vehicle:
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Offer Amount (ETB)"
                  placeholderTextColor={COLORS.mutedForeground}
                  keyboardType="numeric"
                  value={offerAmount}
                  onChangeText={setOfferAmount}
                />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Notes (Optional)"
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
                      <View style={styles.offerHeader}>
                        <Text style={styles.offerAmount}>
                          {offer.amount.toLocaleString()} ETB
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
  },
  textArea: { height: 80, textAlignVertical: "top" },
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
