import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Stack, useRouter, Link } from "expo-router";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  border: "#313843",
};

const choiceOptions = [
  {
    label: "Yes, I know what I want",
    description: "Tell us the make and model you're looking for.",
    href: "/request/specific-car",
  },
  {
    label: "No, help me decide",
    description:
      "We'll guide you through some options to find the perfect fit.",
    href: "/request/guided-price",
  },
];

const RequestChoiceScreen = () => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Let's Find Your Next Car" }} />
      <Text style={styles.title}>Do you know which car you want?</Text>
      <View style={styles.optionsContainer}>
        {choiceOptions.map((option) => (
          <Link key={option.href} href={option.href as any} asChild>
            <TouchableOpacity style={styles.optionButton}>
              <Text style={styles.optionText}>{option.label}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </TouchableOpacity>
          </Link>
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
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  optionText: {
    color: COLORS.foreground,
    fontSize: 18,
    fontWeight: "500",
    textAlign: "center",
  },
  optionDescription: {
    color: COLORS.foreground,
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
});

export default RequestChoiceScreen;
