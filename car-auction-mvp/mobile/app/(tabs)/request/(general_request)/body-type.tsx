import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRequestDraftPersistence } from "@/hooks/useRequestDraftPersistence";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#6118D7",
  border: "#313843",
  mutedForeground: "#8A94A3",
};

export const bodyTypeOptions = [
  {
    label: "SUV",
    value: "SUV",
    image: require("@/assets/images/suv3 (1).webp"),
  },
  {
    label: "Sedan",
    value: "Sedan",
    image: require("@/assets/images/sedan3 (1).webp"),
  },
  {
    label: "Hatchback",
    value: "Hatchback",
    image: require("@/assets/images/hatchback3.webp"),
  },
  {
    label: "Pickup Truck",
    value: "Pickup",
    image: require("@/assets/images/pickup3 (1).webp"),
  },
];

const RequestBodyTypeScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  useRequestDraftPersistence("/request/body-type", { ...params });

  const handleSelect = (value: string) => {
    router.push({
      pathname: "./fuel-type",
      params: { ...params, body_type: value },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.counter}>2 / 5</Text>
        <Text style={styles.title}>What type of car best fits your needs?</Text>
        <View style={styles.optionsContainer}>
          {bodyTypeOptions.map((option) => {
            return (
              <TouchableOpacity
                key={option.value}
                style={styles.optionButton}
                onPress={() => handleSelect(option.value)}
              >
                <Image source={option.image} style={styles.optionImage} />
                <Text style={styles.optionText}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: COLORS.background,
    width: "100%",
    maxWidth: Platform.OS === "web" ? 780 : undefined,
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
  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  optionButton: {
    width: "48%", // Two columns with a small gap
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    overflow: "hidden", // Ensures image corners are rounded
    marginBottom: 15,
  },
  optionImage: {
    width: "100%",
    height: 120, // A fixed height for a better look
    resizeMode: "contain", // Ensure the whole image fits without being cropped
  },
  optionText: {
    color: COLORS.foreground,
    fontSize: 18,
    fontWeight: "500",
    paddingVertical: 15,
  },
});

export default RequestBodyTypeScreen;
