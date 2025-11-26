import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  destructive: "#dc3545",
};

const ProfileScreen = () => {
  // Dummy user data
  const user = {
    username: "Amen",
  };

  const handleLogout = () => {
    // TODO: Implement logout logic
    console.log("Logging out...");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Hi, {user.username}!</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 40,
    color: COLORS.foreground,
  },
  logoutButton: {
    backgroundColor: COLORS.destructive,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  logoutButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});

export default ProfileScreen;
