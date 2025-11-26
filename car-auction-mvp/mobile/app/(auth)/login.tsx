import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
} from "react-native";
import BouncyCheckbox from "react-native-bouncy-checkbox";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";

export default function LoginScreen() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [focusedInput, setFocusedInput] = useState<"login" | "password" | null>(
    null
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Login</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Username or Email</Text>
          <TextInput
            style={[
              styles.input,
              focusedInput === "login" && styles.inputFocused,
            ]}
            value={login}
            onChangeText={setLogin}
            keyboardType="email-address"
            autoCapitalize="none"
            onFocus={() => setFocusedInput("login")}
            onBlur={() => setFocusedInput(null)}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={[
              styles.input,
              focusedInput === "password" && styles.inputFocused,
            ]}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            onFocus={() => setFocusedInput("password")}
            onBlur={() => setFocusedInput(null)}
          />
        </View>

        <View style={styles.checkboxContainer}>
          <BouncyCheckbox
            size={22}
            fillColor="#6118d7ff"
            unFillColor="#FFFFFF"
            text="Remember me"
            iconStyle={{ borderColor: "#ced4da" }}
            innerIconStyle={{ borderWidth: 2 }}
            textStyle={{ textDecorationLine: "none", fontSize: 16 }}
            onPress={(isChecked: boolean) => setRememberMe(isChecked)}
          />
        </View>

        <TouchableOpacity style={styles.loginButton}>
          <Text style={styles.loginButtonText}>Submit</Text>
        </TouchableOpacity>

        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Don't have an account? </Text>
          <Link href="/register" asChild>
            <TouchableOpacity>
              <Text style={styles.registerLinkText}>Register</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" }, // Light gray background
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#343a40", // Dark gray text
    marginBottom: 48, // More space like web
    textAlign: "center",
  },
  formGroup: {
    marginBottom: 24, // 1.5rem
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: "#343a40", // Dark gray text
    marginBottom: 8, // 0.5rem
  },
  input: {
    backgroundColor: "#FFF",
    padding: 10,
    borderRadius: 6, // var(--radius) approximation
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ced4da", // Muted border color
    color: "#343a40", // Dark gray text
  },
  inputFocused: {
    borderColor: "#0d6efd", // A standard blue for focus ring
    borderWidth: 2,
    padding: 9, // Adjust padding to account for thicker border
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 24, // More space before button
  },
  loginButton: {
    backgroundColor: "#6118d7ff", // approve / secondary color
    paddingVertical: 12,
    borderRadius: 6, // var(--radius) approximation
    alignItems: "center",
  },
  loginButtonText: { color: "#ffffffff", fontSize: 16, fontWeight: "600" },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  registerText: {
    fontSize: 16,
    color: "#343a40",
  },
  registerLinkText: {
    fontSize: 16,
    color: "#0d6efd", // Standard link blue
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
});
