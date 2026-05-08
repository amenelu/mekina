import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import BouncyCheckbox from "react-native-bouncy-checkbox";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useNavigation, useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { login as loginRequest } from "@/lib/api/auth";
import { getPostLoginRoute } from "@/lib/roleRoutes";

export default function LoginScreen() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMeChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [focusedInput, setFocusedInput] = useState<"login" | "password" | null>(
    null
  );

  const navigation = useNavigation();
  const router = useRouter();
  const { login: setAuth, setRememberMe } = useAuth();

  const showError = (title: string, message: string) => {
    setErrorMessage(message);
    if (Platform.OS !== "web") {
      Alert.alert(title, message);
    }
  };

  const handleLogin = async () => {
    if (!login || !password) {
      showError("Error", "Please enter both username/email and password.");
      return;
    }

    setErrorMessage("");
    setIsLoading(true);
    try {
      const response = await loginRequest(login, password);
      const { user, token } = response.data;

      setRememberMe(rememberMe);
      setAuth(user, token);

      const resetToRoot = (
        routeName: "(admin)" | "(dealer)" | "(rental)" | "(tabs)"
      ) => {
        navigation.reset({
          index: 0,
          routes: [{ name: routeName as never }],
        });
      };

      if (Platform.OS === "web") {
        router.replace(getPostLoginRoute(user) as any);
      } else {
        if (user.is_admin) {
          resetToRoot("(admin)");
        } else if (user.is_dealer) {
          resetToRoot("(dealer)");
        } else if (user.is_rental_company) {
          resetToRoot("(rental)");
        } else {
          resetToRoot("(tabs)");
        }
      }
    } catch (error: any) {
      // Prioritize the specific message from the API response
      const message =
        error.response?.data?.message ||
        error.message ||
        "An unexpected error occurred.";
      showError("Login Failed", message);
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
            <Text style={styles.title}>Login</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Username or Email</Text>
              <TextInput
                testID="login-input"
                style={[
                  styles.input,
                  focusedInput === "login" && styles.inputFocused,
                ]}
                value={login}
                onChangeText={(value) => {
                  setLogin(value);
                  if (errorMessage) setErrorMessage("");
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={() => setFocusedInput("login")}
                onBlur={() => setFocusedInput(null)}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                testID="password-input"
                style={[
                  styles.input,
                  focusedInput === "password" && styles.inputFocused,
                ]}
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  if (errorMessage) setErrorMessage("");
                }}
                secureTextEntry
                onFocus={() => setFocusedInput("password")}
                onBlur={() => setFocusedInput(null)}
              />
            </View>

            {errorMessage ? (
              <View
                testID="login-error-banner"
                accessibilityLiveRegion="polite"
                style={styles.errorBanner}
              >
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            ) : null}

            <View style={styles.checkboxContainer}>
              <BouncyCheckbox
                testID="remember-me-checkbox"
                size={22}
                fillColor="#6118d7ff"
                unFillColor="#FFFFFF"
                text="Remember me"
                iconStyle={{ borderColor: "#ced4da" }}
                innerIconStyle={{ borderWidth: 2 }}
                textStyle={{ textDecorationLine: "none", fontSize: 16 }}
                onPress={(isChecked: boolean) => setRememberMeChecked(isChecked)}
              />
            </View>

            <TouchableOpacity
              testID="login-submit"
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.loginButtonText}>Submit</Text>
              )}
            </TouchableOpacity>

            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>
                {"Don't have an account? "}
              </Text>
              <Link href="/register" asChild>
                <TouchableOpacity>
                  <Text style={styles.registerLinkText}>Register</Text>
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
  errorBanner: {
    backgroundColor: "#f8d7da",
    borderWidth: 1,
    borderColor: "#f1aeb5",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorBannerText: {
    color: "#842029",
    fontSize: 14,
    fontWeight: "500",
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
