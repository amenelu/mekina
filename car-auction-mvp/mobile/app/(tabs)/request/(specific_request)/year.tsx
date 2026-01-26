import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import axios from "axios";
import API_URL from "@/constants/Api";
import { useAuth } from "@/hooks/useAuth";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  border: "#313843",
  mutedForeground: "#8A94A3",
};

const RequestYearScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  const handleSubmit = async () => {
    if (!year.trim() || !/^\d{4}$/.test(year)) {
      Alert.alert("Invalid Year", "Please enter a valid 4-digit year.");
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/requests/api/requests`,
        {
          make: params.make,
          model: params.model,
          min_year: year,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      Alert.alert(
        "Request Submitted!",
        "Your request has been sent to our dealers. They will contact you with offers soon.",
        [{ text: "OK", onPress: () => router.replace("/(tabs)/my-requests") }]
      );
    } catch (error: any) {
      console.error("Failed to submit request:", error);
      const message =
        error.response?.data?.message || "An unknown error occurred.";
      Alert.alert("Submission Failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.counter}>3 / 4</Text>
      <Text style={styles.title}>
        What's the minimum year you're looking for?
      </Text>

      <TextInput
        style={styles.input}
        placeholder="e.g., 2022"
        placeholderTextColor={COLORS.mutedForeground}
        value={year}
        onChangeText={setYear}
        keyboardType="number-pad"
        maxLength={4}
      />

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        {loading ? (
          <ActivityIndicator color={COLORS.foreground} />
        ) : (
          <Text style={styles.submitButtonText}>Finish Request</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: COLORS.background,
  },
  counter: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.foreground,
    marginBottom: 30,
    textAlign: "center",
  },
  input: {
    backgroundColor: COLORS.card,
    color: COLORS.foreground,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 18,
    marginBottom: 30,
    textAlign: "center",
  },
  submitButton: {
    backgroundColor: COLORS.accent,
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
  },
  submitButtonText: {
    color: COLORS.foreground,
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default RequestYearScreen;
