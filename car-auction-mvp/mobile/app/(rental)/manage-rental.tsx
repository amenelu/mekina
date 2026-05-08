import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import axios from "axios";

import API_BASE_URL from "@/constants/Api";
import { useAuth } from "@/hooks/useAuth";

const COLORS = {
  background: "#14181F",
  card: "#1C212B",
  text: "#F8F8F8",
  textSecondary: "#8A94A3",
  accent: "#A370F7",
  input: "#14181F",
  border: "#313843",
  destructive: "#dc3545",
};

type RentalCar = {
  id: number;
  make: string;
  model: string;
  year: number;
  description?: string;
  is_active: boolean;
  rental_listing?: {
    price_per_day: number;
    is_available: boolean;
  } | null;
};

export default function RentalEditListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth() as any;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [listing, setListing] = useState<RentalCar | null>(null);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [pricePerDay, setPricePerDay] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    const fetchListing = async () => {
      if (!id || !token) return;
      setLoading(true);
      try {
        const response = await axios.get(
          `${API_BASE_URL}/seller/api/rental-cars/${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const car = response.data.car as RentalCar;
        setListing(car);
        setMake(car.make);
        setModel(car.model);
        setYear(String(car.year));
        setPricePerDay(String(car.rental_listing?.price_per_day ?? ""));
        setDescription(car.description || "");
        setIsActive(car.is_active);
        setIsAvailable(Boolean(car.rental_listing?.is_available));
      } catch (error: any) {
        Alert.alert(
          "Load Failed",
          error.response?.data?.message || "Could not load rental listing."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [id, token]);

  const handleSave = async () => {
    if (!id || !token) return;
    if (!make || !model || !year || !pricePerDay) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    setSaving(true);
    try {
      const response = await axios.put(
        `${API_BASE_URL}/seller/api/rental-cars/${id}`,
        {
          make,
          model,
          year: Number(year),
          price_per_day: Number(pricePerDay),
          description,
          is_active: isActive,
          is_available: isAvailable,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setListing(response.data.car);
      Alert.alert("Success", response.data.message, [
        { text: "OK", onPress: () => router.replace("/(rental)/rental-dashboard") },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Save Failed",
        error.response?.data?.message || "Could not update rental listing."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!id || !token) return;
    Alert.alert(
      "Delete Rental",
      "Are you sure you want to permanently delete this rental listing?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await axios.delete(`${API_BASE_URL}/seller/api/rental-cars/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              router.replace("/(rental)/rental-dashboard");
            } catch (error: any) {
              Alert.alert(
                "Delete Failed",
                error.response?.data?.message || "Could not delete rental listing."
              );
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <ActivityIndicator
        size="large"
        color={COLORS.accent}
        style={styles.centered}
      />
    );
  }

  if (!listing) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.emptyText}>Rental listing not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.pageShell}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Rental Details</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Make</Text>
              <TextInput style={styles.input} value={make} onChangeText={setMake} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Model</Text>
              <TextInput style={styles.input} value={model} onChangeText={setModel} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Year</Text>
              <TextInput
                style={styles.input}
                value={year}
                onChangeText={setYear}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Price Per Day (ETB)</Text>
              <TextInput
                style={styles.input}
                value={pricePerDay}
                onChangeText={setPricePerDay}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                multiline
              />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Availability</Text>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Listing Active</Text>
              <Switch value={isActive} onValueChange={setIsActive} />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Vehicle Available</Text>
              <Switch value={isAvailable} onValueChange={setIsAvailable} />
            </View>
          </View>

          <Pressable
            style={styles.saveButton}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? "Saving..." : "Save Changes"}
            </Text>
          </Pressable>

          <Pressable style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>Delete Listing</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 20, paddingBottom: 32 },
  pageShell: {
    width: "100%",
    maxWidth: Platform.OS === "web" ? 980 : undefined,
    alignSelf: "center",
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  inputGroup: { marginBottom: 15 },
  label: { color: COLORS.textSecondary, fontSize: 14, marginBottom: 8 },
  input: {
    backgroundColor: COLORS.input,
    color: COLORS.text,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 16,
  },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  switchLabel: { color: COLORS.text, fontSize: 16 },
  saveButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
    marginBottom: 12,
  },
  saveButtonText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
  deleteButton: {
    backgroundColor: COLORS.destructive,
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
  },
  deleteButtonText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
  emptyText: { color: COLORS.textSecondary, textAlign: "center", marginTop: 40 },
});
