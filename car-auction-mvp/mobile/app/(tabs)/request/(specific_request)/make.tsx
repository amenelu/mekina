import React, { useState } from "react";
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import BrandPickerModal from "@/components/_components/BrandPickerModal";
import { CAR_BRANDS } from "@/constants/carBrands";
import { useRequestDraftPersistence } from "@/hooks/useRequestDraftPersistence";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#6118D7",
  border: "#313843",
  mutedForeground: "#8A94A3",
};

const RequestMakeScreen = () => {
  const router = useRouter();
  const [make, setMake] = useState("");
  const [isBrandPickerVisible, setBrandPickerVisible] = useState(false);

  useRequestDraftPersistence("/request/make", { make });

  const handleNext = () => {
    if (make.trim()) {
      router.push({ pathname: "/request/model", params: { make } });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.counter}>1 / 4</Text>
      <Text style={styles.title}>What make of car are you looking for?</Text>

      <Pressable
        style={styles.input}
        onPress={() => setBrandPickerVisible(true)}
      >
        <Text
          style={[
            styles.inputText,
            !make && styles.placeholderText,
          ]}
        >
          {make || "Choose a car brand"}
        </Text>
        <Ionicons
          name="chevron-down"
          size={20}
          color={COLORS.mutedForeground}
        />
      </Pressable>

      <TouchableOpacity
        style={[styles.submitButton, !make.trim() && styles.submitButtonDisabled]}
        onPress={handleNext}
        disabled={!make.trim()}
      >
        <Text style={styles.submitButtonText}>Next</Text>
      </TouchableOpacity>

      <BrandPickerModal
        brands={CAR_BRANDS}
        selectedBrand={make}
        visible={isBrandPickerVisible}
        onClose={() => setBrandPickerVisible(false)}
        onSelect={(brand) => {
          setMake(brand);
          setBrandPickerVisible(false);
        }}
        title="Select a car brand"
      />
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
  submitButton: {
    backgroundColor: COLORS.accent,
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: COLORS.foreground,
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default RequestMakeScreen;
