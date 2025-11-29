import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";

const COLORS = {
  foreground: "#F8F8F8",
  mutedForeground: "#8A94A3",
  destructive: "#dc3545",
};

const HeaderRight = () => {
  return (
    <View style={styles.container}>
      <Link href="/(tabs)/messages" asChild>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={26}
            color={COLORS.mutedForeground}
          />
          {/* Add a badge here when you have unread messages */}
          {/* <View style={styles.badge}><Text style={styles.badgeText}>3</Text></View> */}
        </TouchableOpacity>
      </Link>

      <Link href="/(tabs)/profile" asChild>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons
            name="person-circle-outline"
            size={28}
            color={COLORS.mutedForeground}
          />
        </TouchableOpacity>
      </Link>
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
    right: -6,
    top: -3,
    backgroundColor: COLORS.destructive,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
});

export default HeaderRight;
