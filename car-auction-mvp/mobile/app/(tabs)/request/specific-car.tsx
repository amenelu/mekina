import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { Stack, useRouter } from "expo-router";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  border: "#313843",
  mutedForeground: "#8A94A3",
};

const RequestSpecificCarScreen = () => {
  const router = useRouter();
  const [make, setMake] = useState("");

  const handleNext = () => {
    // In a real app, you would continue to the next step (e.g., model)
    console.log("Car Make:", make);
    // For now, we can just go back or to a placeholder
    router.back();
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Find a Car (1/4)" }} />
      <Text style={styles.title}>What make of car are you looking for?</Text>

      <TextInput
        style={styles.input}
        placeholder="e.g., Toyota, Ford, BYD"
        placeholderTextColor={COLORS.mutedForeground}
        value={make}
        onChangeText={setMake}
      />

      <TouchableOpacity style={styles.submitButton} onPress={handleNext}>
        <Text style={styles.submitButtonText}>Next</Text>
      </TouchableOpacity>
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
  input: {
    backgroundColor: COLORS.card,
    color: COLORS.foreground,
    padding: 15,
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

export default RequestSpecificCarScreen;
