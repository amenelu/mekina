import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import VehicleCard from "@/components/_components/VehicleCard";
import { DEALER_ROUTES, PUBLIC_HOME_ROUTE } from "@/lib/roleRoutes";
import { getDealerProfile } from "@/lib/api/dealer";

const COLORS = {
  background: "#14181F",
  card: "#1C212B",
  text: "#F8F8F8",
  textSecondary: "#8A94A3",
  accent: "#A370F7",
  destructive: "#dc3545",
  warning: "#ffc107",
  border: "#313843",
};

interface DealerProfile {
  username: string;
  email: string;
  phone_number?: string;
  tagline?: string;
  is_verified: boolean;
}

interface Review {
  id: number;
  rating: number;
  review_text: string;
  buyer?: { username: string };
  timestamp: string;
}

interface ApiCar {
  id: number;
  year: number;
  make: string;
  model: string;
  mileage: number;
  price_display?: string;
  primary_image_url?: string;
  listing_type?: string;
}

const StarRating = ({ rating }: { rating: number }) => {
  const totalStars = 5;
  return (
    <View style={styles.starContainer}>
      {[...Array(totalStars)].map((_, index) => (
        <Ionicons
          key={index}
          name={index < Math.round(rating) ? "star" : "star-outline"}
          size={20}
          color={COLORS.warning}
        />
      ))}
    </View>
  );
};

const ReviewItem = ({ item }: { item: Review }) => (
  <View style={styles.reviewCard}>
    <View style={styles.reviewHeader}>
      <StarRating rating={item.rating} />
      <Text style={styles.reviewMeta}>
        {item.buyer?.username || "Anonymous"} on{" "}
        {new Date(item.timestamp).toLocaleDateString()}
      </Text>
    </View>
    <Text style={styles.reviewText}>{item.review_text}</Text>
  </View>
);

const SectionList = <T,>({
  data,
  emptyText,
  renderItem,
}: {
  data: T[];
  emptyText: string;
  renderItem: (item: T) => React.ReactNode;
}) => {
  if (data.length === 0) {
    return <Text style={styles.emptyText}>{emptyText}</Text>;
  }

  return <View style={styles.sectionList}>{data.map(renderItem)}</View>;
};

const ProfileScreen = () => {
  const { logout, user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profileData, setProfileData] = useState<{
    dealer: DealerProfile;
    listings: ApiCar[];
    ratings: Review[];
    avg_rating: number;
    review_count: number;
  } | null>(null);

  const fetchProfile = useCallback(async (isRefresh = false) => {
    if (!user?.id || !token) return;
    if (!isRefresh) setLoading(true);
    try {
      const response = await getDealerProfile(user.id);
      setProfileData(response.data);
    } catch (error) {
      console.error("Failed to fetch dealer profile:", error);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, [token, user?.id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile(true);
  };

  const handleLogout = () => {
    logout();
    router.replace(PUBLIC_HOME_ROUTE as any);
  };

  if (loading && !refreshing) {
    return (
      <ActivityIndicator
        size="large"
        color={COLORS.accent}
        style={styles.centered}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <Pressable onPress={handleLogout}>
          <Ionicons
            name="log-out-outline"
            size={28}
            color={COLORS.destructive}
          />
        </Pressable>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
          />
        }
      >
        {profileData && (
          <>
            <View style={styles.profileHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {profileData.dealer.username[0].toUpperCase()}
                </Text>
              </View>
              <Text style={styles.dealerName}>
                {profileData.dealer.username}{" "}
                {profileData.dealer.is_verified && (
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color={COLORS.accent}
                  />
                )}
              </Text>
              {profileData.dealer.tagline && (
                <Text style={styles.tagline}>{profileData.dealer.tagline}</Text>
              )}
              <View style={styles.ratingSummary}>
                <StarRating rating={profileData.avg_rating} />
                <Text style={styles.ratingText}>
                  {profileData.avg_rating.toFixed(1)} (
                  {profileData.review_count} reviews)
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Active Listings</Text>
              <SectionList
                data={profileData.listings}
                emptyText="No active listings."
                renderItem={(item) => (
                  <VehicleCard
                    key={item.id}
                    onPress={() => {
                      router.push({
                        pathname: DEALER_ROUTES.editListing as any,
                        params: {
                          id: item.id.toString(),
                          returnTo: DEALER_ROUTES.profile,
                        },
                      });
                    }}
                    item={{
                      id: item.id.toString(),
                      year: item.year,
                      make: item.make,
                      model: item.model,
                      mileage: item.mileage,
                      price: item.price_display || "N/A",
                      image: item.primary_image_url || "",
                      listingType: (item.listing_type
                        ? item.listing_type.charAt(0).toUpperCase() +
                          item.listing_type.slice(1)
                        : "Sale") as any,
                    }}
                    style={{ width: "100%" }}
                  />
                )}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Reviews</Text>
              <SectionList
                data={profileData.ratings}
                emptyText="You have no reviews yet."
                renderItem={(item) => <ReviewItem key={item.id} item={item} />}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: COLORS.text },
  profileHeader: {
    alignItems: "center",
    padding: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.accent,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  avatarText: {
    color: "white",
    fontSize: 40,
    fontWeight: "bold",
  },
  dealerName: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 5,
  },
  tagline: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontStyle: "italic",
    marginBottom: 10,
  },
  ratingSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  starContainer: {
    flexDirection: "row",
  },
  ratingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 15,
  },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 20,
  },
  sectionList: {
    width: "100%",
  },
  reviewCard: {
    backgroundColor: COLORS.card,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  reviewMeta: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  reviewText: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default ProfileScreen;
