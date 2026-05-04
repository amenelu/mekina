import React, { useState } from "react";
import {
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
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

const RequestModelScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [model, setModel] = useState(String(params.model || ""));
  const [showValidation, setShowValidation] = useState(false);

  useRequestDraftPersistence("/request/model", { ...params, model });

  const handleNext = () => {
    if (!model.trim()) {
      setShowValidation(true);
      return;
    }

    setShowValidation(false);
    router.push({
      pathname: "/request/year",
      params: { ...params, model },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.counter}>2 / 4</Text>
      <Text style={styles.title}>
        Great! What model of {params.make} are you looking for?
      </Text>

      <View>
        <TextInput
          style={[styles.input, showValidation && !model.trim() && styles.inputError]}
          placeholder="e.g., Corolla, F-150, Seal"
          placeholderTextColor={COLORS.mutedForeground}
          value={model}
          onChangeText={(value) => {
            setModel(value);
            if (value.trim()) {
              setShowValidation(false);
            }
          }}
        />
        {showValidation && !model.trim() && (
          <Text style={styles.errorText}>Please enter a model to continue.</Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.submitButton, !model.trim() && styles.submitButtonDisabled]}
        onPress={handleNext}
      >
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
  },
  inputError: {
    borderColor: "#E35D6A",
  },
  errorText: {
    color: "#E35D6A",
    fontSize: 14,
    marginTop: -20,
    marginBottom: 20,
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
  submitButtonDisabled: {
    opacity: 0.8,
  },
});

export default RequestModelScreen;
