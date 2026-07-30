import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { changePassword } from "@/lib/api/auth";

const COLORS = {
  card: "#1C212B",
  background: "#14181F",
  border: "#313843",
  text: "#F8F8F8",
  muted: "#8A94A3",
  accent: "#6118D7",
  successBg: "#123024",
  successBorder: "#2f7d5f",
  successText: "#8ee3bd",
  errorBg: "#3a161b",
  errorBorder: "#8b2f3b",
  errorText: "#ffb4bf",
};

export default function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const resetMessages = () => {
    setMessage("");
    setErrorMessage("");
  };

  const handleSubmit = async () => {
    resetMessages();
    if (!currentPassword || !newPassword || !newPassword2) {
      setErrorMessage("Fill in all password fields.");
      return;
    }
    if (newPassword !== newPassword2) {
      setErrorMessage("New passwords must match.");
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage("New password must be at least 8 characters.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        new_password2: newPassword2,
      });
      setMessage(response.data?.message || "Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setNewPassword2("");
    } catch (error: any) {
      setErrorMessage(
        error.userMessage || error.response?.data?.message || "Unable to change password."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Change Password</Text>
      <Text style={styles.helpText}>
        Use your current password or the temporary password an admin gave you.
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Current Password</Text>
        <TextInput
          style={styles.input}
          value={currentPassword}
          onChangeText={(value) => {
            setCurrentPassword(value);
            resetMessages();
          }}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>New Password</Text>
        <TextInput
          style={styles.input}
          value={newPassword}
          onChangeText={(value) => {
            setNewPassword(value);
            resetMessages();
          }}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Confirm New Password</Text>
        <TextInput
          style={styles.input}
          value={newPassword2}
          onChangeText={(value) => {
            setNewPassword2(value);
            resetMessages();
          }}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
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
        style={[styles.button, isSaving && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Update Password</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  helpText: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  inputGroup: { marginBottom: 14 },
  label: { color: COLORS.muted, fontSize: 14, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.background,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "web" ? 10 : 12,
    fontSize: 16,
  },
  banner: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  errorBanner: {
    backgroundColor: COLORS.errorBg,
    borderColor: COLORS.errorBorder,
  },
  successBanner: {
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.successBorder,
  },
  errorText: { color: COLORS.errorText, fontSize: 14, fontWeight: "600" },
  successText: { color: COLORS.successText, fontSize: 14, fontWeight: "600" },
  button: {
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    alignItems: "center",
    paddingVertical: 12,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
