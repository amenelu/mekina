import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  border: "#313843",
};

const bodyTypeOptions = [
  { label: "SUV", value: "SUV" },
  { label: "Sedan", value: "Sedan" },
  { label: "Hatchback", value: "Hatchback" },
  { label: "Pickup Truck", value: "Pickup" },
];

const RequestBodyTypeScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  const handleSelect = (value: string) => {
    router.push({
      pathname: "/request/fuel-type",
      params: { ...params, bodyType: value },
    });
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Help Us Find It (2/5)" }} />
      <Text style={styles.title}>What type of car best fits your needs?</Text>
      <View style={styles.optionsContainer}>
        {bodyTypeOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={styles.optionButton}
            onPress={() => handleSelect(option.value)}
          >
            <Text style={styles.optionText}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: COLORS.background,
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

export default RequestBodyTypeScreen;
