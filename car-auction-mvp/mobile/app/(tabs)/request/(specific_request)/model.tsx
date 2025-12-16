import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
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

const RequestModelScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [model, setModel] = useState("");

  const handleNext = () => {
    if (model.trim()) {
      router.push({
        pathname: "./year",
        params: { ...params, model },
      });
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Find a Car (2/6)" }} />
      <Text style={styles.title}>
        Great! What model of {params.make} are you looking for?
      </Text>

      <TextInput
        style={styles.input}
        placeholder="e.g., Corolla, F-150, Seal"
        placeholderTextColor={COLORS.mutedForeground}
        value={model}
        onChangeText={setModel}
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

export default RequestModelScreen;
