import React, { useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { bodyTypeOptions } from "./body-type";
import resolveAssetSource from "react-native/Libraries/Image/resolveAssetSource";
import { useRequestDraftPersistence } from "@/hooks/useRequestDraftPersistence";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  border: "#313843",
  mutedForeground: "#8A94A3",
};

const budgetOptions = [
  { label: "Under 1,000,000 ETB", value: "under_1m" },
  { label: "1M - 3M ETB", value: "1m_to_3m" },
  { label: "3M - 5M ETB", value: "3m_to_5m" },
  { label: "Over 5,000,000 ETB", value: "over_5m" },
];

const RequestBudgetScreen = () => {
  // Renaming component for clarity
  const router = useRouter();

  useRequestDraftPersistence("/request/budget", {});

  // Prefetch the next screen to make the transition feel faster.
  useEffect(() => {
    router.prefetch("./body-type");

    // Also prefetch the images for the next screen.
    bodyTypeOptions.forEach((option) => {
      const source = resolveAssetSource(option.image);
      if (source?.uri) {
        Image.prefetch(source.uri);
      }
    });
  }, [router]);

  const handleSelect = (value: string) => {
    // By passing the object directly, TypeScript can infer the literal type of `pathname`.
    console.log("Attempting to navigate with:", {
      pathname: "./body-type",
      params: { price: value },
    });
    router.push({ pathname: "./body-type", params: { price: value } });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.counter}>1 / 5</Text>
      <Text style={styles.title}>What is your approximate budget?</Text>
      <View style={styles.optionsContainer}>
        {budgetOptions.map((option) => (
          <Pressable
            key={option.value}
            style={styles.optionButton}
            onPress={() => handleSelect(option.value)}
          >
            <Text style={styles.optionText}>{option.label}</Text>
          </Pressable>
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

export default RequestBudgetScreen;
