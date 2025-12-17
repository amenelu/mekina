import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Pressable,
  Modal,
  Dimensions,
  Image,
  FlatList,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import axios from "axios";
import API_BASE_URL from "@/constants/Api";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  mutedForeground: "#8A94A3",
  muted: "#313843",
  border: "#313843",
  success: "#28a745",
  destructive: "#dc3545",
};

interface CarRequest {
  id: number;
  make: string | null;
  model: string | null;
  min_year: number | null;
  status: string;
  notes: string;
  created_at: string;
  bid_count: number;
}

interface QuestionAnswer {
  id: number;
  question_text: string;
  answer_text: string | null;
  timestamp: string;
  answered_at: string | null;
}

interface DealerBid {
  id: number;
  price: number;
  price_with_loan: number | null;
  notes: string;
  timestamp: string;
  message: string;
  make: string;
  model: string;
  car_year: number;
  mileage: number;
  condition: string;
  availability: string;
  extras: string | null;
  valid_until: string;
  image_urls: string[];
  is_newest: boolean;
  questions: QuestionAnswer[];
  status: string;
  dealer: {
    username: string;
    avg_rating: number;
  };
}

const RequestDetailScreen = () => {
  const { id } = useLocalSearchParams();
  const { token, logout } = useAuth();
  const router = useRouter();

  const [request, setRequest] = useState<CarRequest | null>(null);
  const [bids, setBids] = useState<DealerBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [expandedQAs, setExpandedQAs] = useState<{ [key: number]: boolean }>(
    {}
  );
  const [refreshing, setRefreshing] = useState(false);

  const fetchRequestDetails = useCallback(async () => {
    if (!token || !id) {
      setLoading(false);
      return;
    }
    try {
      const response = await axios.get(
        `${API_BASE_URL}/requests/api/requests/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setRequest(response.data.request);
      setBids(response.data.bids);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        Alert.alert("Session Expired", "Please log in again.", [
          { text: "OK", onPress: () => logout() },
        ]);
        router.replace("/login");
      } else {
        console.error("Failed to fetch request details:", err);
        Alert.alert(
          "Error",
          "Could not load request details. Please try again."
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, token]);

  useEffect(() => {
    fetchRequestDetails();
  }, [fetchRequestDetails]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequestDetails();
  };

  const openImageViewer = (images: string[], index: number) => {
    setSelectedImages(images);
    setSelectedImageIndex(index);
    setImageViewerVisible(true);
  };

  const closeImageViewer = () => {
    setImageViewerVisible(false);
    setSelectedImages([]);
  };

  const toggleQA = (bidId: number) => {
    setExpandedQAs((prev) => ({
      ...prev,
      [bidId]: !prev[bidId],
    }));
  };

  const handleAcceptOffer = async (bid: DealerBid) => {
    // Confirmation Dialog
    Alert.alert(
      "Accept Offer?",
      `Are you sure you want to accept the offer of ${bid.price.toLocaleString()} ETB from ${
        bid.dealer.username
      }? This will close the request.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept",
          onPress: async () => {
            try {
              setLoading(true);
              const response = await axios.post(
                `${API_BASE_URL}/requests/api/offer/${bid.id}/accept`,
                { payment_method: "cash" }, // Assuming cash for now
                { headers: { Authorization: `Bearer ${token}` } }
              );

              if (response.data.status === "success") {
                Alert.alert("Offer Accepted!", "The dealer has been notified.");
                // Navigate to the new deal summary page
                router.replace(`/deal/${response.data.deal.id}`);
              } else {
                throw new Error(
                  response.data.message || "Failed to accept offer."
                );
              }
            } catch (error: any) {
              console.error("Failed to accept offer:", error);
              Alert.alert(
                "Error",
                error.response?.data?.message ||
                  "An error occurred. Please try again."
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleAskQuestion = (bidId: number) => {
    Alert.prompt(
      "Ask a Question",
      "Enter your question for the dealer below:",
      async (questionText) => {
        if (!questionText) return;

        try {
          setLoading(true);
          const response = await axios.post(
            `${API_BASE_URL}/requests/api/bid/${bidId}/ask`,
            { question_text: questionText },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (response.data.status === "success") {
            Alert.alert("Question Sent", response.data.message);
          } else {
            throw new Error(
              response.data.message || "Failed to send question."
            );
          }
        } catch (error: any) {
          console.error("Failed to send question:", error);
          Alert.alert(
            "Error",
            error.response?.data?.message ||
              "An error occurred. Please try again."
          );
        } finally {
          setLoading(false);
        }
      }
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
      <Stack.Screen options={{ title: `Request #${request.id}` }} />
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Request Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Request</Text>
          <View style={styles.card}>
            {request.make && (
              <Text style={styles.requestTitle}>
                {request.make} {request.model || ""}
              </Text>
            )}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status:</Text>
              <Text
                style={[
                  styles.status,
                  {
                    color:
                      request.status === "active"
                        ? COLORS.success
                        : COLORS.mutedForeground,
                  },
                ]}
              >
                {request.status.charAt(0).toUpperCase() +
                  request.status.slice(1)}
              </Text>
            </View>
            {request.min_year && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Min. Year:</Text>
                <Text style={styles.detailValue}>{request.min_year}</Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Notes:</Text>
            </View>
            <Text style={styles.notesText}>{request.notes}</Text>
          </View>
        </View>

        {/* Dealer Offers Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dealer Offers ({bids.length})</Text>
          {bids.length > 0 ? (
            bids.map((bid, index) => (
              <View
                key={bid.id}
                style={[styles.card, index === 0 && styles.lowestOfferCard]}
              >
                {index === 0 && (
                  <View style={styles.lowestOfferTag}>
                    <Text style={styles.lowestOfferText}>Lowest Offer</Text>
                  </View>
                )}
                {bid.is_newest && index !== 0 && (
                  <View style={[styles.lowestOfferTag, styles.newestOfferTag]}>
                    <Text style={styles.lowestOfferText}>Newest Offer</Text>
                  </View>
                )}
                <View style={styles.bidHeader}>
                  <View>
                    <Text style={styles.dealerName}>{bid.dealer.username}</Text>
                    <View style={styles.dealerRating}>
                      <Ionicons name="star" size={16} color="#FFD700" />
                      <Text style={styles.dealerRatingText}>
                        {bid.dealer.avg_rating?.toFixed(1) || "New"}{" "}
                        <Text style={{ color: COLORS.mutedForeground }}>
                          Rating
                        </Text>
                      </Text>
                    </View>
                  </View>
                </View>

                {bid.image_urls && bid.image_urls.length > 0 && (
                  <FlatList
                    horizontal
                    data={bid.image_urls}
                    renderItem={({ item, index }) => (
                      <Pressable
                        onPress={() => openImageViewer(bid.image_urls, index)}
                      >
                        <Image
                          source={{ uri: item }}
                          style={styles.offerImage}
                        />
                      </Pressable>
                    )}
                    keyExtractor={(item, index) => `${bid.id}-img-${index}`}
                    showsHorizontalScrollIndicator={false}
                    style={styles.offerImageContainer}
                  />
                )}

                <View style={styles.timestampContainer}>
                  <Text style={styles.timestampText}>
                    {formatDistanceToNow(new Date(bid.timestamp), {
                      addSuffix: true,
                    })}
                  </Text>
                </View>

                <View style={styles.offerDetailsContainer}>
                  <Text style={styles.offerCarTitle}>
                    {bid.car_year} {bid.make} {bid.model}
                  </Text>
                  <View style={styles.offerDetailRow}>
                    <OfferDetailChip
                      icon="speedometer-outline"
                      text={`${bid.mileage.toLocaleString()} km`}
                    />
                    <OfferDetailChip
                      icon="build-outline"
                      text={bid.condition}
                    />
                    <OfferDetailChip
                      icon="calendar-outline"
                      text={bid.availability}
                    />
                  </View>
                </View>

                <View style={styles.priceContainer}>
                  <View style={styles.priceItem}>
                    <Text style={styles.priceLabel}>Cash Offer</Text>
                    <Text style={styles.bidPrice}>
                      {bid.price.toLocaleString()} ETB
                    </Text>
                  </View>
                  {bid.price_with_loan && (
                    <View style={styles.priceItem}>
                      <Text style={styles.priceLabel}>With Loan</Text>
                      <Text style={styles.bidPrice}>
                        {bid.price_with_loan.toLocaleString()} ETB
                      </Text>
                    </View>
                  )}
                </View>

                {(bid.message || bid.extras) && (
                  <View style={styles.notesSection}>
                    {bid.message && (
                      <Text style={styles.notesText}>{bid.message}</Text>
                    )}
                    {bid.extras && (
                      <View style={{ marginTop: bid.message ? 10 : 0 }}>
                        <Text style={styles.extrasLabel}>Extras:</Text>
                        <Text style={styles.notesText}>{bid.extras}</Text>
                      </View>
                    )}
                  </View>
                )}

                <Text style={styles.validUntilText}>
                  Offer valid until:{" "}
                  {new Date(bid.valid_until).toLocaleDateString()}
                </Text>

                {bid.questions && bid.questions.length > 0 && (
                  <View style={styles.qnaSection}>
                    <Pressable
                      style={styles.qnaHeader}
                      onPress={() => toggleQA(bid.id)}
                    >
                      <Text style={styles.qnaHeaderText}>
                        Questions & Answers ({bid.questions.length})
                      </Text>
                      <Ionicons
                        name={
                          expandedQAs[bid.id] ? "chevron-up" : "chevron-down"
                        }
                        size={20}
                        color={COLORS.mutedForeground}
                      />
                    </Pressable>
                    {expandedQAs[bid.id] && (
                      <View style={styles.qnaList}>
                        {bid.questions.map((qna) => (
                          <View key={qna.id} style={styles.qnaItem}>
                            <View style={styles.qnaBubble}>
                              <Text style={styles.qnaLabel}>Q:</Text>
                              <Text style={styles.qnaText}>
                                {qna.question_text}
                              </Text>
                            </View>
                            {qna.answer_text && (
                              <View
                                style={[
                                  styles.qnaBubble,
                                  styles.qnaAnswerBubble,
                                ]}
                              >
                                <Text style={styles.qnaLabel}>A:</Text>
                                <Text style={styles.qnaText}>
                                  {qna.answer_text}
                                </Text>
                              </View>
                            )}
                            {!qna.answer_text && (
                              <View
                                style={[
                                  styles.qnaBubble,
                                  styles.qnaPendingBubble,
                                ]}
                              >
                                <Text style={styles.qnaPendingText}>
                                  Awaiting dealer response...
                                </Text>
                              </View>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                <View
                  style={[
                    styles.bidFooter,
                    request.status !== "active" && { opacity: 0.5 },
                  ]}
                >
                  <Pressable
                    style={styles.acceptButton}
                    onPress={() => handleAcceptOffer(bid)}
                    disabled={request.status !== "active"}
                  >
                    <Text style={styles.buttonText}>Accept Offer</Text>
                  </Pressable>
                  <Pressable
                    style={styles.chatButton}
                    onPress={() => handleAskQuestion(bid.id)}
                    disabled={request.status !== "active"}
                  >
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={18}
                      color={COLORS.accent}
                    />
                    <Text
                      style={[
                        styles.buttonText,
                        { color: COLORS.accent, marginLeft: 8 },
                      ]}
                    >
                      Ask Question
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.card}>
              <Text style={styles.noBidsText}>
                No offers have been placed on this request yet. Check back soon!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={isImageViewerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeImageViewer}
      >
        <View style={styles.imageViewerContainer}>
          <Pressable style={styles.closeButton} onPress={closeImageViewer}>
            <Ionicons name="close" size={36} color={COLORS.foreground} />
          </Pressable>
          <FlatList
            data={selectedImages}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => `fullscreen-${index}`}
            initialScrollIndex={selectedImageIndex}
            getItemLayout={(data, index) => ({
              length: Dimensions.get("window").width,
              offset: Dimensions.get("window").width * index,
              index,
            })}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={styles.fullscreenImage} />
            )}
          />
        </View>
      </Modal>
    </>
  );
};

const OfferDetailChip = ({ icon, text }: { icon: any; text: string }) => (
  <View style={styles.chip}>
    <Ionicons name={icon} size={14} color={COLORS.mutedForeground} />
    <Text style={styles.chipText}>{text}</Text>
  </View>
);

/**
 * A simple utility to format time distance.
 * In a real app, you'd use a library like `date-fns`.
 */
const formatDistanceToNow = (
  date: Date,
  options: { addSuffix?: boolean } = {}
) => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1)
    return Math.floor(interval) + " years" + (options.addSuffix ? " ago" : "");
  interval = seconds / 2592000;
  if (interval > 1)
    return Math.floor(interval) + " months" + (options.addSuffix ? " ago" : "");
  interval = seconds / 86400;
  if (interval > 1)
    return Math.floor(interval) + " days" + (options.addSuffix ? " ago" : "");
  interval = seconds / 3600;
  if (interval > 1)
    return Math.floor(interval) + " hours" + (options.addSuffix ? " ago" : "");
  interval = seconds / 60;
  if (interval > 1)
    return (
      Math.floor(interval) + " minutes" + (options.addSuffix ? " ago" : "")
    );
  return Math.floor(seconds) + " seconds" + (options.addSuffix ? " ago" : "");
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  errorText: { color: COLORS.destructive, fontSize: 16 },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.foreground,
    marginBottom: 15,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  requestTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.foreground,
    marginBottom: 10,
  },
  detailRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  detailLabel: {
    fontSize: 16,
    color: COLORS.mutedForeground,
    marginRight: 8,
  },
  detailValue: { fontSize: 16, color: COLORS.foreground, fontWeight: "500" },
  status: { fontSize: 16, fontWeight: "bold" },
  notesText: {
    fontSize: 15,
    color: COLORS.mutedForeground,
    lineHeight: 22,
    marginTop: 5,
  },
  noBidsText: {
    fontSize: 16,
    color: COLORS.mutedForeground,
    textAlign: "center",
    paddingVertical: 20,
  },
  bidHeader: {
    marginBottom: 10,
  },
  dealerRating: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  dealerRatingText: {
    marginLeft: 5,
    color: COLORS.foreground,
    fontSize: 14,
  },
  offerImageContainer: {
    marginVertical: 10,
  },
  offerImage: {
    width: 120,
    height: 80,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: COLORS.muted,
  },
  timestampContainer: {
    alignItems: "flex-end",
    marginTop: -10,
    marginBottom: 10,
  },
  timestampText: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    fontStyle: "italic",
  },
  offerDetailsContainer: {
    marginVertical: 10,
  },
  offerCarTitle: {
    color: COLORS.foreground,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  offerDetailRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.muted,
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  chipText: {
    color: COLORS.mutedForeground,
    fontSize: 12,
    marginLeft: 5,
  },
  notesSection: {
    marginVertical: 10,
  },
  extrasLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: 4,
  },
  validUntilText: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    textAlign: "right",
    marginTop: 10,
  },
  qnaSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 15,
    paddingTop: 15,
  },
  qnaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  qnaHeaderText: {
    color: COLORS.foreground,
    fontSize: 16,
    fontWeight: "600",
  },
  qnaList: {
    marginTop: 10,
    gap: 10,
  },
  qnaItem: {},
  qnaBubble: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 10,
    flexDirection: "row",
  },
  qnaAnswerBubble: {
    backgroundColor: "#2E2245", // A slightly different shade for answers
    marginTop: 5,
  },
  qnaPendingBubble: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.muted,
    marginTop: 5,
  },
  qnaPendingText: {
    color: COLORS.mutedForeground,
    fontStyle: "italic",
    fontSize: 14,
  },
  qnaLabel: {
    color: COLORS.accent,
    fontWeight: "bold",
    marginRight: 8,
    fontSize: 15,
  },
  qnaText: {
    color: COLORS.mutedForeground,
    fontSize: 15,
    flex: 1,
    lineHeight: 22,
  },
  priceContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 15,
    marginVertical: 10,
  },
  priceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 4,
  },
  priceLabel: {
    color: COLORS.mutedForeground,
    fontSize: 15,
  },
  lowestOfferCard: {
    borderColor: COLORS.accent,
    borderWidth: 1,
  },
  lowestOfferTag: {
    position: "absolute",
    top: -1,
    right: 15,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  lowestOfferText: {
    color: COLORS.foreground,
    fontSize: 12,
    fontWeight: "bold",
  },
  newestOfferTag: {
    backgroundColor: COLORS.success,
  },
  dealerName: { fontSize: 18, fontWeight: "600", color: COLORS.foreground },
  bidPrice: { fontSize: 18, fontWeight: "bold", color: COLORS.accent },
  bidFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  acceptButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  chatButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 10,
  },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
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
  buttonText: { color: COLORS.foreground, fontWeight: "bold" },
});

export default RequestDetailScreen;
