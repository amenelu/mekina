import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";

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

  const handleNext = () => {
    if (!year.trim() || !/^\d{4}$/.test(year)) {
      Alert.alert("Invalid Year", "Please enter a valid 4-digit year.");
      return;
    }

    router.push({
      pathname: "./details",
      params: { ...params, min_year: year },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.counter}>3 / 4</Text>
      <Text style={styles.title}>
        {"What's the minimum year you're looking for?"}
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

      <TouchableOpacity style={styles.submitButton} onPress={handleNext}>
        <Text style={styles.submitButtonText}>Next</Text>
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
