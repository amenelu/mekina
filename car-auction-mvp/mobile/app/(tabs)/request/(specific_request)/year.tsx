import React, { useState } from "react";
import {
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useRequestDraftPersistence } from "@/hooks/useRequestDraftPersistence";

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
  const [year, setYear] = useState(String(params.min_year || ""));
  const [showValidation, setShowValidation] = useState(false);

  useRequestDraftPersistence("/request/year", { ...params, min_year: year });

  const handleNext = () => {
    if (!year.trim() || !/^\d{4}$/.test(year)) {
      setShowValidation(true);
      return;
    }

    setShowValidation(false);
    router.push({
      pathname: "/request/upload",
      params: { ...params, min_year: year },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.counter}>3 / 4</Text>
      <Text style={styles.title}>
        {"What's the minimum year you're looking for?"}
      </Text>

      <View>
        <TextInput
          style={[styles.input, showValidation && !/^\d{4}$/.test(year) && styles.inputError]}
          placeholder="e.g., 2022"
          placeholderTextColor={COLORS.mutedForeground}
          value={year}
          onChangeText={(value) => {
            setYear(value);
            if (/^\d{4}$/.test(value)) {
              setShowValidation(false);
            }
          }}
          keyboardType="number-pad"
          maxLength={4}
        />
        {showValidation && !/^\d{4}$/.test(year) && (
          <Text style={styles.errorText}>Please enter a valid 4-digit year.</Text>
        )}
      </View>

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
  inputError: {
    borderColor: "#E35D6A",
  },
  errorText: {
    color: "#E35D6A",
    fontSize: 14,
    marginTop: -20,
    marginBottom: 20,
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
