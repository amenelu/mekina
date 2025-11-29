import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import HeaderRight from "../_components/HeaderRight";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
};

export default function TabsLayout() {
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
        headerRight: () => <HeaderRight />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Mekina",
          headerTitleAlign: "left",
          headerTitleStyle: {
            fontSize: 20,
            fontWeight: "bold",
            color: COLORS.foreground,
          },
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          // This screen is now accessed from the header, so we hide it from the tab bar.
          href: null,
        }}
      />
      <Tabs.Screen
        name="all_listings"
        options={{
          title: "Rentals",
          headerTitleAlign: "left",
          tabBarIcon: ({ color }) => (
            <Ionicons name="car" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="find"
        options={{
          title: "Find Car",
          tabBarIcon: ({ color }) => (
            <Ionicons name="search" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "My-requests",
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-circle" size={24} color={color} />
          ),
          headerShown: false, // Hiding header as profile screen uses SafeAreaView
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarIcon: ({ color }) => (
            <Ionicons name="notifications" size={24} color={color} />
          ),
        }}
      />
      {/* Add entries for all other screens in this directory to hide them from the tab bar */}
      <Tabs.Screen
        name="[id]" // This targets the dynamic route file [id].tsx
        options={{
          href: null, // Hide from tab bar
          headerRight: () => null, // Hide header icons on detail page
        }}
      />
      <Tabs.Screen
        name="sell"
        options={{
          href: null, // Hide the old 'sell' screen from the tab bar
        }}
      />
      <Tabs.Screen
        name="request" // This targets the (tabs)/request folder
        options={{
          href: null, // Hide this entire group from the tab bar
        }}
      />
    </Tabs>
  );
}
