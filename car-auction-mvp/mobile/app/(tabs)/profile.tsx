import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import { useRouter, useFocusEffect } from "expo-router";
import axios from "axios";
import API_BASE_URL from "@/constants/Api";
import VehicleCard, { Vehicle } from "../_components/VehicleCard";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  destructive: "#dc3545",
  card: "#1C212B",
  accent: "#A370F7",
  mutedForeground: "#8A94A3",
  border: "#313843",
};

const ProfileScreen = () => {
  const { user, logout, token } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"favorites" | "settings">(
    "favorites"
  );
  const [favorites, setFavorites] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFavorites = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/users/favorites`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = response.data.favorites || response.data;
      const list = Array.isArray(data) ? data : [];

      const formattedCars: Vehicle[] = list.map((item: any) => ({
        id: item.id.toString(),
        year: item.year,
        make: item.make,
        model: item.model,
        price: item.price_display || "N/A",
        image: item.primary_image_url || item.image_url || "",
        mileage: item.mileage || 0,
        listingType: item.listing_type
          ? item.listing_type.charAt(0).toUpperCase() +
            item.listing_type.slice(1)
          : "Sale",
      }));
      setFavorites(formattedCars);
    } catch (error) {
      console.error("Failed to fetch favorites:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (activeTab === "favorites") {
        fetchFavorites();
      }
    }, [activeTab, token])
  );

  const handleRemoveFavorite = (carId: string) => {
    Alert.alert(
      "Remove Favorite",
      "Are you sure you want to remove this car from your favorites?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            if (!token) return;
            try {
              await axios.post(
                `${API_BASE_URL}/api/cars/${carId}/toggle-favorite`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
              );
              setFavorites((prev) => prev.filter((item) => item.id !== carId));
            } catch (error) {
              console.error("Failed to remove favorite:", error);
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const renderContent = () => {
    if (activeTab === "settings") {
      return (
        <View style={styles.settingsContainer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      );
    }

    return (
      <FlatList
        data={favorites}
        renderItem={({ item }) => (
          <View style={styles.favoriteCardWrapper}>
            <VehicleCard item={item} style={styles.card} />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveFavorite(item.id)}
            >
              <Ionicons
                name="heart-dislike"
                size={24}
                color={COLORS.destructive}
              />
            </TouchableOpacity>
          </View>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="heart-dislike-outline"
              size={64}
              color={COLORS.mutedForeground}
            />
            <Text style={styles.emptyText}>
              You haven't liked any cars yet.
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => router.push("/(tabs)/all_listings")}
            >
              <Text style={styles.browseButtonText}>Browse Cars</Text>
            </TouchableOpacity>
          </View>
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Hi, {user?.username || "User"}!</Text>
      </View>

      <View style={styles.tabsContainer}>
        <Pressable
          style={[styles.tab, activeTab === "favorites" && styles.activeTab]}
          onPress={() => setActiveTab("favorites")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "favorites" && styles.activeTabText,
            ]}
          >
            Favorites
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "settings" && styles.activeTab]}
          onPress={() => setActiveTab("settings")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "settings" && styles.activeTabText,
            ]}
          >
            Settings
          </Text>
        </Pressable>
      </View>

      <View style={styles.content}>{renderContent()}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.foreground,
  },
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: COLORS.accent,
  },
  tabText: {
    fontSize: 16,
    color: COLORS.mutedForeground,
    fontWeight: "600",
  },
  activeTabText: {
    color: COLORS.foreground,
  },
  content: {
    flex: 1,
  },
  settingsContainer: {
    flex: 1,
    padding: 20,
    alignItems: "center",
  },
  logoutButton: {
    backgroundColor: COLORS.destructive,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  logoutButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  card: {
    marginBottom: 0,
    width: "100%",
  },
  favoriteCardWrapper: {
    position: "relative",
    marginBottom: 20,
  },
  removeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 8,
    borderRadius: 25,
    zIndex: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 50,
  },
  emptyText: {
    color: COLORS.mutedForeground,
    fontSize: 16,
    marginTop: 15,
    marginBottom: 20,
  },
  browseButton: {
    backgroundColor: COLORS.card,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  browseButtonText: {
    color: COLORS.accent,
    fontWeight: "600",
  },
});

export default ProfileScreen;
