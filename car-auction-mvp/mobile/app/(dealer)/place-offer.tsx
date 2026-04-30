import React, { useState, useEffect } from "react";
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
} from "react-native";
import { useLocalSearchParams, useNavigation, router } from "expo-router";
import axios from "axios";
import { useAuth } from "@/hooks/useAuth";
import API_BASE_URL from "@/constants/Api";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

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
  timestamp: string;
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
  const { request_id } = useLocalSearchParams<{ request_id: string }>();
  const navigation = useNavigation();
  const { token, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [requestDetails, setRequestDetails] = useState<CustomerRequest | null>(
    null
  );
  const [existingBids, setExistingBids] = useState<DealerBid[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [carYear, setCarYear] = useState("");
  const [condition, setCondition] = useState("Used");
  const [mileage, setMileage] = useState("");
  const [price, setPrice] = useState("");
  const [priceWithLoan, setPriceWithLoan] = useState("");
  const [availability, setAvailability] = useState("In Stock");
  const [validUntil, setValidUntil] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [message, setMessage] = useState("");
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);

  useEffect(() => {
    const fetchRequestDetails = async () => {
      if (!token || !request_id) return;
      setLoading(true);
      try {
        const response = await axios.get(
          `${API_BASE_URL}/dealer/api/requests/${request_id}/bids`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setRequestDetails(response.data.car_request);
        setExistingBids(response.data.existing_bids || []);
      } catch (error) {
        console.error("Failed to fetch request details:", error);
        Alert.alert("Error", "Could not load request details.");
      } finally {
        setLoading(false);
      }
    };
    fetchRequestDetails();
  }, [request_id, token]);
  const handleSubmit = async () => {
    if (!price || !make || !model || !carYear) {
      Alert.alert("Error", "Please fill in all required fields.");
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
      await axios.post(
        `${API_BASE_URL}/dealer/api/requests/${request_id}/bids`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      Alert.alert("Success", "Your offer has been placed successfully.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to place offer.";
      Alert.alert("Offer Failed", message);
    } finally {
      setIsSubmitting(false);
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  const cheapestBidId = existingBids.length > 0 ? existingBids[0].id : null;

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

      <ScrollView>
        <View style={styles.contentGrid}>
          <View style={styles.formColumn}>
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Your Offer Details</Text>
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
                    { label: "Used", value: "Used" },
                    { label: "New", value: "New" },
                  ]}
                />
              </View>
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
                {/* On iOS, the picker can be a modal, on Android it can be a dialog */}
                {showDatePicker && (
                  <DateTimePicker
                    value={validUntil}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                    minimumDate={new Date()}
                  />
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

            <Pressable
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Offer</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.sidebarColumn}>
            {requestDetails && (
              <View style={styles.formCard}>
                <Text style={styles.sectionTitle}>Customer Request</Text>
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

            {existingBids.length > 0 && (
              <View style={styles.formCard}>
                <Text style={styles.sectionTitle}>Previous Offers</Text>
                {existingBids.map((bid) => {
                  const isMyBid = bid.dealer_id === user?.id;
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
                          source={{ uri: `${API_BASE_URL}${bid.image_url}` }}
                          style={styles.previousBidImage}
                        />
                      )}
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Price:</Text>
                        <Text style={styles.detailValue}>
                          {bid.price.toLocaleString()} ETB
                        </Text>
                      </View>
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
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: COLORS.text },
  headerSubtitle: { fontSize: 16, color: COLORS.textSecondary, marginTop: 4 },
  contentGrid: {
    flexDirection: "column", // Stack columns vertically on mobile
    paddingHorizontal: 10,
  },
  formColumn: { flex: 1 },
  sidebarColumn: { flex: 1, marginTop: 20 },
  formCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 10,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 15,
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
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
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
