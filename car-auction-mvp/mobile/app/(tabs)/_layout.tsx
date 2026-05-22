import React, { useEffect, useRef } from "react";
import { Tabs, usePathname, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import HeaderRight from "@/components/_components/HeaderRight";
import {
  Animated,
  StyleSheet,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { useSocket } from "../../contexts/SocketContext";
import { useAuth } from "@/hooks/useAuth";
import { getPostLoginRoute } from "@/lib/roleRoutes";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
};

const PulsatingTabBarButton = ({ children, onPress }: any) => {
  const pulseAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(pulseAnimation, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnimation]);

  const animatedStyle = {
    transform: [
      {
        scale: pulseAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.4],
        }),
      },
    ],
    opacity: pulseAnimation.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.8, 1, 0],
    }),
  };

  return (
    <TouchableOpacity onPress={onPress} style={styles.pulsatingButtonContainer}>
      <Animated.View style={[styles.pulsatingRing, animatedStyle]} />
      <View style={styles.innerButton}>{children}</View>
    </TouchableOpacity>
  );
};

export default function TabsLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { unreadNotificationCount } = useSocket();
  const { user, hasHydrated } = useAuth();

  const isTabBarVisible = !pathname.startsWith("/request/");

  useEffect(() => {
    if (
      hasHydrated &&
      (user?.is_admin || user?.is_dealer || user?.is_rental_company)
    ) {
      router.replace(getPostLoginRoute(user) as any);
    }
  }, [hasHydrated, router, user]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: "#8A94A3",
        tabBarStyle: {
          display: isTabBarVisible ? "flex" : "none",
          backgroundColor: COLORS.card,
          borderTopColor: "#313843",
        },
        headerStyle: {
          backgroundColor: COLORS.card,
          shadowColor: "transparent",
        },
        headerTitleStyle: { color: COLORS.foreground },
        headerTitleAlign: "center",
        headerRight: () => <HeaderRight />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerTitle: "Home",
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
        name="rentals"
        options={{
          title: "Rentals",
          headerTitle: "Rentals",
          tabBarIcon: ({ color }) => (
            <Ionicons name="car-sport" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="request"
        options={{
          title: "Find Car",
          headerTitle: "Find Car",
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name="search"
              size={28}
              color={focused ? COLORS.accent : "#fff"}
            />
          ),
          tabBarButton: (props) => (
            <PulsatingTabBarButton
              {...props}
              onPress={(e: any) => {
                if (!user) {
                  Alert.alert(
                    "Login Required",
                    "Please log in to find a car.",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Login", onPress: () => router.push("/login") },
                    ]
                  );
                } else {
                  props.onPress?.(e);
                }
              }}
            />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="my-requests"
        options={{
          title: "My Requests",
          headerTitle: "My Requests",
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-circle" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          headerTitle: "Notifications",
          tabBarIcon: ({ color }) => (
            <Ionicons name="notifications" size={24} color={color} />
          ),
          tabBarBadge:
            unreadNotificationCount > 0 ? unreadNotificationCount : undefined,
          tabBarBadgeStyle: { backgroundColor: COLORS.accent, color: "white" },
        }}
      />
      <Tabs.Screen name="all_listings" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  pulsatingButtonContainer: {
    position: "relative",
    width: 70,
    height: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  pulsatingRing: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  innerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
});
