import React, { useState } from "react";
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
import { Stack, useRouter, useLocalSearchParams } from "expo-router";

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

  const handleSubmit = () => {
    if (year.trim() && /^\d{4}$/.test(year)) {
      // In a real app, you would send this data to your API
      const finalRequest = {
        ...params,
        year,
      };
      console.log("Submitting specific car request:", finalRequest);

      // Show a confirmation and navigate home
      Alert.alert(
        "Request Submitted!",
        "Your request has been sent to our dealers. They will contact you with offers soon.",
        [{ text: "OK", onPress: () => router.push("/(tabs)") }]
      );
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <Stack.Screen options={{ title: "Find a Car (3/3)" }} />
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
        <Text style={styles.submitButtonText}>Finish Request</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: COLORS.background },
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
