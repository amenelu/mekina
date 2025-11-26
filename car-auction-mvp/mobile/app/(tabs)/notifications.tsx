import React from "react";
import { View, Text, StyleSheet } from "react-native";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
};

const NotificationsScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Notifications Screen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  text: { fontSize: 20, color: COLORS.foreground },
});

export default NotificationsScreen;
