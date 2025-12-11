import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const COLORS = {
  background: "#14181F",
  text: "#F8F8F8",
};

const NotificationsScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.emptyText}>No new notifications.</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 20 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: COLORS.text },
  content: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: COLORS.text, fontSize: 16 },
});

export default NotificationsScreen;
