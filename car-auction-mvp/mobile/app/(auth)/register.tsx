import React, { useState } from "react";
import {
  Alert,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import axios from "axios";
import { API_BASE_URL } from "@/apiConfig";

const RegisterScreen = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const [errors, setErrors] = useState({
    username: "",
    email: "",
    phone_number: "", // Match backend error key
    password: "",
    password2: "",
  });

  const handleRegister = () => {
    // Clear previous errors
    setErrors({
      username: "",
      email: "",
      phone_number: "",
      password: "",
      password2: "",
    });

    if (password !== password2) {
      setErrors((prev) => ({ ...prev, password2: "Passwords do not match." }));
      return;
    }

    setIsLoading(true);
    axios
      .post(`${API_BASE_URL}/auth/api/register`, {
        username,
        email,
        phone_number: phoneNumber,
        password,
        password2,
      })
      .then((response) => {
        Alert.alert(
          "Registration Successful",
          "You can now log in with your new account.",
          [{ text: "OK", onPress: () => router.push("/login") }]
        );
      })
      .catch((error) => {
        if (
          error.response &&
          error.response.data &&
          error.response.data.errors
        ) {
          // Set validation errors from the backend
          setErrors((prev) => ({ ...prev, ...error.response.data.errors }));
        } else {
          const message =
            error.response?.data?.message || "An unexpected error occurred.";
          Alert.alert("Registration Failed", message);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Register</Text>
        <View style={styles.formGrid}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            {errors.username ? (
              <Text style={styles.errorText}>{errors.username}</Text>
            ) : null}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email ? (
              <Text style={styles.errorText}>{errors.email}</Text>
            ) : null}
          </View>

          <View style={[styles.formGroup, styles.fullWidth]}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
            {errors.phone_number ? (
              <Text style={styles.errorText}>{errors.phone_number}</Text>
            ) : null}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            {errors.password ? (
              <Text style={styles.errorText}>{errors.password}</Text>
            ) : null}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              value={password2}
              onChangeText={setPassword2}
              secureTextEntry
            />
            {errors.password2 ? (
              <Text style={styles.errorText}>{errors.password2}</Text>
            ) : null}
          </View>
        </View>

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleRegister}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>Register</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContainer: { padding: 20 },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
  },
  formGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  formGroup: { marginBottom: 24, width: "48%" },
  fullWidth: { width: "100%" },
  label: { fontSize: 16, fontWeight: "500", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  errorText: { color: "#dc3545", fontSize: 14, marginTop: 4 },
  submitButton: {
    backgroundColor: "#6118d7ff", // 'approve' green color
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default RegisterScreen;
