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
  TextInput,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack, Link } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { isAxiosError } from "axios";
import { Ionicons } from "@expo/vector-icons";
import { mediaUrl } from "@/lib/api/client";
import {
  acceptOffer,
  askDealerQuestion,
  compareSelectedBids,
  getRequestDetail,
} from "@/lib/api/requests";
import {
  showNativeFlowAlert,
  showNativeFlowConfirm,
} from "@/lib/nativeFlowAlert";

const SCREEN_WIDTH = Dimensions.get("window").width;
const getSingleParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;
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
const CARD_WIDTH = SCREEN_WIDTH * 0.8;

interface CarRequest {
  id: number;
  make: string | null;
  model: string | null;
  min_year: number | null;
  status: string;
  notes: string;
  created_at: string;
  equipment: string | null; // e.g., "sunroof,leather_seats"
  bid_count: number;
  images?: { image_url: string }[];
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
    id: number;
    username: string;
    avg_rating: number;
  };
}

// New interface for comparison data
interface ComparisonBid {
  id: number;
  price: number;
  mileage: number;
  car_year: number;
  make: string;
  model: string;
  condition: string;
  availability: string;
  valid_until: string;
  message?: string;
  extras?: string;
  dealer_id: number;
  dealer_username?: string;
  dealer?: { username: string; avg_rating: number };
  image_url?: string;
  image_urls?: string[];
  is_best_price?: boolean;
  is_best_mileage?: boolean;
  is_best_year?: boolean;
}

/**
 * A component to display an offer image with a loading indicator.
 */
const OfferImage = ({ uri, onPress }: { uri: string; onPress: () => void }) => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <Pressable onPress={onPress}>
      <View style={styles.offerImage}>
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          onLoadEnd={() => setIsLoading(false)}
        />
        {isLoading && (
          <ActivityIndicator
            style={StyleSheet.absoluteFill}
            color={COLORS.accent}
          />
        )}
      </View>
    </Pressable>
  );
};

const RequestDetailScreen = () => {
  const { id, bid_id } = useLocalSearchParams();
  const highlightedBidId = Number(getSingleParam(bid_id)) || null;
  const { token, logout, isLoading } = useAuth() as any;
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
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedBids, setSelectedBids] = useState<number[]>([]);
  // New state for comparison modal
  const [isCompareModalVisible, setCompareModalVisible] = useState(false);
  const [comparisonBids, setComparisonBids] = useState<ComparisonBid[]>([]);
  const [isComparisonLoading, setComparisonLoading] = useState(false);
  const [questionBidId, setQuestionBidId] = useState<number | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [isQuestionSubmitting, setQuestionSubmitting] = useState(false);

  const fetchRequestDetails = useCallback(async () => {
    if (!token || !id) {
      setLoading(false);
      return;
    }
    try {
      const response = await getRequestDetail(String(id));
      setRequest(response.data.request);
      setBids(response.data.bids);
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 401) {
        showNativeFlowAlert("Session Expired", "Please log in again.", () => {
          logout();
          router.replace("/login");
        });
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
  }, [id, logout, router, token]);

  useEffect(() => {
    if (!isLoading && !token) {
      router.replace("/(auth)/login");
      return;
    }
    fetchRequestDetails();
  }, [fetchRequestDetails, isLoading, router, token]);

  useEffect(() => {
    if (!highlightedBidId || !bids.some((bid) => bid.id === highlightedBidId)) {
      return;
    }

    setExpandedQAs((prev) =>
      prev[highlightedBidId] ? prev : { ...prev, [highlightedBidId]: true }
    );
  }, [bids, highlightedBidId]);

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
    showNativeFlowConfirm({
      title: "Accept Offer?",
      message: `Are you sure you want to accept the offer of ${bid.price.toLocaleString()} ETB from ${
        bid.dealer.username
      }? This will close the request.`,
      confirmText: "Accept",
      onConfirm: async () => {
        try {
          setLoading(true);
          const response = await acceptOffer(bid.id, "cash");

          if (response.data.status === "success") {
            showNativeFlowAlert(
              "Offer Accepted!",
              "The dealer has been notified.",
              () => router.replace(`/deal/${response.data.deal.id}`)
            );
          } else {
            throw new Error(response.data.message || "Failed to accept offer.");
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
    });
  };

  const handleAskQuestion = (bidId: number) => {
    setQuestionBidId(bidId);
    setQuestionText("");
  };

  const closeQuestionModal = () => {
    if (isQuestionSubmitting) return;
    setQuestionBidId(null);
    setQuestionText("");
  };

  const submitQuestion = async () => {
    const trimmed = questionText.trim();
    if (!questionBidId || trimmed.length < 2) {
      Alert.alert("Question Required", "Please enter your question.");
      return;
    }

    try {
      setQuestionSubmitting(true);
      const response = await askDealerQuestion(questionBidId, trimmed);

      if (response.data.status === "success") {
        Alert.alert("Question Sent", response.data.message);
        closeQuestionModal();
        fetchRequestDetails();
      } else {
        throw new Error(response.data.message || "Failed to send question.");
      }
    } catch (error: any) {
      console.error("Failed to send question:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "An error occurred. Please try again."
      );
    } finally {
      setQuestionSubmitting(false);
    }
  };

  const handleCompare = async () => {
    if (selectedBids.length < 2 || !token) return;

    setComparisonLoading(true);
    setCompareModalVisible(true);

    try {
      const response = await compareSelectedBids(selectedBids.join(","));
      setComparisonBids(response.data.bids);
    } catch (error) {
      console.error("Failed to fetch comparison:", error);
      Alert.alert("Error", "Could not load comparison data. Please try again.");
      setCompareModalVisible(false); // Close modal on error
    } finally {
      setComparisonLoading(false);
      setSelectionMode(false);
      setSelectedBids([]);
    }
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

            {request.images && request.images.length > 0 && (
              <View style={styles.requestImagesContainer}>
                <Text style={[styles.detailLabel, { marginBottom: 8 }]}>
                  Reference Photos:
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.requestImagesScroll}
                >
                  {request.images.map((img, idx) => (
                    <Pressable
                      key={idx}
                      onPress={() =>
                        openImageViewer(
                          request.images!.map(
                            (i) => mediaUrl(i.image_url) || ""
                          ),
                          idx
                        )
                      }
                    >
                      <Image
                        source={{ uri: mediaUrl(img.image_url) || "" }}
                        style={styles.requestImage}
                      />
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
          {request.equipment && (
            <View style={styles.card}>
              <Text style={styles.sectionTitleSmall}>Important Features</Text>
              <View style={styles.featuresContainer}>
                {request.equipment.split(",").map((feature, index) => (
                  <View key={index} style={styles.featureChip}>
                    <Text style={styles.featureChipText}>
                      {feature
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Dealer Offers Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Dealer Offers ({bids.length})
            </Text>
            {bids.length > 1 && (
              <Pressable
                onPress={() => {
                  setSelectionMode((prev) => !prev);
                  setSelectedBids([]); // Reset on toggle
                }}
              >
                <Text style={styles.selectButtonText}>
                  {selectionMode ? "Cancel" : "Compare"}
                </Text>
              </Pressable>
            )}
          </View>
          {bids.length > 0 ? (
            bids.map((bid, index) => {
              const isSelected = selectedBids.includes(bid.id);
              const hasDealerAnswer =
                bid.questions?.some((qna) => Boolean(qna.answer_text)) ?? false;
              const isNotificationTarget = highlightedBidId === bid.id;
              return (
                <Pressable
                  key={bid.id}
                  onPress={() => {
                    if (selectionMode) {
                      if (isSelected) {
                        setSelectedBids((prev) =>
                          prev.filter((id) => id !== bid.id)
                        );
                      } else {
                        setSelectedBids((prev) => [...prev, bid.id]);
                      }
                    }
                  }}
                  disabled={!selectionMode}
                >
                  <View
                    style={[
                      styles.card,
                      index === 0 && styles.lowestOfferCard,
                      isNotificationTarget && styles.notificationTargetCard,
                      isSelected && styles.selectedCard,
                    ]}
                  >
                    {selectionMode && (
                      <View style={styles.selectionOverlay}>
                        <Ionicons
                          name={isSelected ? "checkbox" : "square-outline"}
                          size={24}
                          color={COLORS.foreground}
                        />
                      </View>
                    )}
                    {index === 0 && (
                      <View style={styles.lowestOfferTag}>
                        <Text style={styles.lowestOfferText}>Lowest Offer</Text>
                      </View>
                    )}
                    {bid.is_newest && index !== 0 && (
                      <View
                        style={[styles.lowestOfferTag, styles.newestOfferTag]}
                      >
                        <Text style={styles.lowestOfferText}>Newest Offer</Text>
                      </View>
                    )}
                    <View style={styles.bidHeader}>
                      <View style={styles.bidDealerInfo}>
                        <Link
                          href={`/(details)/dealers/public/${bid.dealer.id}`}
                          asChild
                        >
                          <Pressable
                            style={styles.dealerProfileLink}
                            onPress={(event: any) => {
                              event?.stopPropagation?.();
                            }}
                          >
                            <Text style={styles.dealerName}>
                              {bid.dealer.username}
                            </Text>
                          </Pressable>
                        </Link>
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
                      {hasDealerAnswer && (
                        <View style={styles.answeredOfferBadge}>
                          <Ionicons
                            name="chatbubble-ellipses"
                            size={15}
                            color={COLORS.success}
                          />
                          <Text style={styles.answeredOfferText}>Answered</Text>
                        </View>
                      )}
                    </View>

                    {bid.image_urls && bid.image_urls.length > 0 && (
                      <FlatList
                        horizontal
                        data={bid.image_urls}
                        renderItem={({ item, index }) => (
                          <OfferImage
                            uri={item}
                            onPress={() =>
                              openImageViewer(bid.image_urls, index)
                            }
                          />
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
                              expandedQAs[bid.id]
                                ? "chevron-up"
                                : "chevron-down"
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
                </Pressable>
              );
            })
          ) : (
            <View style={styles.card}>
              <Text style={styles.noBidsText}>
                No offers have been placed on this request yet. Check back soon!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {selectionMode && (
        <View style={styles.compareFooter}>
          <Pressable
            style={[
              styles.compareButton,
              selectedBids.length < 2 && styles.disabledButton,
            ]}
            onPress={handleCompare}
            disabled={selectedBids.length < 2 || isComparisonLoading}
          >
            <Text style={styles.compareButtonText}>
              Compare ({selectedBids.length})
            </Text>
          </Pressable>
        </View>
      )}

      <Modal
        animationType="fade"
        transparent
        visible={questionBidId !== null}
        onRequestClose={closeQuestionModal}
      >
        <View style={styles.questionModalOverlay}>
          <View style={styles.questionModal}>
            <Text style={styles.questionModalTitle}>Ask Dealer A Question</Text>
            <TextInput
              style={styles.questionInput}
              value={questionText}
              onChangeText={setQuestionText}
              placeholder="Type your question..."
              placeholderTextColor={COLORS.mutedForeground}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.questionModalActions}>
              <Pressable
                style={[styles.questionModalButton, styles.questionCancelButton]}
                onPress={closeQuestionModal}
                disabled={isQuestionSubmitting}
              >
                <Text style={styles.questionCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.questionModalButton, styles.questionSubmitButton]}
                onPress={submitQuestion}
                disabled={isQuestionSubmitting}
              >
                {isQuestionSubmitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.questionSubmitText}>Send Question</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Comparison Modal */}
      <Modal
        animationType="slide"
        visible={isCompareModalVisible}
        onRequestClose={() => {
          setCompareModalVisible(false);
          setComparisonBids([]);
        }}
      >
        <View style={styles.compareContainer}>
          <View style={styles.compareHeader}>
            <Text style={styles.compareTitle}>Side-by-Side Comparison</Text>
            <Pressable
              style={styles.compareCloseButton}
              onPress={() => setCompareModalVisible(false)}
            >
              <Ionicons name="close" size={30} color={COLORS.foreground} />
            </Pressable>
          </View>

          {isComparisonLoading ? (
            <ActivityIndicator
              size="large"
              color={COLORS.accent}
              style={{ marginTop: 50 }}
            />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.compareCardsContainer}
              decelerationRate="fast"
              snapToInterval={CARD_WIDTH + 15} // Card width + margin
            >
              {comparisonBids.map((bid) => (
                <View key={bid.id} style={styles.compareCard}>
                  {(() => {
                    const imageUrl = bid.image_url || bid.image_urls?.[0];
                    return (
                      <>
                  {/* Header / Dealer Info */}
                  <View style={styles.compareCardHeader}>
                    <Text style={styles.compareDealerName}>
                      {bid.dealer?.username || "Dealer"}
                    </Text>
                    <View style={styles.compareRatingBadge}>
                      <Ionicons name="star" size={12} color="#FFD700" />
                      <Text style={styles.compareRatingText}>
                        {bid.dealer?.avg_rating?.toFixed(1) || "N/A"}
                      </Text>
                    </View>
                  </View>

                  {/* Car Image */}
                  <View style={styles.compareImageContainer}>
                    {imageUrl ? (
                      <Image
                        source={{ uri: mediaUrl(imageUrl) || "" }}
                        style={styles.compareImage}
                      />
                    ) : (
                      <View
                        style={[
                          styles.compareImage,
                          styles.comparePlaceholderImage,
                        ]}
                      >
                        <Ionicons
                          name="car-sport"
                          size={40}
                          color={COLORS.mutedForeground}
                        />
                      </View>
                    )}
                  </View>

                  {/* Key Specs */}
                  <View style={styles.compareSpecsContainer}>
                    <Text style={styles.compareCarTitle}>
                      {bid.car_year} {bid.make} {bid.model}
                    </Text>

                    <View
                      style={[
                        styles.compareRow,
                        bid.is_best_price && styles.compareHighlightRow,
                      ]}
                    >
                      <Text style={styles.compareLabel}>Price</Text>
                      <Text
                        style={[styles.compareValue, styles.comparePriceValue]}
                      >
                        {bid.price.toLocaleString()} ETB
                      </Text>
                      {bid.is_best_price && (
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color={COLORS.success}
                          style={styles.compareBestIcon}
                        />
                      )}
                    </View>

                    {/* Other comparison rows... */}
                  </View>

                  {/* Action Button */}
                  <Pressable
                    style={styles.compareSelectButton}
                    onPress={() => setCompareModalVisible(false)}
                  >
                    <Text style={styles.compareSelectButtonText}>Close</Text>
                  </Pressable>
                      </>
                    );
                  })()}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>

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
  selectButtonText: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: "600",
    padding: 5,
  },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.foreground,
    marginBottom: 15,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitleSmall: {
    fontSize: 18,
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
  selectedCard: {
    borderColor: COLORS.accent,
    borderWidth: 2,
    backgroundColor: "#2E2245",
  },
  notificationTargetCard: {
    borderColor: COLORS.success,
    borderWidth: 2,
  },
  selectionOverlay: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 5,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
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
  requestImagesContainer: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  requestImagesScroll: { flexDirection: "row" },
  requestImage: {
    width: 100,
    height: 80,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: COLORS.muted,
  },
  noBidsText: {
    fontSize: 16,
    color: COLORS.mutedForeground,
    textAlign: "center",
    paddingVertical: 20,
  },
  featuresContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  featureChip: {
    backgroundColor: COLORS.muted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  featureChipText: {
    color: COLORS.mutedForeground,
    fontSize: 14,
  },
  bidHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 10,
  },
  bidDealerInfo: {
    flex: 1,
    minWidth: 0,
  },
  answeredOfferBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    marginTop: 24,
    borderWidth: 1,
    borderColor: COLORS.success,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: "rgba(49, 208, 170, 0.12)",
  },
  answeredOfferText: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: "700",
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
    overflow: "hidden", // Ensures the inner Image respects the border radius
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
  dealerProfileLink: {
    alignSelf: "flex-start",
  },
  dealerName: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.accent,
    textDecorationLine: "underline",
  },
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
  compareFooter: {
    padding: 20,
    paddingBottom: 30, // For safe area
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  compareButton: {
    backgroundColor: COLORS.accent,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: COLORS.muted,
  },
  compareButtonText: {
    color: COLORS.foreground,
    fontSize: 18,
    fontWeight: "bold",
  },
  questionModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    padding: 20,
  },
  questionModal: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  questionModalTitle: {
    color: COLORS.foreground,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 14,
  },
  questionInput: {
    minHeight: 120,
    fontSize: 16,
    color: COLORS.foreground,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
  },
  questionModalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
  },
  questionModalButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  questionCancelButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  questionCancelText: {
    color: COLORS.foreground,
    fontWeight: "600",
  },
  questionSubmitButton: {
    backgroundColor: COLORS.accent,
    minWidth: 130,
  },
  questionSubmitText: {
    color: "white",
    fontWeight: "700",
  },
  // Comparison Modal Styles
  compareContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 40,
  },
  compareHeader: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  compareTitle: { fontSize: 22, fontWeight: "bold", color: COLORS.foreground },
  compareCloseButton: { padding: 5 },
  compareScrollContent: { paddingBottom: 40 },
  compareCardsContainer: { paddingHorizontal: 15, paddingVertical: 20 },
  compareCard: {
    backgroundColor: COLORS.card,
    width: CARD_WIDTH,
    borderRadius: 16,
    padding: 15,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  compareCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  compareDealerName: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.foreground,
  },
  compareRatingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2E2245",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  compareRatingText: {
    color: COLORS.foreground,
    fontSize: 12,
    marginLeft: 4,
    fontWeight: "bold",
  },
  compareImageContainer: {
    height: 140,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 15,
  },
  compareImage: { width: "100%", height: "100%", resizeMode: "cover" },
  comparePlaceholderImage: {
    backgroundColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  compareSpecsContainer: { gap: 10 },
  compareCarTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.foreground,
    marginBottom: 5,
  },
  compareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  compareHighlightRow: {
    backgroundColor: "rgba(40, 167, 69, 0.1)",
    borderRadius: 4,
    paddingHorizontal: 4,
    marginHorizontal: -4,
  },
  compareLabel: { color: COLORS.mutedForeground, fontSize: 14 },
  compareValue: { color: COLORS.foreground, fontSize: 15, fontWeight: "500" },
  comparePriceValue: { color: COLORS.accent, fontWeight: "bold", fontSize: 16 },
  compareBestIcon: { marginLeft: 6 },
  compareSelectButton: {
    marginTop: "auto", // Pushes button to the bottom
    paddingTop: 15,
    backgroundColor: COLORS.accent,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  compareSelectButtonText: { color: "white", fontWeight: "bold", fontSize: 16 },
});

export default RequestDetailScreen;
