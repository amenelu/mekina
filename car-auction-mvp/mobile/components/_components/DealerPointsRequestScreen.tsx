import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/hooks/useAuth";
import { requestDealerPoints } from "@/lib/api/dealer";
import { DEALER_ROUTES, RENTAL_ROUTES } from "@/lib/roleRoutes";
import { showNativeFlowAlert } from "@/lib/nativeFlowAlert";

const COLORS = {
  background: "#14181F",
  card: "#1C212B",
  text: "#F8F8F8",
  textSecondary: "#8A94A3",
  accent: "#A370F7",
  border: "#313843",
};

export default function DealerPointsRequestScreen() {
  const { token, user } = useAuth() as any;
  const [requestedPoints, setRequestedPoints] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [currentPoints, setCurrentPoints] = useState<number | null>(null);
  const [pointEconomy, setPointEconomy] = useState<{
    earned_points?: number;
    spent_points?: number;
    spent_points_30d?: number;
  } | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!token) return;
    try {
      // Using the endpoint defined in routes/dealer.py
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/dealer/api/points/history`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );
      const data = await response.json();
      if (typeof data.current_points === "number") {
        setCurrentPoints(data.current_points);
      }
      if (data.transactions) {
        setTransactions(data.transactions);
      }
      if (data.point_economy) {
        setPointEconomy(data.point_economy);
      }
    } catch (error) {
      console.error("Failed to fetch point history:", error);
    } finally {
      setLoadingHistory(false);
    }
  }, [token]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const displayedCurrentPoints = currentPoints ?? user?.points ?? 0;

  const dashboardRoute = user?.is_rental_company
    ? RENTAL_ROUTES.dashboard
    : DEALER_ROUTES.dashboard;

  const goBackToDashboard = () => {
    router.navigate(dashboardRoute as any);
  };

  const handleRequestedPointsChange = (value: string) => {
    setRequestedPoints(value.replace(/\D/g, "").slice(0, 4));
  };

  const requestedPointValue = Number(requestedPoints) || 0;

  const setRequestedPointValue = (value: number) => {
    const nextValue = Math.max(0, Math.min(9999, Math.round(value)));
    setRequestedPoints(nextValue > 0 ? String(nextValue) : "");
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();

    if (!token) {
      showNativeFlowAlert(
        "Login Required",
        "Please log in again to request points.",
        () => router.replace("/(auth)/login" as any),
      );
      return;
    }

    const parsedPoints = Number(requestedPoints);
    if (!Number.isInteger(parsedPoints) || parsedPoints <= 0) {
      Alert.alert(
        "Invalid Amount",
        "Please enter a whole number of points to request.",
      );
      return;
    }

    setSubmitting(true);
    try {
      await requestDealerPoints(parsedPoints);

      setRequestedPoints("");
      showNativeFlowAlert(
        "Request Sent",
        "Your point request has been sent.",
        () => {
          goBackToDashboard();
        },
      );
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.userMessage ||
        "Could not send your request.";
      showNativeFlowAlert("Request Failed", message);
    } finally {
      setSubmitting(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "bid":
        return "send-outline";
      case "unlock_chat":
        return "chatbubble-ellipses-outline";
      case "edit_listing":
        return "create-outline";
      case "admin_point_request":
        return "add-circle-outline";
      default:
        return "flash-outline";
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={styles.backButton} onPress={goBackToDashboard}>
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
          <Text style={styles.summaryValue}>{displayedCurrentPoints}</Text>
          <Text style={styles.summarySubtitle}>
            Need more points to keep responding to requests or placing offers?
          </Text>
          {pointEconomy ? (
            <View style={styles.economyGrid}>
              <View style={styles.economyItem}>
                <Text style={styles.economyValue}>
                  {pointEconomy.earned_points ?? 0}
                </Text>
                <Text style={styles.economyLabel}>Earned</Text>
              </View>
              <View style={styles.economyItem}>
                <Text style={styles.economyValue}>
                  {pointEconomy.spent_points ?? 0}
                </Text>
                <Text style={styles.economyLabel}>Spent</Text>
              </View>
              <View style={styles.economyItem}>
                <Text style={styles.economyValue}>
                  {pointEconomy.spent_points_30d ?? 0}
                </Text>
                <Text style={styles.economyLabel}>30 days</Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Points needed</Text>
          {Platform.OS === "web" ? (
            <View
              style={styles.webStepper}
              accessibilityRole="adjustable"
              accessibilityLabel="Points needed"
              accessibilityValue={{ text: `${requestedPointValue || 0}` }}
            >
              <Pressable
                style={styles.stepperButton}
                onPress={() => setRequestedPointValue(requestedPointValue - 1)}
                disabled={submitting || requestedPointValue <= 0}
              >
                <Ionicons
                  name="remove"
                  size={20}
                  color={COLORS.textSecondary}
                />
              </Pressable>
              <View style={styles.stepperValueBox}>
                <Text style={styles.stepperValue}>
                  {requestedPointValue || "--"}
                </Text>
                <Text style={styles.stepperHint}>points</Text>
              </View>
              <Pressable
                style={styles.stepperButton}
                onPress={() => setRequestedPointValue(requestedPointValue + 1)}
                disabled={submitting}
              >
                <Ionicons name="add" size={20} color={COLORS.accent} />
              </Pressable>
            </View>
          ) : (
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
              scrollEnabled={false}
              placeholder="e.g. 10"
              placeholderTextColor={COLORS.textSecondary}
              maxLength={4}
              returnKeyType="done"
              blurOnSubmit
            />
          )}

          {Platform.OS === "web" ? (
            <View style={styles.presetRow}>
              {[5, 10, 20, 50].map((value) => (
                <Pressable
                  key={value}
                  style={[
                    styles.presetButton,
                    requestedPointValue === value && styles.activePresetButton,
                  ]}
                  onPress={() => setRequestedPointValue(value)}
                  disabled={submitting}
                >
                  <Text
                    style={[
                      styles.presetButtonText,
                      requestedPointValue === value &&
                        styles.activePresetButtonText,
                    ]}
                  >
                    {value}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

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

        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>Points History</Text>
          {loadingHistory ? (
            <ActivityIndicator
              color={COLORS.accent}
              style={{ marginTop: 10 }}
            />
          ) : transactions.length === 0 ? (
            <Text style={styles.emptyHistoryText}>
              No transactions found yet.
            </Text>
          ) : (
            transactions.map((item) => (
              <View key={item.id} style={styles.transactionItem}>
                <View style={styles.transactionIcon}>
                  <Ionicons
                    name={getTransactionIcon(item.transaction_type) as any}
                    size={18}
                    color={item.amount > 0 ? "#31D0AA" : COLORS.textSecondary}
                  />
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionDesc}>{item.description}</Text>
                  <Text style={styles.transactionDate}>
                    {new Date(item.timestamp).toLocaleDateString()}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.transactionAmount,
                    { color: item.amount > 0 ? "#31D0AA" : COLORS.text },
                  ]}
                >
                  {item.amount > 0 ? "+" : ""}
                  {item.amount}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
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
  economyGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  economyItem: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  economyValue: {
    color: COLORS.accent,
    fontSize: 18,
    fontWeight: "900",
  },
  economyLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 3,
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
  webInput: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderStyle: "solid",
    borderWidth: 1,
    boxSizing: "border-box",
    color: COLORS.text,
    fontSize: 16,
    marginBottom: 18,
    minHeight: 52,
    outlineColor: COLORS.accent,
    paddingLeft: 14,
    paddingRight: 14,
    width: "100%",
  },
  webStepper: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    minHeight: 58,
    overflow: "hidden",
  },
  stepperButton: {
    width: 58,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  stepperValueBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.border,
  },
  stepperValue: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "700",
  },
  stepperHint: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  presetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },
  presetButton: {
    minWidth: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  activePresetButton: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  presetButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "700",
  },
  activePresetButtonText: {
    color: COLORS.text,
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
  historySection: {
    marginTop: 10,
    paddingBottom: 40,
  },
  historyTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 15,
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
  },
  transactionDate: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: "800",
  },
  emptyHistoryText: {
    color: COLORS.textSecondary,
    textAlign: "center",
    paddingVertical: 20,
  },
});
