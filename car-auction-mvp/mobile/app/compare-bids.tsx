import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Pressable,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { mediaUrl } from "@/lib/api/client";
import { compareSelectedBids } from "@/lib/api/requests";

const COLORS = {
  background: "#14181F",
  card: "#1C212B",
  text: "#F8F8F8",
  textSecondary: "#8A94A3",
  accent: "#A370F7",
  success: "#28a745",
  warning: "#ffc107",
  border: "#313843",
};

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = SCREEN_WIDTH * 0.8;

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
  dealer_username?: string; // Depends on backend serialization
  dealer?: {
    username: string;
    avg_rating: number;
    closed_deal_count?: number;
  };
  image_url?: string;
  image_urls?: string[];
  // Comparison flags
  is_best_price?: boolean;
  is_best_mileage?: boolean;
  is_best_year?: boolean;
  offer_explanation?: {
    primary_label?: string;
    labels?: string[];
    reasons?: string[];
  };
}

const CompareBidsScreen = () => {
  const { ids } = useLocalSearchParams<{ ids: string }>();
  const { token } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [bids, setBids] = useState<ComparisonBid[]>([]);

  useEffect(() => {
    const fetchComparison = async () => {
      if (!ids || !token) return;
      try {
        const response = await compareSelectedBids(ids);
        setBids(response.data.bids);
      } catch (error) {
        console.error("Failed to fetch comparison:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchComparison();
  }, [ids, token]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.pageHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
              return;
            }
            router.replace("/(tabs)/my-requests" as any);
          }}
          style={styles.pageHeaderBackButton}
        >
          <Text style={styles.pageHeaderBackIcon}>‹</Text>
        </Pressable>
        <Text style={styles.pageHeaderTitle}>Compare Offers</Text>
        <View style={styles.pageHeaderSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Side-by-Side Comparison</Text>
          <Text style={styles.subtitle}>
            Comparing {bids.length} selected offers
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardsContainer}
          decelerationRate="fast"
          snapToInterval={CARD_WIDTH + 15} // Card width + margin
        >
          {bids.map((bid) => {
            const rating = bid.dealer?.avg_rating || 0;
            const closedDeals = bid.dealer?.closed_deal_count || 0;
            const isTrustedDealer = rating >= 4.5 || closedDeals >= 3;

            return (
            <View
              key={bid.id}
              style={[styles.card, isTrustedDealer && styles.trustedCard]}
            >
              {(() => {
                const imageUrl = bid.image_url || bid.image_urls?.[0];
                return (
                  <>
              {/* Header / Dealer Info */}
              <View style={styles.cardHeader}>
                <View style={styles.dealerTitleBlock}>
                  <Text style={styles.dealerName}>
                    {bid.dealer?.username || "Dealer"}
                  </Text>
                  {isTrustedDealer ? (
                    <View style={styles.trustedBadge}>
                      <Ionicons
                        name="shield-checkmark"
                        size={12}
                        color={COLORS.success}
                      />
                      <Text style={styles.trustedBadgeText}>Trusted dealer</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.dealerMetrics}>
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color="#FFD700" />
                    <Text style={styles.ratingText}>
                      {rating ? rating.toFixed(1) : "New"}
                    </Text>
                  </View>
                  <View style={styles.closedDealsBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={12}
                      color={COLORS.success}
                    />
                    <Text style={styles.ratingText}>{closedDeals}</Text>
                  </View>
                </View>
              </View>

              {/* Car Image */}
              <View style={styles.imageContainer}>
                {imageUrl ? (
                  <Image
                    source={{ uri: mediaUrl(imageUrl) || "" }}
                    style={styles.image}
                  />
                ) : (
                  <View style={[styles.image, styles.placeholderImage]}>
                    <Ionicons
                      name="car-sport"
                      size={40}
                      color={COLORS.textSecondary}
                    />
                  </View>
                )}
              </View>

              {/* Key Specs */}
              <View style={styles.specsContainer}>
                <Text style={styles.carTitle}>
                  {bid.car_year} {bid.make} {bid.model}
                </Text>
                {bid.offer_explanation ? (
                  <View style={styles.explanationBox}>
                    <Text style={styles.explanationTitle}>
                      {bid.offer_explanation.primary_label || "Offer insight"}
                    </Text>
                    <Text style={styles.explanationText}>
                      {bid.offer_explanation.reasons?.join(", ") ||
                        bid.offer_explanation.labels?.join(", ") ||
                        "This offer is ready for buyer comparison."}
                    </Text>
                  </View>
                ) : null}

                <View
                  style={[styles.row, bid.is_best_price && styles.highlightRow]}
                >
                  <Text style={styles.label}>Price</Text>
                  <Text style={[styles.value, styles.priceValue]}>
                    {bid.price.toLocaleString()} ETB
                  </Text>
                  {bid.is_best_price && (
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={COLORS.success}
                      style={styles.bestIcon}
                    />
                  )}
                </View>

                <View
                  style={[
                    styles.row,
                    bid.is_best_mileage && styles.highlightRow,
                  ]}
                >
                  <Text style={styles.label}>Mileage</Text>
                  <Text style={styles.value}>
                    {bid.mileage.toLocaleString()} km
                  </Text>
                  {bid.is_best_mileage && (
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={COLORS.success}
                      style={styles.bestIcon}
                    />
                  )}
                </View>

                <View
                  style={[styles.row, bid.is_best_year && styles.highlightRow]}
                >
                  <Text style={styles.label}>Year</Text>
                  <Text style={styles.value}>{bid.car_year}</Text>
                  {bid.is_best_year && (
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={COLORS.success}
                      style={styles.bestIcon}
                    />
                  )}
                </View>

                <View style={styles.divider} />

                <View style={styles.row}>
                  <Text style={styles.label}>Condition</Text>
                  <Text style={styles.value}>{bid.condition}</Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.label}>Availability</Text>
                  <Text style={styles.value}>{bid.availability}</Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.label}>Valid Until</Text>
                  <Text style={styles.value}>
                    {new Date(bid.valid_until).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              {/* Action Button */}
              <Pressable
                style={styles.selectButton}
                onPress={() => router.back()} // Go back to accept
              >
                <Text style={styles.selectButtonText}>View Details</Text>
              </Pressable>
                  </>
                );
              })()}
            </View>
          );
          })}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  pageHeader: {
    height: 58,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  pageHeaderBackButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  pageHeaderBackIcon: {
    color: COLORS.text,
    fontSize: 34,
    fontWeight: "500",
    lineHeight: 38,
  },
  pageHeaderTitle: {
    flex: 1,
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  pageHeaderSpacer: {
    width: 42,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  scrollContent: { paddingBottom: 40 },
  header: { padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  cardsContainer: { paddingHorizontal: 15, paddingBottom: 20 },
  card: {
    backgroundColor: COLORS.card,
    width: CARD_WIDTH,
    borderRadius: 16,
    padding: 15,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  trustedCard: {
    borderColor: COLORS.success,
    shadowColor: COLORS.success,
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  dealerTitleBlock: { flex: 1, paddingRight: 8 },
  dealerName: { fontSize: 16, fontWeight: "bold", color: COLORS.text },
  trustedBadge: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  trustedBadgeText: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: "800",
  },
  dealerMetrics: {
    alignItems: "flex-end",
    gap: 6,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2E2245",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingText: {
    color: COLORS.text,
    fontSize: 12,
    marginLeft: 4,
    fontWeight: "bold",
  },
  closedDealsBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(40, 167, 69, 0.12)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  imageContainer: {
    height: 140,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 15,
  },
  image: { width: "100%", height: "100%", resizeMode: "cover" },
  placeholderImage: {
    backgroundColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  specsContainer: { gap: 10 },
  carTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 5,
  },
  explanationBox: {
    borderWidth: 1,
    borderColor: "rgba(163,112,247,0.45)",
    backgroundColor: "rgba(163,112,247,0.08)",
    borderRadius: 8,
    padding: 10,
  },
  explanationTitle: {
    color: COLORS.text,
    fontWeight: "800",
    fontSize: 13,
  },
  explanationText: {
    color: COLORS.textSecondary,
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  highlightRow: {
    backgroundColor: "rgba(40, 167, 69, 0.1)",
    borderRadius: 4,
    paddingHorizontal: 4,
    marginHorizontal: -4,
  },
  label: { color: COLORS.textSecondary, fontSize: 14 },
  value: { color: COLORS.text, fontSize: 15, fontWeight: "500" },
  priceValue: { color: COLORS.accent, fontWeight: "bold", fontSize: 16 },
  bestIcon: { marginLeft: 6 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 5 },
  selectButton: {
    marginTop: 20,
    backgroundColor: COLORS.accent,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  selectButtonText: { color: "white", fontWeight: "bold", fontSize: 16 },
});

export default CompareBidsScreen;
