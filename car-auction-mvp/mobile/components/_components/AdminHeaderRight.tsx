import React from "react";
import { View, TouchableOpacity, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "expo-router";
import { ADMIN_ROUTES, PUBLIC_HOME_ROUTE } from "@/lib/roleRoutes";
import { useSocket } from "@/contexts/SocketContext";

const COLORS = {
  mutedForeground: "#8A94A3",
};

const AdminHeaderRight = () => {
  const { logout } = useAuth();
  const { unreadNotificationCount } = useSocket();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace(PUBLIC_HOME_ROUTE as any);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={() => router.push(ADMIN_ROUTES.notifications as any)}
      >
        <Ionicons
          name="notifications-outline"
          size={26}
          color={COLORS.mutedForeground}
        />
        {unreadNotificationCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
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
  badge: {
    position: "absolute",
    top: -6,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#A370F7",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#F8F8F8",
    fontSize: 10,
    fontWeight: "700",
  },
});

export default AdminHeaderRight;
