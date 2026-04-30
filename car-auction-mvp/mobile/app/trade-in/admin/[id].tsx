import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Pressable,
  Alert,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import axios from "axios";
import API_URL from "@/constants/Api";
import { useAuth } from "@/hooks/useAuth";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  mutedForeground: "#8A94A3",
  border: "#313843",
  success: "#28a745",
  warning: "#ffc107",
  destructive: "#dc3545",
  info: "#0dcaf0",
};

interface TradeInDetail {
  id: number;
  make: string;
  model: string;
  year: number;
  mileage: number;
  condition: string;
  vin: string;
  target_car: string;
  comments: string;
  status: string;
  created_at: string;
  user: {
    id: number;
    username: string;
    email: string;
  };
  photos: { id: number; image_url: string }[];
}

const TradeInAdminDetailScreen = () => {
  const { id } = useLocalSearchParams();
  const { token } = useAuth();
  const [request, setRequest] = useState<TradeInDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchDetails = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API_URL}/trade-in/api/admin/requests/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setRequest(response.data.request);
    } catch (error) {
      console.error("Error fetching trade-in details:", error);
      Alert.alert("Error", "Failed to load trade-in details.");
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      await axios.post(
        `${API_URL}/trade-in/api/admin/requests/${id}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("Success", `Status updated to ${newStatus}`);
      fetchDetails(); // Refresh data
    } catch (error) {
      console.error("Error updating status:", error);
      Alert.alert("Error", "Failed to update status.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Request not found.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: `Review Trade-in #${request.id}` }} />
      <ScrollView style={styles.container}>
        {/* Status Banner */}
        <View style={styles.statusBanner}>
          <Text style={styles.statusLabel}>Current Status:</Text>
          <Text
            style={[
              styles.statusValue,
              { color: getStatusColor(request.status) },
            ]}
          >
            {request.status.toUpperCase()}
          </Text>
        </View>

        {/* Vehicle Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Information</Text>
          <View style={styles.card}>
            <DetailRow
              label="Vehicle"
              value={`${request.year} ${request.make} ${request.model}`}
            />
            <DetailRow
              label="Mileage"
              value={`${request.mileage.toLocaleString()} km`}
            />
            <DetailRow label="Condition" value={request.condition} />
            <DetailRow label="VIN" value={request.vin || "N/A"} />
            <DetailRow
              label="Target Car"
              value={request.target_car || "None specified"}
            />
          </View>
        </View>

        {/* Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Photos ({request.photos.length})
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.photoScroll}
          >
            {request.photos.map((photo) => (
              <Image
                key={photo.id}
                source={{ uri: `${API_URL}${photo.image_url}` }}
                style={styles.photo}
              />
            ))}
          </ScrollView>
        </View>

        {/* User Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.card}>
            <DetailRow label="Username" value={request.user.username} />
            <DetailRow label="Email" value={request.user.email} />
            <DetailRow
              label="Comments"
              value={request.comments || "No comments"}
            />
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.actionGrid}>
            <ActionButton
              label="Mark Reviewed"
              color={COLORS.info}
              onPress={() => updateStatus("reviewed")}
              disabled={updating}
            />
            <ActionButton
              label="Contacted"
              color={COLORS.warning}
              onPress={() => updateStatus("contacted")}
              disabled={updating}
            />
            <ActionButton
              label="Approve (Active)"
              color={COLORS.success}
              onPress={() => updateStatus("active")}
              disabled={updating}
            />
            <ActionButton
              label="Complete"
              color={COLORS.mutedForeground}
              onPress={() => updateStatus("completed")}
              disabled={updating}
            />
            <ActionButton
              label="Reject"
              color={COLORS.destructive}
              onPress={() => updateStatus("rejected")}
              disabled={updating}
            />
          </View>
        </View>
      </ScrollView>
    </>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const ActionButton = ({ label, color, onPress, disabled }: any) => (
  <Pressable
    style={[
      styles.actionButton,
      { backgroundColor: color, opacity: disabled ? 0.6 : 1 },
    ]}
    onPress={onPress}
    disabled={disabled}
  >
    <Text style={styles.actionButtonText}>{label}</Text>
  </Pressable>
);

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "pending":
      return COLORS.warning;
    case "active":
      return COLORS.success;
    case "completed":
      return COLORS.mutedForeground;
    case "rejected":
      return COLORS.destructive;
    default:
      return COLORS.info;
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  errorText: { color: COLORS.destructive, fontSize: 16 },
  statusBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statusLabel: { color: COLORS.mutedForeground, fontSize: 16 },
  statusValue: { fontSize: 16, fontWeight: "bold" },
  section: { padding: 20, paddingBottom: 0 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.foreground,
    marginBottom: 10,
  },
  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 15 },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  detailLabel: { color: COLORS.mutedForeground, fontSize: 14, flex: 1 },
  detailValue: {
    color: COLORS.foreground,
    fontSize: 14,
    fontWeight: "600",
    flex: 2,
    textAlign: "right",
  },
  photoScroll: { flexDirection: "row" },
  photo: {
    width: 120,
    height: 90,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: COLORS.card,
  },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actionButton: {
    width: "48%",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
});

export default TradeInAdminDetailScreen;
