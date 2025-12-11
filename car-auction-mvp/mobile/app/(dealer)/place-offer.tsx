import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import axios from "axios";
import { useAuth } from "@/hooks/useAuth";
import { API_BASE_URL } from "@/apiConfig";
import DateTimePicker from "@react-native-community/datetimepicker";

const COLORS = {
  background: "#14181F",
  card: "#1C212B",
  text: "#F8F8F8",
  textSecondary: "#8A94A3",
  accent: "#A370F7",
  input: "#14181F",
  border: "#313843",
};

const PlaceOfferScreen = () => {
  const { request_id } = useLocalSearchParams<{ request_id: string }>();
  const navigation = useNavigation();
  const { token } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [price, setPrice] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [carYear, setCarYear] = useState("");
  const [validUntil, setValidUntil] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSubmit = async () => {
    if (!price || !make || !model || !carYear) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post(
        `${API_BASE_URL}/dealer/api/requests/${request_id}/bids`,
        {
          price: parseFloat(price),
          make,
          model,
          car_year: parseInt(carYear),
          valid_until: validUntil.toISOString().split("T")[0], // Format as YYYY-MM-DD
          // Defaulting other required fields for simplicity
          condition: "Used",
          availability: "In Stock",
        },
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
    const currentDate = selectedDate || validUntil;
    setShowDatePicker(false);
    setValidUntil(currentDate);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Place an Offer</Text>
        <Text style={styles.headerSubtitle}>
          Your offer for Request #{request_id}
        </Text>
      </View>

      <View style={styles.formCard}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Offer Price (ETB)</Text>
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
          <Text style={styles.label}>Car Make</Text>
          <TextInput
            style={styles.input}
            value={make}
            onChangeText={setMake}
            placeholder="e.g., Toyota"
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Car Model</Text>
          <TextInput
            style={styles.input}
            value={model}
            onChangeText={setModel}
            placeholder="e.g., Vitz"
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Car Year</Text>
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
          <Text style={styles.label}>Offer Valid Until</Text>
          <Pressable onPress={() => setShowDatePicker(true)}>
            <TextInput
              style={styles.input}
              value={validUntil.toLocaleDateString()}
              editable={false}
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 20 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: COLORS.text },
  headerSubtitle: { fontSize: 16, color: COLORS.textSecondary, marginTop: 4 },
  formCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
  },
  inputGroup: { marginBottom: 15 },
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
  submitButton: {
    backgroundColor: COLORS.accent,
    margin: 20,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default PlaceOfferScreen;
