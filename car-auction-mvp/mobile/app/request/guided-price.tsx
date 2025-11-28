import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Stack, useRouter } from "expo-router";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  border: "#313843",
};

const budgetOptions = [
  { label: "Under 1,000,000 ETB", value: "under_1m" },
  { label: "1M - 3M ETB", value: "1m_to_3m" },
  { label: "3M - 5M ETB", value: "3m_to_5m" },
  { label: "Over 5,000,000 ETB", value: "over_5m" },
];

const RequestBudgetScreen = () => {
  const router = useRouter();

  const handleSelect = (value: string) => {
    router.push({
      pathname: "/request/body-type",
      params: { budget: value },
    });
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Help Us Find It (1/5)" }} />
      <Text style={styles.title}>What is your approximate budget?</Text>
      <View style={styles.optionsContainer}>
        {budgetOptions.map((option) => (
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

export default RequestBudgetScreen;
