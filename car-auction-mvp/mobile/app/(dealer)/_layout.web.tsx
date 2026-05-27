import React from "react";
import { Tabs, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSocket } from "../../contexts/SocketContext";
import AuthGate from "@/components/_components/AuthGate";

const COLORS = {
  background: "#14181F",
  card: "#1C212B",
  text: "#F8F8F8",
  textSecondary: "#8A94A3",
  accent: "#A370F7",
};

export default function DealerTabsLayoutWeb() {
  const { unreadMessageCount, unreadNotificationCount } = useSocket();
  const pathname = usePathname();
  const hideTabBar = [
    "/dealer-place-offer",
    "/place-offer",
    "/dealer-edit-listing",
    "/edit-listing",
    "/dealer-submit",
    "/submit",
    "/dealer-points",
    "/points",
    "/dealer-closed-deals",
    "/closed-deals",
  ].some((route) => pathname.includes(route));

  return (
    <AuthGate role="dealer">
      <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          display: hideTabBar ? "none" : "flex",
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.card,
        },
      }}
    >
      <Tabs.Screen
        name="dealer-dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => (
            <Ionicons name="grid" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="dealer-analytics"
        options={{
          title: "Analytics",
          tabBarIcon: ({ color }) => (
            <Ionicons name="stats-chart" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="dealer-messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color }) => (
            <Ionicons name="chatbubbles" size={24} color={color} />
          ),
          tabBarBadge: unreadMessageCount > 0 ? unreadMessageCount : undefined,
          tabBarBadgeStyle: { backgroundColor: COLORS.accent, color: "white" },
        }}
      />
      <Tabs.Screen
        name="dealer-notifications"
        options={{
          title: "Notifications",
          tabBarIcon: ({ color }) => (
            <Ionicons name="notifications" size={24} color={color} />
          ),
          tabBarBadge:
            unreadNotificationCount > 0 ? unreadNotificationCount : undefined,
          tabBarBadgeStyle: { backgroundColor: COLORS.accent, color: "white" },
        }}
      />
      <Tabs.Screen
        name="dealer-profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-circle" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="dealer-place-offer" options={{ href: null }} />
      <Tabs.Screen name="dealer-edit-listing" options={{ href: null }} />
      <Tabs.Screen name="dealer-submit" options={{ href: null }} />
      <Tabs.Screen name="dealer-points" options={{ href: null }} />
      <Tabs.Screen name="dealer-closed-deals" options={{ href: null }} />
      <Tabs.Screen name="dashboard" options={{ href: null }} />
      <Tabs.Screen name="analytics" options={{ href: null }} />
      <Tabs.Screen name="messages" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="place-offer" options={{ href: null }} />
      <Tabs.Screen name="edit-listing" options={{ href: null }} />
      <Tabs.Screen name="submit" options={{ href: null }} />
      <Tabs.Screen name="points" options={{ href: null }} />
      <Tabs.Screen name="closed-deals" options={{ href: null }} />
      </Tabs>
    </AuthGate>
  );
}
