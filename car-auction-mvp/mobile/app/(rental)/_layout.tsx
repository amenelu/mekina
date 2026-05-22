import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AuthGate from "@/components/_components/AuthGate";

const COLORS = {
  card: "#1C212B",
  textSecondary: "#8A94A3",
  accent: "#A370F7",
};

export default function RentalTabsLayout() {
  return (
    <AuthGate role="rental">
      <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.card,
          height: 60,
          paddingTop: 6,
          paddingBottom: 6,
        },
      }}
    >
      <Tabs.Screen
        name="rental-dashboard"
        options={{
          title: "Fleet",
          tabBarIcon: ({ color }) => (
            <Ionicons name="car-sport" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="rental-profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <Ionicons name="business" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="add-rental"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="manage-rental"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen name="points" options={{ href: null }} />
      <Tabs.Screen name="rental-points" options={{ href: null }} />
      </Tabs>
    </AuthGate>
  );
}
