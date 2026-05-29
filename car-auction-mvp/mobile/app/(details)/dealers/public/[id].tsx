import { useLocalSearchParams, Stack, Link, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  Pressable,
  Animated,
  Easing,
} from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { Ionicons } from "@expo/vector-icons";
import { getDealerProfile } from "@/lib/api/dealer";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  mutedForeground: "#8A94A3",
  muted: "#313843",
  border: "#313843",
};

interface DealerProfile {
  id: number;
  username: string;
  is_verified: boolean;
  closed_deal_count?: number;
  dealer_quality?: {
    score: number;
    label: string;
    reasons?: string[];
    metrics?: Record<string, number>;
  };
}

interface CarListing {
  id: number;
  make: string;
  model: string;
  year: number;
  fixed_price: number;
  image_urls: string[];
}

interface DealerReview {
  id: number;
  rating: number;
  comment: string;
  buyer_username: string;
  created_at: string;
}

interface ProfileData {
  dealer: DealerProfile;
  listings: CarListing[];
  ratings: DealerReview[];
  avg_rating: number;
  review_count: number;
  dealer_quality?: {
    score: number;
    label: string;
    reasons?: string[];
    metrics?: Record<string, number>;
  };
}

const fetchDealerProfile = async (
  id: string,
  token: string | null
): Promise<ProfileData> => {
  const response = await getDealerProfile(id);
  return response.data;
};

/**
 * A component to display a listing image with a loading indicator.
 */
const ListingImageWithLoader = ({ uri }: { uri: string }) => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <View style={styles.listingImage}>
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
  );
};

const DealerPublicProfilePage: React.FC = () => {
  const { id, modal } = useLocalSearchParams<{ id: string; modal?: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const isModal = modal === "1";

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const sheetTranslateY = React.useRef(new Animated.Value(560)).current;

  useEffect(() => {
    if (id) {
      setLoading(true);
      setError(null);
      fetchDealerProfile(id, token)
        .then(setProfileData)
        .catch((err) => {
          setError(err.message || "Failed to load dealer profile.");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [id, token]);

  useEffect(() => {
    if (!isModal) return;
    sheetTranslateY.setValue(560);
    Animated.timing(sheetTranslateY, {
      toValue: 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isModal, sheetTranslateY]);

  const closeModal = React.useCallback(() => {
    Animated.timing(sheetTranslateY, {
      toValue: 560,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      if (router.canGoBack()) {
        router.back();
        return;
      }
      router.replace("/(tabs)" as any);
    });
  }, [router, sheetTranslateY]);

  if (loading) {
    return <ActivityIndicator size="large" style={styles.centered} />;
  }

  if (error) {
    return <Text style={styles.errorText}>Error: {error}</Text>;
  }

  if (!profileData) {
    return <Text style={styles.centered}>Dealer not found.</Text>;
  }

  const { dealer, listings, ratings, avg_rating, review_count, dealer_quality } =
    profileData;
  const dealerQuality = dealer.dealer_quality || dealer_quality;
  const profileContent = (
    <ScrollView
      style={[styles.container, isModal && styles.modalScroll]}
      contentContainerStyle={isModal && styles.modalScrollContent}
    >
      <View style={styles.header}>
        <Text style={styles.dealerName}>{dealer.username}</Text>
        {dealer.is_verified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="shield-checkmark" size={16} color={COLORS.accent} />
            <Text style={styles.verifiedText}>Verified Dealer</Text>
          </View>
        )}
        <View style={styles.ratingSummary}>
          <Ionicons name="star" size={20} color="#FFD700" />
          <Text style={styles.ratingText}>
            {avg_rating.toFixed(1)} ({review_count} reviews)
          </Text>
        </View>
        <View style={styles.ratingSummary}>
          <Ionicons name="checkmark-circle" size={20} color="#28a745" />
          <Text style={styles.ratingText}>
            {dealer.closed_deal_count || 0} closed deals
          </Text>
        </View>
        {dealerQuality ? (
          <View style={styles.qualityCard}>
            <View style={styles.qualityHeader}>
              <Ionicons name="shield-checkmark" size={18} color={COLORS.accent} />
              <Text style={styles.qualityTitle}>Dealer quality</Text>
              <Text style={styles.qualityScore}>{dealerQuality.score}</Text>
            </View>
            <Text style={styles.qualityLabel}>{dealerQuality.label}</Text>
            {dealerQuality.reasons?.length ? (
              <Text style={styles.qualityReasons}>
                {dealerQuality.reasons.join(" | ")}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Listings ({listings.length})</Text>
        {listings.length > 0 ? (
          listings.map((car) => (
            <Link key={car.id} href={`/${car.id}`} asChild>
              <Pressable style={styles.listingCard}>
                <ListingImageWithLoader
                  uri={car.image_urls[0] || "https://placehold.co/600x400"}
                />
                <View style={styles.listingDetails}>
                  <Text
                    style={styles.listingTitle}
                  >{`${car.year} ${car.make} ${car.model}`}</Text>
                  <Text style={styles.listingPrice}>
                    {car.fixed_price.toLocaleString()} ETB
                  </Text>
                </View>
              </Pressable>
            </Link>
          ))
        ) : (
          <Text style={styles.emptyText}>No active listings.</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reviews</Text>
        {ratings.length > 0 ? (
          ratings.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewAuthor}>{review.buyer_username}</Text>
                <View style={styles.starRating}>
                  {[...Array(5)].map((_, i) => (
                    <Ionicons
                      key={i}
                      name="star"
                      size={14}
                      color={i < review.rating ? "#FFD700" : COLORS.border}
                    />
                  ))}
                </View>
              </View>
              <Text style={styles.reviewComment}>{review.comment}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No reviews yet.</Text>
        )}
      </View>
    </ScrollView>
  );

  if (isModal) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.modalBackdrop}>
          <Animated.View
            style={[
              styles.modalCard,
              { transform: [{ translateY: sheetTranslateY }] },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                Dealer Profile
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close dealer profile"
                onPress={closeModal}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={22} color={COLORS.foreground} />
              </Pressable>
            </View>
            {profileContent}
          </Animated.View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: `${dealer.username}'s Profile` }} />
      {profileContent}
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.62)",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 720,
    maxHeight: "88%",
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  modalHeader: {
    height: 54,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  modalTitle: {
    color: COLORS.foreground,
    fontSize: 17,
    fontWeight: "800",
    flex: 1,
  },
  modalCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.muted,
    marginLeft: 12,
  },
  modalScroll: {
    flex: 0,
  },
  modalScrollContent: {
    paddingBottom: 12,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  errorText: { color: "red", textAlign: "center", marginTop: 20 },
  header: {
    backgroundColor: COLORS.card,
    padding: 20,
    alignItems: "center",
  },
  dealerName: { fontSize: 24, fontWeight: "bold", color: COLORS.foreground },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    backgroundColor: `${COLORS.accent}20`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: { color: COLORS.accent, marginLeft: 6, fontWeight: "600" },
  ratingSummary: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  ratingText: { color: COLORS.mutedForeground, fontSize: 16, marginLeft: 8 },
  qualityCard: {
    width: "100%",
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginTop: 12,
  },
  qualityHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  qualityTitle: {
    flex: 1,
    color: COLORS.foreground,
    fontSize: 14,
    fontWeight: "800",
  },
  qualityScore: {
    color: COLORS.accent,
    fontSize: 18,
    fontWeight: "900",
  },
  qualityLabel: {
    color: COLORS.foreground,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 8,
  },
  qualityReasons: {
    color: COLORS.mutedForeground,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  section: { padding: 20 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.foreground,
    marginBottom: 15,
  },
  listingCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    marginBottom: 15,
    overflow: "hidden",
  },
  listingImage: {
    width: "100%",
    height: 180,
    backgroundColor: COLORS.muted,
    justifyContent: "center",
  },
  listingDetails: { padding: 15 },
  listingTitle: { fontSize: 16, fontWeight: "600", color: COLORS.foreground },
  listingPrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.accent,
    marginTop: 5,
  },
  reviewCard: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  reviewAuthor: { color: COLORS.foreground, fontWeight: "600" },
  starRating: { flexDirection: "row" },
  reviewComment: { color: COLORS.mutedForeground, lineHeight: 20 },
  emptyText: {
    color: COLORS.mutedForeground,
    textAlign: "center",
    fontStyle: "italic",
  },
});

export default DealerPublicProfilePage;
