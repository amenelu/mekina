import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  border: "#313843",
  mutedForeground: "#8A94A3",
};

const TradeInScreen = () => {
  const router = useRouter();
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [mileage, setMileage] = useState("");
  const [vin, setVin] = useState("");
  const [comments, setComments] = useState("");

  const handleImagePick = () => {
    // In a real app, you would use a library like expo-image-picker
    Alert.alert("Image Picker", "This would open the image gallery.");
  };

  const handleSubmit = () => {
    // In a real app, you would validate and send this data to your API
    console.log({ make, model, year, mileage, vin, comments });
    Alert.alert(
      "Offer Submitted",
      "Thank you! We will review your submission and get back to you with a trade-in offer soon.",
      [{ text: "OK", onPress: () => router.back() }]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: "Get a Trade-in Offer" }} />
      <View style={styles.header}>
        <Text style={styles.title}>Trade-in Your Car</Text>
        <Text style={styles.subtitle}>
          Tell us about your car to get a competitive trade-in offer.
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.formGrid}>
          <TextInput
            style={styles.input}
            placeholder="Make (e.g., Toyota)"
            placeholderTextColor={COLORS.mutedForeground}
            value={make}
            onChangeText={setMake}
          />
          <TextInput
            style={styles.input}
            placeholder="Model (e.g., Vitz)"
            placeholderTextColor={COLORS.mutedForeground}
            value={model}
            onChangeText={setModel}
          />
        </View>
        <View style={styles.formGrid}>
          <TextInput
            style={styles.input}
            placeholder="Year (e.g., 2018)"
            placeholderTextColor={COLORS.mutedForeground}
            value={year}
            onChangeText={setYear}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            placeholder="Mileage (e.g., 55000)"
            placeholderTextColor={COLORS.mutedForeground}
            value={mileage}
            onChangeText={setMileage}
            keyboardType="numeric"
          />
        </View>

        <TextInput
          style={styles.input}
          placeholder="VIN (17-digit Vehicle Identification Number)"
          placeholderTextColor={COLORS.mutedForeground}
          value={vin}
          onChangeText={setVin}
          autoCapitalize="characters"
        />

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Mention any upgrades, recent repairs, or known issues..."
          placeholderTextColor={COLORS.mutedForeground}
          value={comments}
          onChangeText={setComments}
          multiline
        />

        <Pressable style={styles.imagePickerButton} onPress={handleImagePick}>
          <Ionicons name="camera" size={20} color={COLORS.accent} />
          <Text style={styles.imagePickerText}>Upload Photos</Text>
        </Pressable>

        <Pressable style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Submit for Offer</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 20, paddingBottom: 10 },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.foreground,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginTop: 8,
  },
  form: { padding: 20, gap: 15 },
  formGrid: { flexDirection: "row", gap: 15 },
  input: {
    flex: 1,
    backgroundColor: COLORS.card,
    color: COLORS.foreground,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 16,
  },
  textArea: { height: 100, textAlignVertical: "top" },
  imagePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "transparent",
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.accent,
    borderStyle: "dashed",
  },
  imagePickerText: { color: COLORS.accent, fontSize: 16, fontWeight: "600" },
  submitButton: {
    backgroundColor: COLORS.accent,
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  submitButtonText: {
    color: COLORS.foreground,
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default TradeInScreen;
