import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { requestPasswordReset } from "@/lib/api/auth";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setErrorMessage("Enter the email address on your account.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setMessage("");
    try {
      const response = await requestPasswordReset(email.trim());
      const nextMessage =
        response.data?.message ||
        "If an account exists for that email, a password reset link has been sent.";
      setMessage(nextMessage);
      if (Platform.OS !== "web") Alert.alert("Check your email", nextMessage);
    } catch (error: any) {
      setErrorMessage(
        error.userMessage || error.message || "Unable to request password reset."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View style={styles.content}>
            <Text style={styles.title}>Forgot Password</Text>
            <Text style={styles.subtitle}>
              Enter your account email. If email reset is unavailable, contact
              an admin and they can generate a temporary password for you.
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  setErrorMessage("");
                  setMessage("");
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
              />
            </View>

            {errorMessage ? (
              <View style={[styles.banner, styles.errorBanner]}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {message ? (
              <View style={[styles.banner, styles.successBanner]}>
                <Text style={styles.successText}>{message}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footerLinkRow}>
              <Link href="/login" asChild>
                <TouchableOpacity>
                  <Text style={styles.linkText}>Back to login</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  title: {
    fontSize: 34,
    fontWeight: "bold",
    color: "#343a40",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#6c757d",
    textAlign: "center",
    marginBottom: 34,
  },
  formGroup: { marginBottom: 20 },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: "#343a40",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 6,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ced4da",
    color: "#343a40",
  },
  banner: {
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
  },
  errorBanner: { backgroundColor: "#f8d7da", borderColor: "#f1aeb5" },
  successBanner: { backgroundColor: "#d1e7dd", borderColor: "#a3cfbb" },
  errorText: { color: "#842029", fontSize: 14, fontWeight: "500" },
  successText: { color: "#0f5132", fontSize: 14, fontWeight: "500" },
  primaryButton: {
    backgroundColor: "#6118d7ff",
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  primaryButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  footerLinkRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  linkText: {
    fontSize: 16,
    color: "#0d6efd",
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
});
