import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Pressable,
  RefreshControl,
  SafeAreaView,
  TextInput,
  Modal,
  Alert,
  Image,
  Animated,
  Platform,
  useWindowDimensions,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { Ionicons } from "@expo/vector-icons";
import { useSocket } from "@/contexts/SocketContext";
import { DEALER_ROUTES, LOGIN_ROUTE } from "@/lib/roleRoutes";
import {
  answerDealerRequestQuestion,
  getDealerDashboard,
} from "@/lib/api/dealer";
import { mediaUrl } from "@/lib/api/client";
import { getActiveTradeIns } from "@/lib/api/tradeIn";

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
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const DEALER_DASHBOARD_TABS = ["listings", "requests", "pending", "questions"] as const;
type DealerDashboardTab = (typeof DEALER_DASHBOARD_TABS)[number];
const getSingleParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

interface DashboardStats {
  points?: number;
  active_listings_count?: number;
  new_requests_count?: number;
  pending_approval_count?: number;
  unanswered_questions_count?: number;
}

interface Listing {
  id: number;
  make: string;
  model: string;
  year: number;
  is_approved: boolean;
  is_active: boolean;
  listing_type: string;
}

interface CustomerRequest {
  id: number;
  type?: "buy" | "trade-in";
  make: string;
  model: string;
  year?: number;
  mileage?: number;
  target_car?: string | null;
  min_year?: number;
  message?: string;
  notes?: string;
  comments?: string;
  created_at: string;
  min_price?: number;
  max_price?: number;
  condition?: string;
  transmission?: string;
  bid_count?: number;
  lowest_offer?: number;
  has_been_viewed?: boolean;
  detail_score?: number;
  request_source?: "image_based" | "specific" | "general";
  image_urls?: string[];
  offer_count?: number;
}

interface RequestQuestion {
  id: number;
  question_text: string;
  timestamp: string;
  request_id?: number;
  request_title?: string;
  bid_price?: number;
  bid_vehicle?: string;
  buyer?: {
    id: number;
    username: string;
  } | null;
}

const StatCard = ({
  label,
  value,
  onPress,
  pulse = false,
}: {
  label: string;
  value: number;
  onPress?: () => void;
  pulse?: boolean;
}) => {
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === "web" && width >= 1000;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!pulse) {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 850,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [pulse, pulseAnim]);

  const animatedStyle = pulse
    ? {
        transform: [
          {
            scale: pulseAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.035],
            }),
          },
        ],
      }
    : null;

  const CardContent = () => (
    <>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </>
  );

  return onPress ? (
    <AnimatedPressable
      style={[
        styles.statCard,
        isWideWeb && styles.statCardWide,
        pulse && styles.pulsingStatCard,
        animatedStyle,
      ]}
      onPress={onPress}
    >
      <CardContent />
    </AnimatedPressable>
  ) : (
    <Animated.View
      style={[
        styles.statCard,
        isWideWeb && styles.statCardWide,
        pulse && styles.pulsingStatCard,
        animatedStyle,
      ]}
    >
      <CardContent />
    </Animated.View>
  );
};

const ListingItem = ({ item }: { item: Listing }) => {
  const handlePress = () => {
    router.push({
      pathname: DEALER_ROUTES.editListing as any,
      params: { id: item.id.toString() },
    });
  };

  return (
    <Pressable style={styles.itemCard} onPress={handlePress}>
      <View>
        <Text style={styles.itemTitle}>
          {item.year} {item.make} {item.model}
        </Text>
        <Text style={styles.itemSubtitle}>
          {item.listing_type.toUpperCase()}
        </Text>
      </View>
      <View style={styles.statusContainer}>
        {item.is_approved ? (
          <>
            <Text style={[styles.statusTag, styles.approved]}>Approved</Text>
            <Text
              style={[
                styles.statusTag,
                item.is_active ? styles.active : styles.inactive,
              ]}
            >
              {item.is_active ? "Active" : "Inactive"}
            </Text>
          </>
        ) : (
          <Text style={[styles.statusTag, styles.pending]}>
            Pending Approval
          </Text>
        )}
      </View>
    </Pressable>
  );
};

const RequestItem = ({ item }: { item: CustomerRequest }) => {
  const isTradeIn = item.type === "trade-in";
  const handlePress = () => {
    if (isTradeIn) {
      router.push(`/trade-in/${item.id}` as any);
      return;
    }

    router.push({
      pathname: DEALER_ROUTES.placeOffer as any,
      params: { request_id: item.id.toString() },
    });
  };

  const getScoreColor = (score: number = 0) => {
    if (score >= 80) return COLORS.success;
    if (score >= 50) return COLORS.warning;
    return COLORS.textSecondary;
  };
  const requestTypeLabel =
    isTradeIn
      ? "Trade-in"
      : item.request_source === "image_based"
      ? "Image Based"
      : item.request_source === "specific"
        ? "Specific"
        : item.request_source === "general"
          ? "General"
          : null;

  return (
    <Pressable style={styles.itemCard} onPress={handlePress}>
      <View style={styles.requestCardHeader}>
        <Text style={styles.itemTitle}>
          {isTradeIn
            ? `Trade-in: ${item.year || ""} ${item.make || "Any Make"} ${
                item.model || ""
              }`.trim()
            : `${item.make || "Any Make"} ${item.model || ""} (${
                item.min_year || "Any"
              }+)`}
        </Text>
        {!isTradeIn && item.detail_score !== undefined && (
          <View
            style={[
              styles.scoreBadge,
              { backgroundColor: getScoreColor(item.detail_score) },
            ]}
          >
            <Text style={styles.scoreText}>{item.detail_score}%</Text>
          </View>
        )}
        {requestTypeLabel && (
          <View
            style={[
              styles.requestTypeBadge,
              item.request_source === "image_based" && styles.imageRequestBadge,
              isTradeIn && styles.tradeInRequestBadge,
            ]}
          >
            <Ionicons
              name={
                isTradeIn
                  ? "swap-horizontal"
                  : item.request_source === "image_based"
                    ? "image"
                    : "document-text"
              }
              size={12}
              color="white"
            />
            <Text style={styles.requestTypeBadgeText}>{requestTypeLabel}</Text>
          </View>
        )}
        {!item.has_been_viewed && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        )}
      </View>

      {item.image_urls?.length ? (
        <View style={styles.requestImageStrip}>
          {item.image_urls.slice(0, 3).map((imageUrl, index) => (
            <View key={`${imageUrl}-${index}`} style={styles.requestImageThumb}>
              <Image
                source={{ uri: imageUrl }}
                style={styles.requestImage}
                resizeMode="cover"
              />
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.requestCardBody}>
        <View style={styles.requestDetails}>
          {isTradeIn ? (
            <>
              <Text style={styles.detailText}>
                <Text style={styles.detailLabel}>Mileage: </Text>
                {item.mileage ? `${item.mileage.toLocaleString()} km` : "N/A"}
              </Text>
              <Text style={styles.detailText}>
                <Text style={styles.detailLabel}>Condition: </Text>
                {item.condition || "N/A"}
              </Text>
              <Text style={styles.detailText}>
                <Text style={styles.detailLabel}>Target car: </Text>
                {item.target_car || "None specified"}
              </Text>
            </>
          ) : (
            <>
              {item.min_price && item.max_price && (
                <Text style={styles.detailText}>
                  <Text style={styles.detailLabel}>Budget: </Text>
                  {item.min_price.toLocaleString()} -{" "}
                  {item.max_price.toLocaleString()} ETB
                </Text>
              )}
              <Text style={styles.detailText}>
                <Text style={styles.detailLabel}>Condition: </Text>
                {item.condition || "Any"}
              </Text>
              <Text style={styles.detailText}>
                <Text style={styles.detailLabel}>Transmission: </Text>
                {item.transmission || "Any"}
              </Text>
            </>
          )}
        </View>
        <View style={styles.requestStats}>
          <View style={styles.requestStatItem}>
            <Text style={styles.requestStatValue}>
              {isTradeIn ? item.offer_count || 0 : item.bid_count || 0}
            </Text>
            <Text style={styles.requestStatLabel}>Offers</Text>
          </View>
          {!isTradeIn && (
            <View style={styles.requestStatItem}>
              <Text style={styles.requestStatValue}>
                {item.lowest_offer ? item.lowest_offer.toLocaleString() : "N/A"}
              </Text>
              <Text style={styles.requestStatLabel}>Lowest</Text>
            </View>
          )}
        </View>
      </View>

      <Text style={styles.itemNotes} numberOfLines={2}>
        {isTradeIn ? item.comments || "No trade-in notes." : item.notes || item.message}
      </Text>
    </Pressable>
  );
};

const QuestionItem = ({
  item,
  onAnswer,
}: {
  item: RequestQuestion;
  onAnswer: (question: RequestQuestion) => void;
}) => {
  return (
    <View style={styles.itemCard}>
      <View style={styles.requestCardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemTitle}>
            {item.request_title || "Customer Request"}
          </Text>
          <Text style={styles.itemSubtitle}>
            {item.bid_vehicle || "Your offer"}
            {item.bid_price ? ` - ${item.bid_price.toLocaleString()} ETB` : ""}
          </Text>
        </View>
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>QUESTION</Text>
        </View>
      </View>
      <Text style={styles.itemNotes}>{item.question_text}</Text>
      <View style={styles.questionFooter}>
        <Text style={styles.detailText}>
          {item.buyer?.username ? `From ${item.buyer.username}` : "Buyer question"}
        </Text>
        <Pressable style={styles.answerButton} onPress={() => onAnswer(item)}>
          <Ionicons name="return-up-forward" size={18} color="white" />
          <Text style={styles.answerButtonText}>Answer</Text>
        </Pressable>
      </View>
    </View>
  );
};

const DashboardSection = <T,>({
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

const DealerDashboard = () => {
  const { width } = useWindowDimensions();
  const { tab } = useLocalSearchParams();
  const requestedTab = getSingleParam(tab);
  const { token, user, isLoading } = useAuth() as any;
  const { socket } = useSocket();
  const hasRedirectedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [pendingListings, setPendingListings] = useState<Listing[]>([]);
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [questions, setQuestions] = useState<RequestQuestion[]>([]);
  const [activeTab, setActiveTab] = useState<DealerDashboardTab>("requests");
  const [selectedQuestion, setSelectedQuestion] =
    useState<RequestQuestion | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [answerSubmitting, setAnswerSubmitting] = useState(false);
  const isWideWeb = Platform.OS === "web" && width >= 1000;

  useEffect(() => {
    if (!isLoading && !token && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      router.replace(LOGIN_ROUTE);
    }
  }, [isLoading, token]);

  useEffect(() => {
    if (
      requestedTab &&
      DEALER_DASHBOARD_TABS.includes(requestedTab as DealerDashboardTab)
    ) {
      setActiveTab(requestedTab as DealerDashboardTab);
    }
  }, [requestedTab]);

  useEffect(() => {
    if (!socket) return;

    const handleRequestUpdated = (data: {
      request_id: number;
      bid_count?: number;
      lowest_offer?: number;
    }) => {
      setRequests((prevRequests) =>
        prevRequests.map((req) =>
          req.type !== "trade-in"
            && req.id === data.request_id
            && req.bid_count === data.bid_count
            && req.lowest_offer === data.lowest_offer
            ? req
            : req.type !== "trade-in" && req.id === data.request_id
            ? {
                ...req,
                bid_count: data.bid_count,
                lowest_offer: data.lowest_offer,
              }
            : req
        )
      );
    };

    // Listen for entirely new customer requests
    const handleNewCustomerRequest = (newRequest: CustomerRequest) => {
      setRequests((prevRequests) => {
        if (
          prevRequests.some(
            (req) => req.type !== "trade-in" && req.id === newRequest.id
          )
        ) {
          return prevRequests;
        }

        return [newRequest, ...prevRequests];
      });
    };

    socket.on("request_updated", handleRequestUpdated);
    socket.on("new_customer_request", handleNewCustomerRequest);

    return () => {
      socket.off("request_updated", handleRequestUpdated);
      socket.off("new_customer_request", handleNewCustomerRequest);
    };
  }, [socket]);

  const fetchData = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const [response, activeTradeInsResponse] = await Promise.all([
        getDealerDashboard(),
        getActiveTradeIns().catch(() => ({ data: { requests: [] } })),
      ]);
      const data = response.data;
      const activeTradeIns: CustomerRequest[] = (
        activeTradeInsResponse.data.requests || []
      ).map((req: any) => ({
        id: req.id,
        type: "trade-in",
        make: req.make,
        model: req.model,
        year: req.year,
        mileage: req.mileage,
        condition: req.condition,
        target_car: req.target_car,
        comments: req.comments,
        created_at: req.created_at,
        offer_count: req.offer_count || 0,
        has_been_viewed: true,
        image_urls: (req.photos || [])
          .map((photo: { image_url?: string }) =>
            photo.image_url ? mediaUrl(photo.image_url) : ""
          )
          .filter(Boolean),
      }));

      // Construct stats from the lengths of the returned arrays
      const newStats: DashboardStats = {
        points: data.user_points ?? 0,
        active_listings_count: (data.my_cars || []).filter(
          (c: Listing) => c.is_active && c.is_approved
        ).length,
        new_requests_count: (data.requests || []).length + activeTradeIns.length,
        unanswered_questions_count: (data.unanswered_request_questions || [])
          .length,
        pending_approval_count: data.pending_approval_count ?? 0,
      };

      setStats(newStats);
      const allCars = data.my_cars || [];
      setListings(allCars.filter((c: Listing) => c.is_approved));
      setPendingListings(allCars.filter((c: Listing) => !c.is_approved));
      // Sort requests by creation date, newest first
      const sortedRequests = [...(data.requests || []), ...activeTradeIns].sort(
        (a: CustomerRequest, b: CustomerRequest) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setRequests(sortedRequests);
      setQuestions(data.unanswered_request_questions || []);
    } catch (error) {
      console.error("Failed to fetch dealer dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [fetchData, token]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const openAnswerModal = (question: RequestQuestion) => {
    setSelectedQuestion(question);
    setAnswerText("");
  };

  const closeAnswerModal = () => {
    if (answerSubmitting) return;
    setSelectedQuestion(null);
    setAnswerText("");
  };

  const submitAnswer = async () => {
    const trimmed = answerText.trim();
    if (!selectedQuestion || trimmed.length < 2) {
      Alert.alert("Answer Required", "Please enter an answer for the buyer.");
      return;
    }

    try {
      setAnswerSubmitting(true);
      await answerDealerRequestQuestion(selectedQuestion.id, trimmed);
      setQuestions((current) =>
        current.filter((question) => question.id !== selectedQuestion.id)
      );
      setStats((current) =>
        current
          ? {
              ...current,
              unanswered_questions_count: Math.max(
                (current.unanswered_questions_count || 1) - 1,
                0
              ),
            }
          : current
      );
      closeAnswerModal();
      Alert.alert("Answer Sent", "The buyer has been notified.");
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.userMessage ||
        "Could not send your answer.";
      Alert.alert("Answer Failed", message);
    } finally {
      setAnswerSubmitting(false);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" style={styles.centered} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={[styles.pageShell, isWideWeb && styles.pageShellWide]}>
          <View style={[styles.header, isWideWeb && styles.headerWide]}>
            <View>
              <Text style={styles.headerTitle}>Dealer Dashboard</Text>
              <Text style={styles.headerSubtitle}>
                Welcome back, {user?.username}!
              </Text>
            </View>
            <Pressable
              style={styles.headerButton}
              onPress={() => router.push(DEALER_ROUTES.submit as any)}
            >
              <Ionicons
                name="add-circle-outline"
                size={24}
                color={COLORS.accent}
              />
              <Text style={styles.headerButtonText}>List New Car</Text>
            </Pressable>
          </View>

        {stats && (
          <View style={[styles.statsGrid, isWideWeb && styles.statsGridWide]}>
            <StatCard
              label="Your Points"
              value={stats.points ?? 0}
              onPress={() => router.push(DEALER_ROUTES.points as any)}
            />
            <StatCard
              label="Active Listings"
              value={stats.active_listings_count ?? 0}
            />
            <StatCard
              label="New Requests"
              value={stats.new_requests_count ?? 0}
            />
            <StatCard
              label="Pending"
              value={stats.pending_approval_count ?? 0}
            />
            <StatCard
              label="Unanswered"
              value={stats.unanswered_questions_count ?? 0}
              onPress={() => setActiveTab("questions")}
              pulse={(stats.unanswered_questions_count ?? 0) > 0}
            />
          </View>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.tabScrollView, isWideWeb && styles.tabScrollViewWide]}
          contentContainerStyle={[
            styles.tabContainer,
            isWideWeb && styles.tabContainerWide,
          ]}
        >
          <Pressable
            style={[styles.tab, activeTab === "requests" && styles.activeTab]}
            onPress={() => setActiveTab("requests")}
          >
            <Text style={styles.tabText}>Customer Requests</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === "listings" && styles.activeTab]}
            onPress={() => setActiveTab("listings")}
          >
            <Text style={styles.tabText}>Live Listings</Text>
          </Pressable>

          <Pressable
            style={[styles.tab, activeTab === "pending" && styles.activeTab]}
            onPress={() => setActiveTab("pending")}
          >
            <Text style={styles.tabText}>Pending Approval</Text>
          </Pressable>

          <Pressable
            style={[styles.tab, activeTab === "questions" && styles.activeTab]}
            onPress={() => setActiveTab("questions")}
          >
            <Text style={styles.tabText}>Questions</Text>
          </Pressable>
        </ScrollView>

        {activeTab === "listings" && (
          <DashboardSection
            data={listings}
            emptyText="You have no approved listings yet."
            renderItem={(item) => <ListingItem key={item.id} item={item} />}
          />
        )}

        {activeTab === "requests" && (
          <DashboardSection
            data={requests}
            emptyText="No customer requests found."
            renderItem={(item) => (
              <RequestItem
                key={`${item.type || "buy"}-${item.id}`}
                item={item}
              />
            )}
          />
        )}

        {activeTab === "pending" && (
          <DashboardSection
            data={pendingListings}
            emptyText="No listings are pending approval."
            renderItem={(item) => <ListingItem key={item.id} item={item} />}
          />
        )}

        {activeTab === "questions" && (
          <DashboardSection
            data={questions}
            emptyText="No unanswered buyer questions."
            renderItem={(item) => (
              <QuestionItem key={item.id} item={item} onAnswer={openAnswerModal} />
            )}
          />
        )}
          </View>
      </ScrollView>

      <Modal
        transparent
        animationType="fade"
        visible={!!selectedQuestion}
        onRequestClose={closeAnswerModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.answerModal}>
            <Text style={styles.modalTitle}>Answer Buyer Question</Text>
            <Text style={styles.modalQuestion}>
              {selectedQuestion?.question_text}
            </Text>
            <TextInput
              style={styles.answerInput}
              value={answerText}
              onChangeText={setAnswerText}
              placeholder="Type your answer..."
              placeholderTextColor={COLORS.textSecondary}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={closeAnswerModal}
                disabled={answerSubmitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.submitAnswerButton]}
                onPress={submitAnswer}
                disabled={answerSubmitting}
              >
                {answerSubmitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.submitAnswerText}>Send Answer</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  pageShell: { width: "100%" },
  pageShellWide: {
    maxWidth: 1280,
    alignSelf: "center",
    paddingHorizontal: 28,
    paddingTop: 28,
  },
  header: {
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerWide: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 24,
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: COLORS.text },
  headerSubtitle: { fontSize: 16, color: COLORS.textSecondary, marginTop: 4 },
  headerButton: { flexDirection: "row", alignItems: "center", gap: 5 },
  headerButtonText: { color: COLORS.accent, fontSize: 16 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  statsGridWide: {
    paddingHorizontal: 0,
    gap: 14,
    marginBottom: 28,
  },
  statCard: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    paddingVertical: 15,
    paddingHorizontal: 5, // Adjust horizontal padding for smaller text
    borderRadius: 10,
    width: "32%", // Allow 3 cards per row with some space
    marginBottom: 10, // Add space between rows
  },
  statCardWide: {
    flex: 1,
    width: "auto",
    minHeight: 96,
    justifyContent: "center",
  },
  pulsingStatCard: {
    borderWidth: 1,
    borderColor: COLORS.warning,
    backgroundColor: "#27251C",
  },
  statValue: { fontSize: 20, fontWeight: "bold", color: COLORS.accent },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 5,
    textAlign: "center",
  },
  tabScrollView: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.card,
  },
  tabScrollViewWide: {
    marginHorizontal: 0,
  },
  tabContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  tabContainerWide: {
    width: "100%",
  },
  tab: { paddingVertical: 10, paddingHorizontal: 20 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: COLORS.accent },
  tabText: { color: COLORS.text, fontSize: 16 },
  itemCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 15,
    borderRadius: 8,
  },
  itemTitle: { fontSize: 16, fontWeight: "bold", color: COLORS.text },
  itemSubtitle: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4 },
  itemNotes: { color: COLORS.textSecondary, marginTop: 8 },
  statusContainer: { flexDirection: "row", gap: 8, marginTop: 10 },
  statusTag: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: "hidden",
  },
  approved: { backgroundColor: COLORS.success, color: "white" },
  pending: { backgroundColor: COLORS.warning, color: "black" },
  active: { backgroundColor: "rgba(40, 167, 69, 0.3)", color: COLORS.success },
  inactive: {
    backgroundColor: "rgba(138, 148, 163, 0.3)",
    color: COLORS.textSecondary,
  },
  viewChatButton: {
    backgroundColor: "rgba(138, 148, 163, 0.5)",
    alignSelf: "flex-start",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 12,
  },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 30,
  },
  sectionList: {
    paddingBottom: 12,
  },
  requestCardHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "flex-start",
    marginBottom: 12,
  },
  requestTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.textSecondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  imageRequestBadge: {
    backgroundColor: COLORS.accent,
  },
  tradeInRequestBadge: {
    backgroundColor: COLORS.success,
  },
  requestTypeBadgeText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 11,
  },
  requestImageStrip: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  requestImageThumb: {
    width: 72,
    height: 54,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  requestImage: {
    width: "100%",
    height: "100%",
  },
  newBadge: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  newBadgeText: {
    color: "black",
    fontWeight: "bold",
    fontSize: 12,
  },
  scoreBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  scoreText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  requestCardBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
  },
  requestDetails: {
    flex: 1,
  },
  detailText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 4,
  },
  detailLabel: {
    color: COLORS.text,
    fontWeight: "600",
  },
  requestStats: {
    flexDirection: "row",
    gap: 15,
    alignItems: "center",
  },
  requestStatItem: {
    alignItems: "center",
  },
  requestStatValue: {
    color: COLORS.accent,
    fontSize: 18,
    fontWeight: "bold",
  },
  requestStatLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  questionFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
  },
  answerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 6,
  },
  answerButtonText: {
    color: "white",
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    padding: 20,
  },
  answerModal: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },
  modalQuestion: {
    color: COLORS.textSecondary,
    marginBottom: 14,
    lineHeight: 20,
  },
  answerInput: {
    minHeight: 120,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    color: COLORS.text,
    padding: 12,
    backgroundColor: COLORS.background,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
  },
  modalButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    color: COLORS.text,
    fontWeight: "600",
  },
  submitAnswerButton: {
    backgroundColor: COLORS.accent,
    minWidth: 120,
  },
  submitAnswerText: {
    color: "white",
    fontWeight: "700",
  },
});

export default DealerDashboard;
