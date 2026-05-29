import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AdminHeaderRight from "@/components/_components/AdminHeaderRight";
import AuthGate from "@/components/_components/AuthGate";

const COLORS = {
  card: "#1C212B",
  accent: "#A370F7",
  foreground: "#F8F8F8",
};

export default function AdminLayout() {
  return (
    <AuthGate role="admin">
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
        headerTitleAlign: "center",
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
      <Tabs.Screen name="analytics" options={{ href: null }} />
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
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color }) => (
            <Ionicons name="chatbubbles" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="admin-dashboard" options={{ href: null }} />
      <Tabs.Screen name="admin-analytics" options={{ href: null }} />
      <Tabs.Screen name="admin-users" options={{ href: null }} />
      <Tabs.Screen name="admin-listings" options={{ href: null }} />
      <Tabs.Screen name="admin-dealers" options={{ href: null }} />
      <Tabs.Screen name="admin-rentals" options={{ href: null }} />
      <Tabs.Screen name="admin-messages" options={{ href: null }} />
      <Tabs.Screen name="point-requests" options={{ href: null }} />
      <Tabs.Screen name="admin-point-requests" options={{ href: null }} />
      <Tabs.Screen name="admin-notifications" options={{ href: null }} />
      </Tabs>
    </AuthGate>
  );
}
