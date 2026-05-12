import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";

import API_BASE_URL from "@/constants/Api";
import { useAuth } from "@/hooks/useAuth";
import { DEALER_ROUTES } from "@/lib/roleRoutes";

const COLORS = {
  background: "#14181F",
  card: "#1C212B",
  text: "#F8F8F8",
  textSecondary: "#8A94A3",
  accent: "#A370F7",
  border: "#313843",
};

const nonCredentialInputProps =
  Platform.OS === "web"
    ? ({
        autoComplete: "off",
        "data-1p-ignore": "true",
        "data-bwignore": "true",
        "data-form-type": "other",
        "data-lpignore": "true",
        "data-protonpass-ignore": "true",
        "aria-autocomplete": "none",
        name: "dealer-points-request-amount",
        rows: 1,
        spellCheck: false,
      } as const)
    : {};

export default function DealerPointsRequestScreen() {
  const { token, user } = useAuth() as any;
  const [requestedPoints, setRequestedPoints] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const currentPoints = user?.points ?? 0;

  const goBackToDealerDashboard = () => {
    router.navigate(DEALER_ROUTES.dashboard as any);
  };

  const handleRequestedPointsChange = (value: string) => {
    setRequestedPoints(value.replace(/\D/g, "").slice(0, 4));
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();

    if (!token) {
      Alert.alert("Login Required", "Please log in again to request points.");
      router.replace("/(auth)/login" as any);
      return;
    }

    const parsedPoints = Number(requestedPoints);
    if (!Number.isInteger(parsedPoints) || parsedPoints <= 0) {
      Alert.alert(
        "Invalid Amount",
        "Please enter a whole number of points to request."
      );
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/dealer/api/points/request`,
        {
          requested_points: parsedPoints,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setRequestedPoints("");
      Alert.alert("Request Sent", response.data.message);
      goBackToDealerDashboard();
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Could not send your request.";
      Alert.alert("Request Failed", message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.content}>
        <Pressable style={styles.backButton} onPress={goBackToDealerDashboard}>
          <Ionicons
            name="chevron-back"
            size={20}
            color={COLORS.textSecondary}
          />
          <Text style={styles.backButtonText}>Back to Dashboard</Text>
        </Pressable>

        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="flash-outline" size={22} color={COLORS.accent} />
            <Text style={styles.summaryTitle}>Your Current Balance</Text>
          </View>
          <Text style={styles.summaryValue}>{currentPoints}</Text>
          <Text style={styles.summarySubtitle}>
            Need more points to keep responding to requests or placing offers?
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Points needed</Text>
          <TextInput
            style={styles.input}
            value={requestedPoints}
            onChangeText={handleRequestedPointsChange}
            keyboardType="number-pad"
            inputMode="numeric"
            autoComplete="off"
            importantForAutofill="no"
            textContentType="none"
            autoCorrect={false}
            autoCapitalize="none"
            autoFocus={false}
            secureTextEntry={false}
            multiline={Platform.OS === "web"}
            numberOfLines={Platform.OS === "web" ? 1 : undefined}
            scrollEnabled={false}
            placeholder="e.g. 10"
            placeholderTextColor={COLORS.textSecondary}
            maxLength={4}
            returnKeyType="done"
            blurOnSubmit
            {...(nonCredentialInputProps as any)}
          />

          <Pressable
            style={[styles.submitButton, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.text} />
            ) : (
              <Text style={styles.submitButtonText}>Send Request</Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 56,
    gap: 18,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: 8,
    paddingVertical: 6,
    paddingRight: 10,
  },
  backButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 2,
  },
  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  summaryTitle: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: 36,
    fontWeight: "700",
    marginBottom: 8,
  },
  summarySubtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 16,
    minHeight: 52,
    maxHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 18,
  },
  submitButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
  },
});
