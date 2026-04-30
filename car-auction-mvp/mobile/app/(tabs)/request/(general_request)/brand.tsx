import React, { useState } from "react";
import API_URL from "@/constants/Api";
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
 ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import { useRouter, useLocalSearchParams } from "expo-router";


const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  border: "#313843",
  mutedForeground: "#8A94A3",
};

const RequestBrandScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [brand, setBrand] = useState("");
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  const handleSubmit = async () => {
    setLoading(true);

    const finalRequest = {
      ...params,
      brand,
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
    <SafeAreaView style={styles.container}>
      <Text style={styles.counter}>5 / 5</Text>
      <Text style={styles.title}>Are you considering any specific brands?</Text>
      <Text style={styles.subtitle}>(Optional)</Text>

      <TextInput
        style={styles.input}
        placeholder="e.g., Toyota, Ford, BYD"
        placeholderTextColor={COLORS.mutedForeground}
        value={brand}
        onChangeText={setBrand}
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
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginBottom: 40,
  },
  input: {
    backgroundColor: COLORS.card,
    color: COLORS.foreground,
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 18,
    marginBottom: 30,
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

export default RequestBrandScreen;
