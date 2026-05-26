import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Pressable,
  TextInput,
  RefreshControl,
  Platform,
  useWindowDimensions,
} from "react-native";
import {
  useLocalSearchParams,
  Stack,
  useRouter,
  useFocusEffect,
} from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { Ionicons } from "@expo/vector-icons";
import {
  completeDeal,
  getDeal,
  rateDeal,
  requestDealCompletion,
} from "@/lib/api/requests";
import { DEALER_ROUTES } from "@/lib/roleRoutes";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  mutedForeground: "#8A94A3",
  border: "#313843",
  success: "#28a745",
};

interface Deal {
  id: number;
  final_price: number;
  payment_method: string;
  deal_date: string;
  status: "accepted" | "completed" | string;
  completed_at?: string | null;
  reward_points_awarded?: boolean;
  reward_points_amount?: number;
  customer: { id: number; username: string; email: string; phone_number: string };
  dealer: { id: number; username: string; email: string; phone_number: string };
  accepted_bid: {
    car_year: number;
    make: string;
    model: string;
    condition: string;
    mileage: number;
  };
  has_rated?: boolean;
}

const DealSummaryScreen = () => {
  const { id } = useLocalSearchParams();
  const { token, isLoading, user } = useAuth() as any;
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDealer = Boolean(user?.is_dealer);
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [completingDeal, setCompletingDeal] = useState(false);
  const [requestingCompletion, setRequestingCompletion] = useState(false);
  const isWideWeb = Platform.OS === "web" && width >= 1000;
  const canCompleteDeal =
    deal?.status === "accepted" &&
    (Number(user?.id) === Number(deal.customer?.id) || user?.is_admin);
  const canRequestCompletion =
    deal?.status === "accepted" &&
    (Number(user?.id) === Number(deal.dealer?.id) || user?.is_admin);

  const fetchDeal = useCallback(
    async (isRefresh = false) => {
      if (!token || !id) return;
      if (!isRefresh) setLoading(true);
      try {
        const response = await getDeal(String(id));
        setDeal(response.data.deal);
      } catch (error) {
        console.error("Failed to fetch deal details:", error);
        Alert.alert("Error", "Could not load deal summary.");
      } finally {
        setLoading(false);
        if (isRefresh) setRefreshing(false);
      }
    },
    [id, token]
  );

  useFocusEffect(
    useCallback(() => {
      if (!isLoading && !token) {
        router.replace("/(auth)/login");
        return;
      }
      fetchDeal();
    }, [fetchDeal, isLoading, router, token])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDeal(true);
  };

  const handleSubmitReview = async () => {
    if (deal?.status !== "completed") {
      Alert.alert(
        "Complete Deal First",
        "Mark the deal completed before rating the dealer."
      );
      return;
    }

    if (rating === 0) {
      Alert.alert("Rating Required", "Please select a star rating.");
      return;
    }
    setSubmittingReview(true);
    try {
      const response = await rateDeal(String(id), {
        rating,
        comment: reviewText,
      });
      if (response.status === 201) {
        Alert.alert("Success", "Thank you for your review!");
        // Re-fetch data from the server to get the authoritative state
        await fetchDeal();
      }
    } catch (error: any) {
      console.error("Failed to submit review:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to submit review."
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleCompleteDeal = async () => {
    if (!id || completingDeal) return;

    setCompletingDeal(true);
    try {
      const response = await completeDeal(String(id));
      setDeal(response.data.deal);
      Alert.alert(
        "Deal Completed",
        response.data.message ||
          "The dealer has been rewarded for closing this deal."
      );
    } catch (error: any) {
      console.error("Failed to complete deal:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message ||
          error.userMessage ||
          "Failed to complete deal."
      );
    } finally {
      setCompletingDeal(false);
    }
  };

  const handleRequestCompletion = async () => {
    if (!id || requestingCompletion) return;

    setRequestingCompletion(true);
    try {
      const response = await requestDealCompletion(String(id));
      Alert.alert(
        "Completion Requested",
        response.data?.message || "The buyer has been asked to confirm completion."
      );
    } catch (error: any) {
      console.error("Failed to request deal completion:", error);
      Alert.alert(
        "Request Failed",
        error.response?.data?.message ||
          error.userMessage ||
          "Could not request completion."
      );
    } finally {
      setRequestingCompletion(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (!deal) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: COLORS.foreground }}>Deal not found.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: `Deal #${deal.id}` }} />
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
          />
        }
      >
        <View style={[styles.content, isWideWeb && styles.contentWide]}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {deal.status === "completed"
                ? "Deal Completed"
                : isDealer
                ? "Offer Accepted!"
                : "Deal Confirmed!"}
            </Text>
            <Text style={styles.headerSubtitle}>
              {deal.status === "completed"
                ? "This deal has been marked complete. The dealer reward is recorded."
                : isDealer
                ? "Your offer was accepted. Contact the customer to finalize the transaction."
                : "Here are the details of your agreement. Mark the deal completed after the transaction is finalized."}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.finalPrice}>
              {deal.final_price.toLocaleString("en-US", {
                style: "currency",
                currency: "ETB",
              })}
            </Text>
            <Text style={styles.paymentMethod}>
              via{" "}
              {deal.payment_method.charAt(0).toUpperCase() +
                deal.payment_method.slice(1)}
            </Text>

            <View
              style={[
                styles.statusBadge,
                deal.status === "completed" && styles.statusBadgeCompleted,
              ]}
            >
              <Text style={styles.statusBadgeText}>
                {deal.status === "completed"
                  ? `Completed · +${
                      deal.reward_points_amount || 1
                    } point reward`
                  : "Accepted · awaiting completion"}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Parties Involved</Text>
              <View style={styles.party}>
                <Text style={styles.partyTitle}>Dealer</Text>
                <Text style={styles.partyInfo}>{deal.dealer.username}</Text>
                <Text style={styles.partyInfo}>{deal.dealer.email}</Text>
                <Text style={styles.partyInfo}>
                  {deal.dealer.phone_number || "No phone"}
                </Text>
              </View>
              <View style={styles.party}>
                <Text style={styles.partyTitle}>Customer</Text>
                <Text style={styles.partyInfo}>{deal.customer.username}</Text>
                <Text style={styles.partyInfo}>{deal.customer.email}</Text>
                <Text style={styles.partyInfo}>
                  {deal.customer.phone_number || "No phone"}
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vehicle Details</Text>
              <Text style={styles.carTitle}>
                {deal.accepted_bid.car_year} {deal.accepted_bid.make}{" "}
                {deal.accepted_bid.model}
              </Text>
              <Text style={styles.carDetail}>
                Condition: {deal.accepted_bid.condition}
              </Text>
              <Text style={styles.carDetail}>
                Mileage: {deal.accepted_bid.mileage.toLocaleString()} km
              </Text>
            </View>

            {canCompleteDeal && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Confirm Completion</Text>
                <Text style={styles.completionHelp}>
                  Only mark this completed after payment, inspection, and
                  handover are finalized. The dealer will receive a 1 point
                  reward.
                </Text>
                <Pressable
                  style={styles.completeButton}
                  onPress={handleCompleteDeal}
                  disabled={completingDeal}
                >
                  {completingDeal ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.completeButtonText}>
                      Mark Deal Completed
                    </Text>
                  )}
                </Pressable>
              </View>
            )}

            {canRequestCompletion && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Completion Request</Text>
                <Text style={styles.completionHelp}>
                  Once payment, inspection, and handover are finalized, ask the
                  buyer to confirm completion. The dealer reward is only applied
                  after buyer confirmation.
                </Text>
                <Pressable
                  style={styles.requestCompletionButton}
                  onPress={handleRequestCompletion}
                  disabled={requestingCompletion}
                >
                  {requestingCompletion ? (
                    <ActivityIndicator color={COLORS.accent} size="small" />
                  ) : (
                    <Text style={styles.requestCompletionButtonText}>
                      Ask Buyer to Confirm Completion
                    </Text>
                  )}
                </Pressable>
              </View>
            )}

            {!isDealer && deal.status === "completed" && deal.has_rated === false && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Rate Your Experience</Text>
                <View style={styles.ratingContainer}>
                  <Text style={styles.ratingLabel}>
                    How was your experience with {deal.dealer.username}?
                  </Text>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Pressable key={star} onPress={() => setRating(star)}>
                        <Ionicons
                          name={star <= rating ? "star" : "star-outline"}
                          size={32}
                          color="#FFD700"
                          style={{ marginHorizontal: 5 }}
                        />
                      </Pressable>
                    ))}
                  </View>
                  <TextInput
                    style={styles.reviewInput}
                    placeholder="Write a review (optional)..."
                    placeholderTextColor={COLORS.mutedForeground}
                    multiline
                    value={reviewText}
                    onChangeText={setReviewText}
                  />
                  <Pressable
                    style={styles.submitReviewButton}
                    onPress={handleSubmitReview}
                    disabled={submittingReview}
                  >
                    {submittingReview ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.submitReviewButtonText}>
                        Submit Review
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}

            {!isDealer && deal.has_rated === true && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Review Submitted</Text>
                <Text style={{ color: COLORS.mutedForeground }}>
                  You have already reviewed this transaction.
                </Text>
              </View>
            )}
          </View>

          <Pressable
            style={styles.doneButton}
            onPress={() =>
              router.replace(
                (isDealer ? DEALER_ROUTES.dashboard : "/(tabs)/my-requests") as any
              )
            }
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  content: { padding: 20 },
  contentWide: {
    maxWidth: 920,
    width: "100%",
    alignSelf: "center",
    paddingTop: 42,
  },
  header: { marginBottom: 20, alignItems: "center" },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.success,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.mutedForeground,
    textAlign: "center",
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  finalPrice: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.accent,
    textAlign: "center",
  },
  paymentMethod: {
    fontSize: 16,
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginBottom: 20,
  },
  statusBadge: {
    alignSelf: "center",
    backgroundColor: "rgba(163, 112, 247, 0.14)",
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 4,
  },
  statusBadgeCompleted: {
    backgroundColor: "rgba(40, 167, 69, 0.14)",
    borderColor: COLORS.success,
  },
  statusBadgeText: {
    color: COLORS.foreground,
    fontSize: 13,
    fontWeight: "700",
  },
  section: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 15,
    marginTop: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: 10,
  },
  party: { marginBottom: 15 },
  partyTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.mutedForeground,
  },
  partyInfo: { fontSize: 16, color: COLORS.foreground, marginTop: 4 },
  carTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.foreground,
    marginBottom: 5,
  },
  carDetail: { fontSize: 16, color: COLORS.mutedForeground, marginTop: 2 },
  completionHelp: {
    color: COLORS.mutedForeground,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  completeButton: {
    backgroundColor: COLORS.success,
    padding: 13,
    borderRadius: 10,
    alignItems: "center",
  },
  completeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  requestCompletionButton: {
    borderWidth: 1,
    borderColor: COLORS.accent,
    padding: 13,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "rgba(163, 112, 247, 0.12)",
  },
  requestCompletionButtonText: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: "800",
  },
  doneButton: {
    backgroundColor: COLORS.accent,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  doneButtonText: {
    color: COLORS.foreground,
    fontSize: 18,
    fontWeight: "bold",
  },
  ratingContainer: {
    backgroundColor: COLORS.background,
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ratingLabel: {
    color: COLORS.foreground,
    fontSize: 16,
    marginBottom: 10,
    textAlign: "center",
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 15,
  },
  reviewInput: {
    backgroundColor: COLORS.card,
    color: COLORS.foreground,
    borderRadius: 8,
    padding: 12,
    height: 80,
    textAlignVertical: "top",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  submitReviewButton: {
    backgroundColor: COLORS.accent,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  submitReviewButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default DealSummaryScreen;
