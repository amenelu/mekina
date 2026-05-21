import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRequestDraftPersistence } from "@/hooks/useRequestDraftPersistence";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  border: "#313843",
  mutedForeground: "#8A94A3",
};

const fuelTypeOptions = [
  { label: "Gasoline", value: "Gasoline" },
  { label: "Diesel", value: "Diesel" },
  { label: "Hybrid", value: "Hybrid" },
  { label: "Electric", value: "Electric" },
];

const RequestFuelTypeScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  useRequestDraftPersistence("/request/fuel-type", { ...params });

  const handleSelect = (value: string) => {
    router.push({
      pathname: "./equipment",
      params: { ...params, fuel_type: value },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.counter}>3 / 5</Text>
      <Text style={styles.title}>Any preference on fuel type?</Text>
      <View style={styles.optionsContainer}>
        {fuelTypeOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={styles.optionButton}
            onPress={() => handleSelect(option.value)}
          >
            <Text style={styles.optionText}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: COLORS.background,
    width: "100%",
    maxWidth: Platform.OS === "web" ? 720 : undefined,
    alignSelf: "center",
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
  optionsContainer: {
    gap: 15,
  },
  optionButton: {
    backgroundColor: COLORS.card,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  optionText: {
    color: COLORS.foreground,
    fontSize: 18,
    fontWeight: "500",
  },
});

export default RequestFuelTypeScreen;
