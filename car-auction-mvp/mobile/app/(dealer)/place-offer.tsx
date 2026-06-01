import React, { useRef, useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, useNavigation, router } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { mediaUrl } from "@/lib/api/client";
import {
  getDealerRequestBids,
  placeDealerBid,
  updateDealerBid,
  watchDealerRequestCompetition,
} from "@/lib/api/dealer";
import { DEALER_ROUTES } from "@/lib/roleRoutes";
import { showNativeFlowAlert } from "@/lib/nativeFlowAlert";
import { isWebRuntime, replaceWebRoute } from "@/lib/webRouteReset";

interface CustomerRequest {
  id: number;
  make: string;
  model: string;
  year?: number;
  min_year?: number;
  min_price?: number;
  max_mileage?: number;
  max_price?: number;
  condition?: string;
  transmission?: string;
  fuel_type?: string;
  message?: string;
  notes?: string;
  request_source?: "image_based" | "specific" | "general";
  image_urls?: string[];
  target_car?: {
    make?: string;
    model?: string;
    year?: number;
    condition?: string;
    mileage?: number;
    fixed_price?: number;
  } | null;
  lead_quality?: {
    score: number;
    label: string;
    reasons?: string[];
    age_days?: number;
  };
  dealer_match?: {
    score: number;
    label: string;
    reasons?: string[];
  };
  response_health?: {
    label: string;
    offer_count: number;
    first_response_minutes?: number | null;
    unanswered_questions?: number;
    reasons?: string[];
  };
  expiry_risk?: {
    score: number;
    label: string;
    reasons?: string[];
    valid_offer_count?: number;
    expired_offer_count?: number;
  };
  intent_verification?: {
    score: number;
    level: string;
    reasons?: string[];
  };
}

interface DealerBid {
  id: number;
  dealer_id: number;
  price: number;
  price_with_loan?: number;
  make: string;
  model: string;
  car_year: number;
  condition: string;
  valid_until: string;
  image_url?: string;
  image_urls?: string[];
  timestamp: string;
  free_edit_expires_at?: string;
  can_edit_free?: boolean;
  free_edit_seconds_remaining?: number;
  mileage?: number;
  availability?: string;
  message?: string;
  price_position?: {
    label: string;
    sample_count: number;
    average_price?: number | null;
    difference_percent?: number | null;
    is_below_market?: boolean;
    is_above_market?: boolean;
  };
  offer_explanation?: {
    primary_label?: string;
    labels?: string[];
    reasons?: string[];
  };
  pipeline?: {
    stage: string;
    buyer_viewed_at?: string | null;
    follow_up_due?: boolean;
  } | null;
}

interface DealerPointRules {
  competition_watch_active?: boolean;
  competition_watch_cost?: number;
}

const COLORS = {
  background: "#14181F",
  card: "#1C212B",
  text: "#F8F8F8",
  textSecondary: "#8A94A3",
  accent: "#A370F7",
  input: "#14181F",
  border: "#313843",
};

const webDateInputStyle = {
  backgroundColor: COLORS.input,
  color: COLORS.text,
  padding: "12px",
  borderRadius: 8,
  border: `1px solid ${COLORS.border}`,
  fontSize: 16,
  height: 50,
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
  fontFamily: "inherit",
  lineHeight: "24px",
  outline: "none",
  appearance: "none",
  WebkitAppearance: "none",
} as const;

interface PickerOption {
  label: string;
  value: string;
}

interface CustomPickerProps {
  options: PickerOption[];
  selectedValue: string;
  onValueChange: (value: string) => void;
}

const CustomPicker = ({
  options,
  selectedValue,
  onValueChange,
}: CustomPickerProps) => {
  const [modalVisible, setModalVisible] = useState(false);
  const selectedLabel =
    options.find((opt) => opt.value === selectedValue)?.label || "";

  const handleSelect = (value: string) => {
    onValueChange(value);
    setModalVisible(false);
  };

  return (
    <>
      <Pressable
        style={styles.pickerInput}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.pickerInputText}>{selectedLabel}</Text>
        <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
      </Pressable>
      <Modal
        transparent={true}
        visible={modalVisible}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            {options.map((option) => (
              <Pressable
                key={option.value}
                style={styles.modalOption}
                onPress={() => handleSelect(option.value)}
              >
                <Text style={styles.modalOptionText}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

const parseGuidedNotes = (notes: string) => {
  if (
    !notes ||
    !notes.includes(
      "Customer is looking for a car with the following preferences:"
    )
  ) {
    return null;
  }
  const result: any = {};
  const lines = notes.split("\n");
  lines.forEach((line) => {
    if (line.includes("- Budget:"))
      result.budget = line.split("- Budget:")[1].trim();
    if (line.includes("- Body Type:"))
      result.bodyType = line.split("- Body Type:")[1].trim();
    if (line.includes("- Fuel Type:"))
      result.fuelType = line.split("- Fuel Type:")[1].trim();
    if (line.includes("- Important Features:"))
      result.features = line.split("- Important Features:")[1].trim();
  });
  return result;
};

const PlaceOfferScreen = () => {
  const { width } = useWindowDimensions();
  const { request_id } = useLocalSearchParams<{ request_id: string }>();
  const navigation = useNavigation();
  const { token, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [requestDetails, setRequestDetails] = useState<CustomerRequest | null>(
    null
  );
  const [existingBids, setExistingBids] = useState<DealerBid[]>([]);
  const [pointRules, setPointRules] = useState<DealerPointRules | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWatchingCompetition, setIsWatchingCompetition] = useState(false);
  const [editingBid, setEditingBid] = useState<DealerBid | null>(null);
  const isWideWeb = Platform.OS === "web" && width >= 1000;
  const scrollRef = useRef<ScrollView>(null);

  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [carYear, setCarYear] = useState("");
  const [condition, setCondition] = useState("New");
  const [mileage, setMileage] = useState("");
  const [price, setPrice] = useState("");
  const [priceWithLoan, setPriceWithLoan] = useState("");
  const [availability, setAvailability] = useState("In Stock");
  const [validUntil, setValidUntil] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [message, setMessage] = useState("");
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const seededRequestIdRef = useRef<number | null>(null);

  useEffect(() => {
    const fetchRequestDetails = async () => {
      if (!token || !request_id) return;
      setLoading(true);
      try {
        const response = await getDealerRequestBids(request_id);
        setRequestDetails(response.data.car_request);
        setExistingBids(response.data.existing_bids || []);
        setPointRules(response.data.car_request?.point_rules || null);
      } catch (error) {
        console.error("Failed to fetch request details:", error);
        Alert.alert("Error", "Could not load request details.");
      } finally {
        setLoading(false);
      }
    };
    fetchRequestDetails();
  }, [request_id, token]);

  useEffect(() => {
    if (!requestDetails) return;
    if (seededRequestIdRef.current === requestDetails.id) return;
    seededRequestIdRef.current = requestDetails.id;

    const targetCar = requestDetails.target_car;
    const requestedCondition =
      targetCar?.condition || requestDetails.condition || condition;
    const requestedMileage = targetCar?.mileage || requestDetails.max_mileage;
    const requestedPrice = targetCar?.fixed_price || requestDetails.max_price;

    setMake(targetCar?.make || requestDetails.make || "");
    setModel(targetCar?.model || requestDetails.model || "");
    setCarYear(
      String(targetCar?.year || requestDetails.min_year || requestDetails.year || "")
    );
    setCondition(
      requestedCondition ||
        (requestedMileage && Number(requestedMileage) > 0 ? "Used" : "New")
    );
    setMileage(requestedMileage ? String(requestedMileage) : "");
    setPrice(requestedPrice ? String(Math.round(requestedPrice)) : "");
  }, [requestDetails]);

  const validUntilValue = validUntil.toISOString().split("T")[0];

  const isBidInEditWindow = (bid: DealerBid) => {
    if (typeof bid.free_edit_seconds_remaining === "number") {
      return bid.free_edit_seconds_remaining > 0;
    }
    if (typeof bid.can_edit_free === "boolean") {
      return bid.can_edit_free;
    }
    if (!bid.free_edit_expires_at) return false;
    const expiresAt = new Date(bid.free_edit_expires_at).getTime();
    return Number.isFinite(expiresAt) && Date.now() <= expiresAt;
  };

  const formatEditWindowRemaining = (seconds?: number) => {
    if (typeof seconds !== "number" || seconds <= 0) {
      return "Free edits are available for 5 minutes after sending.";
    }

    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    if (minutes <= 0) {
      return `Free edit expires in ${remainder} seconds.`;
    }
    return `Free edit expires in ${minutes} min ${remainder
      .toString()
      .padStart(2, "0")} sec.`;
  };

  const isCurrentDealerBid = (bid: DealerBid) =>
    Number(bid.dealer_id) === Number(user?.id);

  const startEditingBid = (bid: DealerBid) => {
    setEditingBid(bid);
    setMake(bid.make || "");
    setModel(bid.model || "");
    setCarYear(String(bid.car_year || ""));
    setCondition(bid.condition || "New");
    setMileage(bid.mileage ? String(bid.mileage) : "");
    setPrice(String(Math.round(bid.price)));
    setPriceWithLoan(
      bid.price_with_loan ? String(Math.round(bid.price_with_loan)) : ""
    );
    setAvailability(bid.availability || "In Stock");
    setMessage(bid.message || "");
    setImage(null);
    const nextValidUntil = new Date(`${bid.valid_until}T12:00:00`);
    if (!Number.isNaN(nextValidUntil.getTime())) {
      setValidUntil(nextValidUntil);
    }
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: true }));
  };

  const handleEditBidPress = (bid: DealerBid) => {
    if (!isBidInEditWindow(bid)) {
      showNativeFlowAlert(
        "Edit Window Expired",
        "Offers can only be edited within 5 minutes after they are submitted."
      );
      return;
    }

    startEditingBid(bid);
  };

  const cancelEditingBid = () => {
    setEditingBid(null);
    setImage(null);
  };

  const handleSubmit = async () => {
    const missingFields = [
      !make.trim() ? "Make" : null,
      !model.trim() ? "Model" : null,
      !carYear.trim() ? "Year" : null,
      condition === "Used" && !mileage.trim() ? "Mileage" : null,
      !price.trim() ? "Price" : null,
      !validUntilValue ? "Offer valid until" : null,
    ].filter(Boolean);

    if (missingFields.length > 0) {
      showNativeFlowAlert(
        "Missing Required Details",
        `Please fill in: ${missingFields.join(", ")}.`
      );
      return;
    }

    setIsSubmitting(true);

    // Prepare the payload
    const payload: any = {
      price: parseFloat(price),
      make,
      model,
      car_year: parseInt(carYear),
      condition,
      mileage: mileage ? parseInt(mileage) : null,
      price_with_loan: priceWithLoan ? parseFloat(priceWithLoan) : null,
      availability,
      valid_until: validUntil.toISOString().split("T")[0], // Format as YYYY-MM-DD
      message,
    };

    if (image && image.base64) {
      payload.image_base64 = image.base64;
    }

    try {
      if (editingBid) {
        const response = await updateDealerBid(editingBid.id, payload);
        setExistingBids((current) =>
          current.map((bid) =>
            bid.id === editingBid.id
              ? { ...bid, ...response.data.bid }
              : bid
          )
        );
        setEditingBid(null);
        setImage(null);
        showNativeFlowAlert(
          "Offer Updated",
          "Your offer has been updated successfully."
        );
        return;
      }

      const response = await placeDealerBid(request_id, payload);
      if (response.data?.bid) {
        setExistingBids((current) => [response.data.bid, ...current]);
      }
      if (response.data?.point_rules) {
        setPointRules(response.data.point_rules);
      }

      if (isWebRuntime()) {
        showNativeFlowAlert(
          "Success",
          "Your offer has been placed successfully.",
          () => {
            replaceWebRoute(DEALER_ROUTES.dashboard);
          }
        );
        return;
      }

      showNativeFlowAlert(
        "Success",
        "Your offer has been placed successfully.",
        () => {
          navigation.goBack();
        }
      );
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.userMessage ||
        "Failed to place offer.";
      showNativeFlowAlert("Offer Failed", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWatchCompetition = async () => {
    if (!request_id || isWatchingCompetition) return;
    setIsWatchingCompetition(true);
    try {
      const response = await watchDealerRequestCompetition(request_id);
      if (response.data?.point_rules) {
        setPointRules(response.data.point_rules);
      } else {
        setPointRules((current) => ({
          ...(current || {}),
          competition_watch_active: true,
        }));
      }
      showNativeFlowAlert(
        "Competition Watch Active",
        response.data?.message ||
          "You will be notified when another dealer submits an offer on this request."
      );
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.userMessage ||
        "Could not activate competition watch.";
      showNativeFlowAlert("Watch Failed", message);
    } finally {
      setIsWatchingCompetition(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    // Always hide the picker first. This is important for iOS dismissal.
    setShowDatePicker(false);

    // Only update the date if a new one was selected
    const currentDate = selectedDate || validUntil;
    setShowDatePicker(false);
    setValidUntil(currentDate);
  };

  const handleWebDateChange = (value: string) => {
    if (!value) return;
    const nextDate = new Date(`${value}T12:00:00`);
    if (!Number.isNaN(nextDate.getTime())) {
      setValidUntil(nextDate);
    }
  };

  const handleImagePick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Sorry, we need camera roll permissions to make this work!"
      );
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false, // Only one image for the bid
      quality: 0.7, // Reduce quality to manage base64 size
      base64: true, // Request base64 data
    });
    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const guidedData = React.useMemo(() => {
    if (!requestDetails) return null;
    return parseGuidedNotes(
      requestDetails.notes || requestDetails.message || ""
    );
  }, [requestDetails]);

  const getInsightColor = (score?: number) => {
    if ((score || 0) >= 80) return "#31D0AA";
    if ((score || 0) >= 50) return "#ffc107";
    return COLORS.textSecondary;
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  const cheapestBidId =
    existingBids.length > 0
      ? existingBids.reduce((lowest, bid) =>
          bid.price < lowest.price ? bid : lowest
        ).id
      : null;
  const ownBid = existingBids
    .filter(isCurrentDealerBid)
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime() ||
        b.id - a.id
    )[0];
  const competitionWatchActive = Boolean(pointRules?.competition_watch_active);
  const competitionWatchCost = pointRules?.competition_watch_cost ?? 1;
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Place Offer</Text>
          <Text style={styles.headerSubtitle}>
            For Request #{requestDetails?.id}
          </Text>
        </View>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={COLORS.textSecondary} />
        </Pressable>
      </View>

      <ScrollView ref={scrollRef}>
        <View style={[styles.contentGrid, isWideWeb && styles.contentGridWide]}>
          <View style={[styles.formColumn, isWideWeb && styles.formColumnWide]}>
            {ownBid && !editingBid && (
              <View style={styles.editPromptCard}>
                <View style={styles.editPromptIcon}>
                  <Ionicons
                    name="create-outline"
                    size={22}
                    color={COLORS.accent}
                  />
                </View>
                <View style={styles.editPromptBody}>
                  <Text style={styles.editPromptTitle}>
                    Edit your submitted offer
                  </Text>
                  <Text style={styles.editPromptText}>
                    {isBidInEditWindow(ownBid)
                      ? formatEditWindowRemaining(
                          ownBid.free_edit_seconds_remaining
                        )
                      : "If the free edit window has passed, the server will block the update."}
                  </Text>
                </View>
                <Pressable
                  style={styles.editPromptButton}
                  onPress={() => handleEditBidPress(ownBid)}
                >
                  <Text style={styles.editPromptButtonText}>Edit</Text>
                </Pressable>
              </View>
            )}

            <View style={styles.formCard}>
              <View style={styles.formHeaderRow}>
                <Text style={styles.sectionTitle}>
                  {editingBid ? "Edit Your Offer" : "Your Offer Details"}
                </Text>
                {editingBid && (
                  <Pressable onPress={cancelEditingBid}>
                    <Text style={styles.cancelEditText}>Cancel</Text>
                  </Pressable>
                )}
              </View>
              {editingBid && (
                <View style={styles.editWindowBanner}>
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={COLORS.accent}
                  />
                  <Text style={styles.editWindowText}>
                    Free edits are available for 5 minutes after sending.
                  </Text>
                </View>
              )}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Make</Text>
                <TextInput
                  style={styles.input}
                  value={make}
                  onChangeText={setMake}
                  placeholder="e.g., Toyota"
                  placeholderTextColor={COLORS.textSecondary}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Model</Text>
                <TextInput
                  style={styles.input}
                  value={model}
                  onChangeText={setModel}
                  placeholder="e.g., Vitz"
                  placeholderTextColor={COLORS.textSecondary}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Year</Text>
                <TextInput
                  style={styles.input}
                  value={carYear}
                  onChangeText={setCarYear}
                  placeholder="e.g., 2018"
                  keyboardType="number-pad"
                  placeholderTextColor={COLORS.textSecondary}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Condition</Text>
                <CustomPicker
                  selectedValue={condition}
                  onValueChange={setCondition}
                  options={[
                    { label: "New", value: "New" },
                    { label: "Used", value: "Used" },
                  ]}
                />
              </View>
              {condition === "Used" && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Mileage (km)</Text>
                  <TextInput
                    style={styles.input}
                    value={mileage}
                    onChangeText={setMileage}
                    placeholder="e.g., 50000"
                    keyboardType="number-pad"
                    placeholderTextColor={COLORS.textSecondary}
                  />
                </View>
              )}
            </View>

            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Pricing & Availability</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Price (ETB)</Text>
                <TextInput
                  style={styles.input}
                  value={price}
                  onChangeText={setPrice}
                  placeholder="e.g., 2,500,000"
                  keyboardType="number-pad"
                  placeholderTextColor={COLORS.textSecondary}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Price with Loan (ETB)</Text>
                <TextInput
                  style={styles.input}
                  value={priceWithLoan}
                  onChangeText={setPriceWithLoan}
                  placeholder="Optional"
                  keyboardType="number-pad"
                  placeholderTextColor={COLORS.textSecondary}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Availability</Text>
                <CustomPicker
                  selectedValue={availability}
                  onValueChange={setAvailability}
                  options={[
                    { label: "In Stock", value: "In Stock" },
                    {
                      label: "Available on Order",
                      value: "Available on Order",
                    },
                  ]}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Offer Valid Until</Text>
                {Platform.OS === "web" ? (
                  React.createElement("input", {
                    type: "date",
                    value: validUntilValue,
                    min: new Date().toISOString().split("T")[0],
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                      handleWebDateChange(event.target.value),
                    style: webDateInputStyle,
                  })
                ) : (
                  <>
                    <Pressable
                      style={styles.dateInput}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text style={styles.dateInputText}>
                        {validUntil.toLocaleDateString()}
                      </Text>
                      <Ionicons
                        name="calendar-outline"
                        size={20}
                        color={COLORS.textSecondary}
                      />
                    </Pressable>
                    {showDatePicker && (
                      <DateTimePicker
                        value={validUntil}
                        mode="date"
                        display="default"
                        onChange={onDateChange}
                        minimumDate={new Date()}
                      />
                    )}
                  </>
                )}
              </View>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Additional Information</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Message to Customer</Text>
                <TextInput
                  style={[
                    styles.input,
                    { height: 100, textAlignVertical: "top" },
                  ]}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  placeholder="Add a short message..."
                  placeholderTextColor={COLORS.textSecondary}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Car Photo (Optional)</Text>
                {image && (
                  <Image source={{ uri: image.uri }} style={styles.thumbnail} />
                )}
                <Pressable
                  style={styles.imagePickerButton}
                  onPress={handleImagePick}
                >
                  <Ionicons name="camera" size={20} color={COLORS.accent} />
                  <Text style={styles.imagePickerText}>
                    {image ? "Change Photo" : "Select Photo"}
                  </Text>
                </Pressable>
              </View>
            </View>

            <TouchableOpacity
              testID="place-offer-submit"
              accessibilityRole="button"
              style={[
                styles.submitButton,
                isSubmitting && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="white" />
                  <Text style={styles.submitButtonText}>
                    {editingBid ? "Update Offer" : "Place an Offer"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.sidebarColumn,
              styles.requestSummaryColumn,
              isWideWeb && styles.sidebarColumnWide,
            ]}
          >
            {requestDetails && (
              <View style={styles.formCard}>
                <Text style={styles.sectionTitle}>Customer Request</Text>
                {requestDetails.request_source === "image_based" && (
                  <View style={styles.sourceBadge}>
                    <Ionicons name="image" size={14} color="white" />
                    <Text style={styles.sourceBadgeText}>Image Based Request</Text>
                  </View>
                )}
                <Text style={styles.requestTitle}>
                  {requestDetails.make || "Any Make"}{" "}
                  {requestDetails.model || ""}
                </Text>
                <Text style={styles.requestSubtitle}>
                  Year:{" "}
                  {requestDetails.min_year || requestDetails.year
                    ? `${requestDetails.min_year || requestDetails.year}+`
                    : "Any"}
                </Text>

                {(requestDetails.lead_quality ||
                  requestDetails.dealer_match ||
                  requestDetails.intent_verification ||
                  requestDetails.response_health ||
                  requestDetails.expiry_risk) && (
                  <View style={styles.insightPanel}>
                    {requestDetails.intent_verification && (
                      <View style={styles.insightBlock}>
                        <View style={styles.insightHeader}>
                          <Ionicons
                            name="checkmark-done-circle-outline"
                            size={16}
                            color={getInsightColor(
                              requestDetails.intent_verification.score
                            )}
                          />
                          <Text style={styles.insightTitle}>Buyer intent</Text>
                          <Text
                            style={[
                              styles.insightScore,
                              {
                                color: getInsightColor(
                                  requestDetails.intent_verification.score
                                ),
                              },
                            ]}
                          >
                            {requestDetails.intent_verification.score}
                          </Text>
                        </View>
                        <Text style={styles.insightText}>
                          {requestDetails.intent_verification.level
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (letter) =>
                              letter.toUpperCase()
                            )}
                          {requestDetails.intent_verification.reasons?.length
                            ? `: ${requestDetails.intent_verification.reasons.join(
                                ", "
                              )}`
                            : ""}
                        </Text>
                      </View>
                    )}
                    {requestDetails.lead_quality && (
                      <View style={styles.insightBlock}>
                        <View style={styles.insightHeader}>
                          <Ionicons
                            name="flame-outline"
                            size={16}
                            color={getInsightColor(requestDetails.lead_quality.score)}
                          />
                          <Text style={styles.insightTitle}>Lead quality</Text>
                          <Text
                            style={[
                              styles.insightScore,
                              { color: getInsightColor(requestDetails.lead_quality.score) },
                            ]}
                          >
                            {requestDetails.lead_quality.score}
                          </Text>
                        </View>
                        <Text style={styles.insightText}>
                          {requestDetails.lead_quality.reasons?.join(", ") ||
                            requestDetails.lead_quality.label}
                        </Text>
                      </View>
                    )}
                    {requestDetails.dealer_match && (
                      <View style={styles.insightBlock}>
                        <View style={styles.insightHeader}>
                          <Ionicons
                            name="locate-outline"
                            size={16}
                            color={getInsightColor(requestDetails.dealer_match.score)}
                          />
                          <Text style={styles.insightTitle}>Your fit</Text>
                          <Text
                            style={[
                              styles.insightScore,
                              { color: getInsightColor(requestDetails.dealer_match.score) },
                            ]}
                          >
                            {requestDetails.dealer_match.score}
                          </Text>
                        </View>
                        <Text style={styles.insightText}>
                          {requestDetails.dealer_match.reasons?.join(", ") ||
                            requestDetails.dealer_match.label}
                        </Text>
                      </View>
                    )}
                    {requestDetails.response_health && (
                      <View style={styles.insightBlock}>
                        <View style={styles.insightHeader}>
                          <Ionicons
                            name="pulse-outline"
                            size={16}
                            color={COLORS.accent}
                          />
                          <Text style={styles.insightTitle}>Response health</Text>
                          <Text style={styles.insightScore}>
                            {requestDetails.response_health.offer_count}
                          </Text>
                        </View>
                        <Text style={styles.insightText}>
                          {requestDetails.response_health.reasons?.join(", ") ||
                            requestDetails.response_health.label}
                        </Text>
                      </View>
                    )}
                    {requestDetails.expiry_risk && (
                      <View style={styles.insightBlock}>
                        <View style={styles.insightHeader}>
                          <Ionicons
                            name="timer-outline"
                            size={16}
                            color={getInsightColor(100 - requestDetails.expiry_risk.score)}
                          />
                          <Text style={styles.insightTitle}>Expiry risk</Text>
                          <Text
                            style={[
                              styles.insightScore,
                              { color: getInsightColor(100 - requestDetails.expiry_risk.score) },
                            ]}
                          >
                            {requestDetails.expiry_risk.score}
                          </Text>
                        </View>
                        <Text style={styles.insightText}>
                          {requestDetails.expiry_risk.reasons?.join(", ") ||
                            requestDetails.expiry_risk.label}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {requestDetails.image_urls?.length ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.requestImages}
                  >
                    {requestDetails.image_urls.map((imageUrl, index) => (
                      <Image
                        key={`${imageUrl}-${index}`}
                        source={{ uri: imageUrl }}
                        style={styles.requestImage}
                      />
                    ))}
                  </ScrollView>
                ) : null}

                <View style={styles.requestSection}>
                  <Text style={styles.requestSectionTitle}>Budget</Text>
                  <Text style={styles.requestBudgetValue}>
                    {requestDetails.min_price && requestDetails.max_price
                      ? `${requestDetails.min_price.toLocaleString()} - ${requestDetails.max_price.toLocaleString()} ETB`
                      : guidedData?.budget || "Not Specified"}
                  </Text>
                </View>

                <View style={styles.requestSection}>
                  <Text style={styles.requestSectionTitle}>Specifications</Text>
                  <View style={styles.specsGrid}>
                    <View style={styles.specItem}>
                      <Text style={styles.specLabel}>Condition</Text>
                      <Text style={styles.specValue}>
                        {requestDetails.condition || "Any"}
                      </Text>
                    </View>
                    <View style={styles.specItem}>
                      <Text style={styles.specLabel}>Transmission</Text>
                      <Text style={styles.specValue}>
                        {requestDetails.transmission || "Any"}
                      </Text>
                    </View>
                    <View style={styles.specItem}>
                      <Text style={styles.specLabel}>Fuel Type</Text>
                      <Text style={styles.specValue}>
                        {requestDetails.fuel_type ||
                          guidedData?.fuelType ||
                          "Any"}
                      </Text>
                    </View>
                    <View style={styles.specItem}>
                      <Text style={styles.specLabel}>Body Type</Text>
                      <Text style={styles.specValue}>
                        {guidedData?.bodyType || "Any"}
                      </Text>
                    </View>
                    <View style={styles.specItem}>
                      <Text style={styles.specLabel}>Max Mileage</Text>
                      <Text style={styles.specValue}>
                        {requestDetails.max_mileage
                          ? `${requestDetails.max_mileage.toLocaleString()} km`
                          : "Any"}
                      </Text>
                    </View>
                  </View>
                </View>

                {guidedData?.features && guidedData.features !== "None" && (
                  <View style={styles.requestSection}>
                    <Text style={styles.requestSectionTitle}>
                      Desired Features
                    </Text>
                    <View style={styles.featuresListContainer}>
                      {guidedData.features
                        .split(",")
                        .map((feature: string, index: number) => {
                          const cleanFeature = feature.trim();
                          if (!cleanFeature) return null;
                          const formattedFeature = cleanFeature
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase());
                          return (
                            <Text key={index} style={styles.featureListItem}>
                              • {formattedFeature}
                            </Text>
                          );
                        })}
                    </View>
                  </View>
                )}

                {!guidedData && (
                  <View style={styles.requestSection}>
                    <Text style={styles.requestSectionTitle}>Message</Text>
                    <Text style={styles.requestMessage}>
                      {requestDetails.notes || requestDetails.message || "N/A"}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {ownBid ? (
              <View style={styles.competitionWatchCard}>
                <View style={styles.competitionWatchCopy}>
                  <Text style={styles.competitionWatchTitle}>
                    Competition watch
                  </Text>
                  <Text style={styles.competitionWatchText}>
                    {competitionWatchActive
                      ? "Active. You will be notified when another dealer bids on this request."
                      : `Spend ${competitionWatchCost} point to get notified when another dealer bids on this request.`}
                  </Text>
                </View>
                <Pressable
                  style={[
                    styles.watchButton,
                    competitionWatchActive && styles.watchButtonActive,
                  ]}
                  onPress={handleWatchCompetition}
                  disabled={competitionWatchActive || isWatchingCompetition}
                >
                  {isWatchingCompetition ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Ionicons
                        name={
                          competitionWatchActive
                            ? "notifications"
                            : "notifications-outline"
                        }
                        size={16}
                        color="white"
                      />
                      <Text style={styles.watchButtonText}>
                        {competitionWatchActive ? "Watching" : "Watch"}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            ) : null}

            {existingBids.length > 0 && (
              <View style={styles.formCard}>
                <Text style={styles.sectionTitle}>Previous Offers</Text>
                {existingBids.map((bid) => {
                  const isMyBid = isCurrentDealerBid(bid);
                  const isCheapest = bid.id === cheapestBidId;

                  return (
                    <View
                      key={bid.id}
                      style={[
                        styles.previousBidCard,
                        isMyBid && styles.myBidHighlight,
                        isCheapest && styles.cheapestBidHighlight,
                      ]}
                    >
                      {isMyBid && (
                        <Text style={styles.myBidLabel}>Your Offer</Text>
                      )}
                      {bid.image_url && (
                        <Image
                          source={{ uri: mediaUrl(bid.image_url) || "" }}
                          style={styles.previousBidImage}
                        />
                      )}
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Price:</Text>
                        <Text style={styles.detailValue}>
                          {bid.price.toLocaleString()} ETB
                        </Text>
                      </View>
                      {bid.price_position && (
                        <View style={styles.pricePositionBox}>
                          <Text style={styles.pricePositionTitle}>
                            {bid.price_position.label}
                          </Text>
                          <Text style={styles.pricePositionText}>
                            {bid.price_position.sample_count > 0
                              ? `${bid.price_position.difference_percent ?? 0}% vs ${Math.round(
                                  bid.price_position.average_price || 0
                                ).toLocaleString()} ETB market average`
                              : "Not enough similar offers or listings yet."}
                          </Text>
                        </View>
                      )}
                      {bid.offer_explanation && (
                        <View style={styles.pricePositionBox}>
                          <Text style={styles.pricePositionTitle}>
                            {bid.offer_explanation.primary_label ||
                              "Offer insight"}
                          </Text>
                          <Text style={styles.pricePositionText}>
                            {bid.offer_explanation.reasons?.join(", ") ||
                              bid.offer_explanation.labels?.join(", ") ||
                              "This offer is ready for buyer comparison."}
                          </Text>
                        </View>
                      )}
                      {bid.pipeline ? (
                        <View style={styles.pipelineStatusBox}>
                          <Ionicons
                            name={
                              bid.pipeline.follow_up_due
                                ? "alert-circle-outline"
                                : "git-branch-outline"
                            }
                            size={14}
                            color={
                              bid.pipeline.follow_up_due
                                ? "#ffc107"
                                : COLORS.accent
                            }
                          />
                          <Text style={styles.pipelineStatusText}>
                            Pipeline:{" "}
                            {bid.pipeline.stage
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (letter) =>
                                letter.toUpperCase()
                              )}
                          </Text>
                        </View>
                      ) : null}
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Car:</Text>
                        <Text style={styles.detailValue}>
                          {bid.car_year} {bid.make} {bid.model}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Valid Until:</Text>
                        <Text style={styles.detailValue}>
                          {new Date(bid.valid_until).toLocaleDateString()}
                        </Text>
                      </View>
                      {isMyBid && (
                        <Pressable
                          style={styles.editBidButton}
                          onPress={() => handleEditBidPress(bid)}
                        >
                          <Ionicons
                            name="create-outline"
                            size={16}
                            color={COLORS.accent}
                          />
                          <Text style={styles.editBidButtonText}>
                            Edit offer
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  header: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.text },
  headerSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  contentGrid: {
    flexDirection: "column", // Stack columns vertically on mobile
    paddingHorizontal: 10,
    paddingBottom: 24,
  },
  contentGridWide: {
    maxWidth: 1280,
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 24,
    paddingHorizontal: 28,
    paddingTop: 24,
  },
  formColumn: { width: "100%" },
  editPromptCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#201832",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.accent,
    padding: 14,
    marginHorizontal: 10,
    marginTop: 14,
    marginBottom: 14,
    gap: 12,
  },
  editPromptIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(163, 112, 247, 0.16)",
  },
  editPromptBody: {
    flex: 1,
  },
  editPromptTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 3,
  },
  editPromptText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  editPromptButton: {
    minHeight: 38,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.accent,
  },
  editPromptButtonText: {
    color: "white",
    fontWeight: "800",
  },
  formColumnWide: {
    flex: 1,
    width: "auto",
    maxWidth: 760,
  },
  sidebarColumn: { width: "100%", marginTop: 20 },
  sidebarColumnWide: {
    width: 400,
    marginTop: 0,
  },
  requestSummaryColumn: { marginTop: 40 },
  formCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 10,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  competitionWatchCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 10,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(163, 112, 247, 0.35)",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  competitionWatchCopy: {
    flex: 1,
  },
  competitionWatchTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  competitionWatchText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  watchButton: {
    minWidth: 104,
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 12,
  },
  watchButtonActive: {
    backgroundColor: "#31D0AA",
  },
  watchButtonText: {
    color: "white",
    fontWeight: "800",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 15,
  },
  formHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cancelEditText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 15,
  },
  editWindowBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(163, 112, 247, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(163, 112, 247, 0.35)",
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  editWindowText: {
    color: COLORS.textSecondary,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 8 },
  input: {
    backgroundColor: COLORS.input,
    color: COLORS.text,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 16,
  },
  pickerInput: {
    backgroundColor: COLORS.input,
    color: COLORS.text,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 50,
  },
  pickerInputText: {
    color: COLORS.text,
    fontSize: 16,
  },
  dateInput: {
    backgroundColor: COLORS.input,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateInputText: {
    color: COLORS.text,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 10,
    width: "90%",
    maxHeight: "60%",
  },
  modalOption: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalOptionText: {
    color: COLORS.text,
    fontSize: 18,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  detailLabel: { fontSize: 14, color: COLORS.textSecondary },
  detailValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },
  submitButton: {
    backgroundColor: COLORS.accent,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.65,
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: "#14181F",
  },
  imagePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "transparent",
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.accent,
    borderStyle: "dashed",
  },
  imagePickerText: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: "600",
  },
  closeButton: {},
  previousBidCard: {
    backgroundColor: COLORS.input,
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previousBidImage: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
  },
  pricePositionBox: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    marginBottom: 10,
  },
  pricePositionTitle: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 3,
  },
  pricePositionText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  pipelineStatusBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    marginBottom: 10,
  },
  pipelineStatusText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  myBidHighlight: {
    borderColor: COLORS.accent,
    borderWidth: 2,
  },
  cheapestBidHighlight: {
    borderColor: "#28a745", // Success color
    borderWidth: 2,
  },
  myBidLabel: {
    position: "absolute",
    top: -1,
    right: 10,
    backgroundColor: COLORS.accent,
    color: "white",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    fontSize: 12,
    fontWeight: "bold",
  },
  editBidButton: {
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.accent,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  editBidButtonText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: "800",
  },
  requestTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 4,
  },
  requestSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  sourceBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 12,
  },
  sourceBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
  insightPanel: {
    backgroundColor: COLORS.input,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  insightBlock: {
    gap: 5,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  insightTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
    flex: 1,
  },
  insightScore: {
    fontSize: 15,
    fontWeight: "900",
  },
  insightText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  requestImages: {
    marginBottom: 14,
  },
  requestImage: {
    width: 112,
    height: 84,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: COLORS.input,
  },
  requestSection: {
    borderTopWidth: 1,
    borderColor: COLORS.border,
    paddingTop: 12,
    marginTop: 12,
  },
  requestSectionTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  requestBudgetValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.accent,
  },
  specsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  specItem: {
    width: "48%",
    marginBottom: 12,
  },
  specLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  specValue: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "600",
  },
  requestMessage: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
  },
  featuresListContainer: {
    marginTop: 5,
  },
  featureListItem: {
    color: COLORS.text,
    fontSize: 15,
    marginBottom: 4,
    lineHeight: 22,
  },
});

export default PlaceOfferScreen;
