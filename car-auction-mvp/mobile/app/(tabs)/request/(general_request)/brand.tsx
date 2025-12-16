import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
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

const RequestBrandScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [brand, setBrand] = useState("");

  const handleSubmit = () => {
    // In a real app, you would send this data to your API
    const finalRequest = {
      ...params,
      brand,
    };
    console.log("Submitting car request:", finalRequest);

    // Show a confirmation and navigate home
    Alert.alert(
      "Request Submitted!",
      "Your request has been sent to our dealers. They will contact you with offers soon.",
      [{ text: "OK", onPress: () => router.push("/(tabs)") }]
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Help Us Find It (5/5)" }} />
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
        <Text style={styles.submitButtonText}>Finish Request</Text>
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
