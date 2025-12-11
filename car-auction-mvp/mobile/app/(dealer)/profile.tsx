import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import { router } from "expo-router";

const COLORS = {
  background: "#14181F",
  text: "#F8F8F8",
  destructive: "#dc3545",
};

const ProfileScreen = () => {
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.replace("/(auth)/login");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>
      <View style={styles.content}>
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 20 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: COLORS.text },
  content: { flex: 1, justifyContent: "center", alignItems: "center" },
  logoutButton: {
    backgroundColor: COLORS.destructive,
    paddingHorizontal: 50,
    paddingVertical: 15,
    borderRadius: 8,
  },
  logoutButtonText: { color: "white", fontWeight: "bold", fontSize: 16 },
});

export default ProfileScreen;
