import React, { useState } from "react";
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BrandPickerModal from "@/components/_components/BrandPickerModal";
import { CAR_BRANDS } from "@/constants/carBrands";
import { clearRequestDraft } from "@/lib/requestDraft";
import { useRequestDraftPersistence } from "@/hooks/useRequestDraftPersistence";
import { createRequest } from "@/lib/api/requests";


const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  border: "#313843",
  mutedForeground: "#8A94A3",
};

const RequestBrandScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [brand, setBrand] = useState(String(params.brand || ""));
  const [loading, setLoading] = useState(false);
  const [isBrandPickerVisible, setBrandPickerVisible] = useState(false);
  const { token } = useAuth();

  useRequestDraftPersistence("/request/brand", { ...params, brand });

  const handleSubmit = async () => {
    if (!token) {
      Alert.alert("Login Required", "Please log in before submitting a request.");
      router.replace("/(auth)/login");
      return;
    }

    setLoading(true);

    const finalRequest = {
      ...params,
      brand,
    };

    try {
      await createRequest(finalRequest);

      Alert.alert(
        "Request Submitted!",
        "Your request has been sent to our dealers. They will contact you with offers soon.",
        [
          {
            text: "OK",
            onPress: async () => {
              await clearRequestDraft();
              router.replace("/(tabs)/my-requests");
            },
          },
        ]
      );
    } catch (error: any) {
      console.error("Failed to submit request:", error);
      Alert.alert(
        "Submission Failed",
        error.message || "An unknown error occurred."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.counter}>5 / 5</Text>
      <Text style={styles.title}>Are you considering any specific brands?</Text>
      <Text style={styles.subtitle}>(Optional)</Text>

      <Pressable
        style={styles.input}
        onPress={() => setBrandPickerVisible(true)}
      >
        <Text
          style={[
            styles.inputText,
            !brand && styles.placeholderText,
          ]}
        >
          {brand || "Choose a preferred brand"}
        </Text>
        <Ionicons
          name="chevron-down"
          size={20}
          color={COLORS.mutedForeground}
        />
      </Pressable>

      {brand.length > 0 && (
        <TouchableOpacity
          style={styles.clearChoiceButton}
          onPress={() => setBrand("")}
        >
          <Text style={styles.clearChoiceText}>Clear brand preference</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        {loading ? (
          <ActivityIndicator color={COLORS.foreground} />
        ) : (
          <Text style={styles.submitButtonText}>Finish Request</Text>
        )}
      </TouchableOpacity>

      <BrandPickerModal
        brands={CAR_BRANDS}
        selectedBrand={brand}
        visible={isBrandPickerVisible}
        onClose={() => setBrandPickerVisible(false)}
        onSelect={(selectedBrand) => {
          setBrand(selectedBrand);
          setBrandPickerVisible(false);
        }}
        title="Select a preferred brand"
        allowSkip
        onSkip={() => {
          setBrand("");
          setBrandPickerVisible(false);
        }}
      />
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
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginBottom: 40,
  },
  input: {
    minHeight: 56,
    backgroundColor: COLORS.card,
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inputText: {
    color: COLORS.foreground,
    fontSize: 18,
    flex: 1,
    marginRight: 12,
  },
  placeholderText: {
    color: COLORS.mutedForeground,
  },
  clearChoiceButton: {
    alignSelf: "center",
    marginTop: -14,
    marginBottom: 24,
  },
  clearChoiceText: {
    color: COLORS.mutedForeground,
    fontSize: 14,
    fontWeight: "600",
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

export default RequestBrandScreen;
