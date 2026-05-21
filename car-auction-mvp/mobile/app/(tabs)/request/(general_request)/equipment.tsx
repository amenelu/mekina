import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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

const equipmentOptions = [
  { label: "Sunroof", value: "sunroof" },
  { label: "Leather Seats", value: "leather_seats" },
  { label: "Apple CarPlay / Android Auto", value: "apple_carplay" },
  { label: "All-Wheel Drive", value: "awd" },
];

const RequestEquipmentScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(() => {
    const equipment = params.equipment;
    if (Array.isArray(equipment)) return equipment.map(String);
    if (typeof equipment === "string" && equipment.length > 0) {
      return [equipment];
    }
    return [];
  });

  useRequestDraftPersistence("/request/equipment", {
    ...params,
    equipment: selectedEquipment,
  });

  const toggleSelection = (value: string) => {
    setSelectedEquipment((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  };

  const handleNext = () => {
    router.push({
      pathname: "./brand",
      params: { ...params, equipment: selectedEquipment },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.counter}>4 / 5</Text>
      <Text style={styles.title}>Which features are important to you?</Text>
      <Text style={styles.subtitle}>
        (Optional, select as many as you like)
      </Text>

      <View style={styles.optionsContainer}>
        {equipmentOptions.map((option) => {
          const isSelected = selectedEquipment.includes(option.value);
          return (
            <Pressable
              key={option.value}
              style={[
                styles.optionButton,
                isSelected && styles.optionButtonSelected,
              ]}
              onPress={() => toggleSelection(option.value)}
            >
              <Ionicons
                name={isSelected ? "checkbox" : "square-outline"}
                size={24}
                color={isSelected ? COLORS.foreground : COLORS.accent}
              />
              <Text
                style={[
                  styles.optionText,
                  isSelected && styles.optionTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable style={styles.submitButton} onPress={handleNext}>
        <Text style={styles.submitButtonText}>Next</Text>
      </Pressable>
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
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.foreground,
    textAlign: "center",
    marginBottom: 8,
  },
  counter: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginBottom: 30,
  },
  optionsContainer: { gap: 15 },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    backgroundColor: COLORS.card,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  optionButtonSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  optionText: { color: COLORS.foreground, fontSize: 18, fontWeight: "500" },
  optionTextSelected: { color: COLORS.foreground },
  submitButton: {
    backgroundColor: COLORS.accent,
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: "auto",
    marginBottom: 10, // Add space from the bottom of the screen
  },
  submitButtonText: {
    color: COLORS.foreground,
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default RequestEquipmentScreen;
