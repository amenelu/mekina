import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TextInput,
  Pressable,
  Alert,
  Image,
  Platform,
  RefreshControl,
} from "react-native";
import { useAuth } from "@/hooks/useAuth"; // Keep this import
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import {
  useWebPullToRefresh,
  WebPullToRefreshIndicator,
} from "@/components/_components/WebPullToRefresh";
import {
  deleteAdminListing,
  getAdminListings,
} from "@/lib/api/admin";
import { mediaUrl } from "@/lib/api/client";
import type { AdminListing } from "@/lib/api/types";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  mutedForeground: "#8A94A3",
  accent: "#A370F7",
  success: "#28a745",
  warning: "#ffc107",
  destructive: "#dc3545",
  // Add other colors if needed
};

const AdminListingsScreen = () => {
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const { token } = useAuth();
  const pullToRefresh = useWebPullToRefresh({
    refreshing,
    onRefresh: () => fetchListings(true),
  });

  // Function to fetch listings
  const fetchListings = useCallback(async (isRefresh = false) => {
    if (!token) return;
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const response = await getAdminListings(search);
      setListings(response.data.cars);
    } catch (error: any) {
      console.error(
        "Failed to fetch listings:",
        error.response ? error.response.data : error.message
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, token]);

  // Fetch on initial load and when search changes (debounced)
  useEffect(() => {
    const debounceFetch = setTimeout(() => {
      fetchListings();
    }, 300);
    return () => clearTimeout(debounceFetch);
  }, [fetchListings]);

  // Re-fetch when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchListings();
    }, [fetchListings])
  );

  const handleDelete = (listing: AdminListing) => {
    const message = `Are you sure you want to delete the ${listing.year} ${listing.make} ${listing.model}?`;

    const performDelete = async () => {
      try {
        await deleteAdminListing(listing.id);
        setListings((prev) => prev.filter((l) => l.id !== listing.id));
        if (Platform.OS === "web") {
          setStatusMessage("Listing has been deleted.");
        } else {
          Alert.alert("Success", "Listing has been deleted.");
        }
      } catch {
        if (Platform.OS === "web") {
          setStatusMessage("Failed to delete listing.");
        } else {
          Alert.alert("Error", "Failed to delete listing.");
        }
      }
    };

    if (Platform.OS === "web") {
      setStatusMessage(null);
      if (typeof window !== "undefined" && window.confirm(message)) {
        void performDelete();
      }
      return;
    }

    Alert.alert("Delete Listing", message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void performDelete();
        },
      },
    ]);
  };

  const ListingCard = ({ item }: { item: AdminListing }) => {
    const [imageLoading, setImageLoading] = useState(true);
    const router = useRouter();
    const imageUrl = mediaUrl(item.image_url);

    return (
      <View style={styles.card}>
        {imageUrl && (
          <View style={styles.cardImage}>
            <Image
              source={{ uri: imageUrl }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              onLoadEnd={() => setImageLoading(false)}
            />
            {imageLoading && (
              <ActivityIndicator
                style={StyleSheet.absoluteFill}
                color={COLORS.accent}
              />
            )}
          </View>
        )}
        <View style={styles.cardHeader}>
          <Text style={styles.title}>
            {item.year} {item.make} {item.model}
          </Text>
          <View style={styles.statusContainer}>
            <Text
              style={[
                styles.statusTag,
                {
                  backgroundColor: item.is_approved
                    ? COLORS.success
                    : COLORS.warning,
                },
              ]}
            >
              {item.is_approved ? "Approved" : "Pending"}
            </Text>
            {!item.is_active && (
              <Text
                style={[
                  styles.statusTag,
                  { backgroundColor: COLORS.destructive },
                ]}
              >
                Inactive
              </Text>
            )}
          </View>
        </View>
        <Text style={styles.subtitle}>
          Owner: {item.owner_username} · Type: {item.listing_type}
        </Text>
        <View style={styles.buttonContainer}>
          <Pressable
            style={[styles.button, styles.manageButton]}
            onPress={() => router.push(`/(details)/listings/${item.id}`)}
          >
            <Text style={styles.buttonText}>Manage</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.deleteButton]}
            onPress={() => handleDelete(item)}
          >
            <Text style={styles.buttonText}>Delete</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderItem = ({ item }: { item: AdminListing }) => (
    <ListingCard item={item} />
  );

  const listHeader = (
    <>
      <WebPullToRefreshIndicator
        pullDistance={pullToRefresh.pullDistance}
        readyToRefresh={pullToRefresh.readyToRefresh}
        refreshing={refreshing}
      />
      <View style={styles.searchBar}>
        <Ionicons
          name="search"
          size={20}
          color={COLORS.mutedForeground}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search all listings..."
          placeholderTextColor={COLORS.mutedForeground}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      {statusMessage ? (
        <Text
          style={[
            styles.statusMessage,
            statusMessage.startsWith("Failed")
              ? styles.statusMessageError
              : styles.statusMessageSuccess,
          ]}
        >
          {statusMessage}
        </Text>
      ) : null}
    </>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator
          size="large"
          color={COLORS.accent}
          style={{ marginTop: 20 }}
        />
      ) : (
        <FlatList
          {...pullToRefresh.panHandlers}
          data={listings}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 20 }}
          onScroll={pullToRefresh.handleScroll}
          scrollEventThrottle={16}
          ListHeaderComponent={listHeader}
          refreshControl={
            pullToRefresh.isWebEnabled ? undefined : (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchListings(true)}
                tintColor={COLORS.accent}
              />
            )
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No listings found.</Text>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: 50, color: COLORS.foreground, fontSize: 16 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  cardImage: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.foreground,
    flex: 1,
    marginRight: 10,
  },
  subtitle: { fontSize: 14, color: COLORS.mutedForeground, marginBottom: 12 },
  statusContainer: { flexDirection: "row", gap: 5 },
  statusTag: {
    color: "#fff",
    fontWeight: "bold",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontSize: 10,
    overflow: "hidden",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#313843",
    paddingTop: 10,
  },
  button: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  manageButton: { backgroundColor: COLORS.accent },
  deleteButton: { backgroundColor: COLORS.destructive },
  buttonText: { color: COLORS.foreground, fontWeight: "bold" },
  emptyText: {
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginTop: 50,
  },
  statusMessage: {
    marginBottom: 20,
    fontSize: 13,
    fontWeight: "600",
  },
  statusMessageSuccess: {
    color: "#7AE582",
  },
  statusMessageError: {
    color: "#FF7D7D",
  },
});

export default AdminListingsScreen;
