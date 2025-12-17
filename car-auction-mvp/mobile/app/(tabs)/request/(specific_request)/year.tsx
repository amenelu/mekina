import React, { useState } from "react";
import API_URL from "@/constants/Api";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ActivityIndicator } from "react-native";

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

    const finalRequest = {
      make: params.make,
      model: params.model,
      min_year: year, // The API expects min_year
    };

    try {
      const response = await fetch(`${API_URL}/requests/api/requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(finalRequest),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          responseData.message || "An error occurred while submitting."
        );
      }

      Alert.alert(
        "Request Submitted!",
        "Your request has been sent to our dealers. They will contact you with offers soon.",
        [{ text: "OK", onPress: () => router.replace("/(tabs)/my-requests") }]
      );
    } catch (error: any) {
      console.error("Failed to submit request:", error);
      Alert.alert(
        "Submission Failed",
        error.message || "An unknown error occurred."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <Text style={styles.counter}>3 / 3</Text>
        <Text style={styles.title}>What year was it made?</Text>

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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: COLORS.background },
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
