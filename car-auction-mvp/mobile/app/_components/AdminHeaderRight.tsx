import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "expo-router";

const COLORS = {
  mutedForeground: "#8A94A3",
};

const AdminHeaderRight = () => {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.iconButton} onPress={handleLogout}>
        <Ionicons
          name="log-out-outline"
          size={28}
          color={COLORS.mutedForeground}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 15,
    gap: 15,
  },
  iconButton: {
    position: "relative",
  },
});

export default AdminHeaderRight;