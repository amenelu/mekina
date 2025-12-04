import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AdminHeaderRight from "../_components/AdminHeaderRight";

const COLORS = {
  card: "#1C212B",
  accent: "#A370F7",
  foreground: "#F8F8F8",
};

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: "#8A94A3",
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: "#313843",
        },
        headerStyle: {
          backgroundColor: COLORS.card,
          shadowColor: "transparent",
        },
        headerTitleStyle: { color: COLORS.foreground },
        headerRight: () => <AdminHeaderRight />,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => (
            <Ionicons name="grid" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: "Users",
          tabBarIcon: ({ color }) => (
            <Ionicons name="people" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="listings"
        options={{
          title: "Listings",
          tabBarIcon: ({ color }) => (
            <Ionicons name="car-sport" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="dealers"
        options={{
          title: "Dealers",
          tabBarIcon: ({ color }) => (
            <Ionicons name="briefcase" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="rentals"
        options={{
          title: "Rentals",
          tabBarIcon: ({ color }) => (
            <Ionicons name="key" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
