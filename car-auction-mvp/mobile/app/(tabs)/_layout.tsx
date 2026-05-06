import React, { useEffect, useRef } from "react";
import { Tabs, usePathname, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import HeaderRight from "../_components/HeaderRight";
import {
  Animated,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { useSocket } from "../../contexts/SocketContext";
import { useAuth } from "@/hooks/useAuth";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
};

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

// Custom component for the pulsating button
const PulsatingTabBarButton = ({ children, onPress }: any) => {
  const pulseAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(pulseAnimation, {
        toValue: 1,
        duration: 2000, // The pulsation will take 2 seconds
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop(); // Cleanup animation on component unmount
  }, [pulseAnimation]);

  // We create an animated style for the outer ring
  const animatedStyle = {
    transform: [
      {
        scale: pulseAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.4], // The ring will scale up by 40%
        }),
      },
    ],
    opacity: pulseAnimation.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.8, 1, 0], // The ring will fade out as it expands
    }),
  };

  return (
    <TouchableOpacity onPress={onPress} style={styles.pulsatingButtonContainer}>
      {/* The outer, pulsating ring */}
      <Animated.View style={[styles.pulsatingRing, animatedStyle]} />

      {/* The inner, static button that contains the icon */}
      <View style={styles.innerButton}>{children}</View>
    </TouchableOpacity>
  );
};

const WebTabBarButton = ({ children, onPress }: any) => {
  const pulseAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnimation]);

  const animatedStyle = {
    transform: [
      {
        scale: pulseAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.06],
        }),
      },
    ],
    opacity: pulseAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0.94, 1],
    }),
    shadowOpacity: pulseAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0.24, 0.42],
    }),
  };

  return (
    <View style={styles.webTabButtonContainer}>
      <AnimatedTouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={[styles.webInnerButton, animatedStyle]}
      >
        {children}
      </AnimatedTouchableOpacity>
    </View>
  );
};

export default function TabsLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { unreadNotificationCount } = useSocket();
  const { user } = useAuth();
  const RequestTabButton = Platform.OS === "web" ? WebTabBarButton : PulsatingTabBarButton;

  // Determine if the tab bar should be visible.
  // We hide it on the request detail page.
  const isTabBarVisible = !pathname.startsWith("/request/");

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: "#8A94A3",
        tabBarStyle: {
          display: isTabBarVisible ? "flex" : "none", // Dynamically hide/show tab bar
          backgroundColor: COLORS.card,
          borderTopColor: "#313843",
          height: Platform.OS === "web" ? 64 : undefined,
          paddingTop: Platform.OS === "web" ? 6 : undefined,
          paddingBottom: Platform.OS === "web" ? 6 : undefined,
          overflow: Platform.OS === "web" ? "visible" : undefined,
        },
        headerStyle: {
          backgroundColor: COLORS.card,
          shadowColor: "transparent",
          height: Platform.OS === "web" ? 52 : undefined,
        },
        headerTitleStyle: {
          color: COLORS.foreground,
          fontSize: Platform.OS === "web" ? 18 : undefined,
        },
        headerRight: () => <HeaderRight />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerTitle: "Home",
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
        name="rentals"
        options={{
          title: "Rentals",
          headerTitle: "Rentals",
          headerTitleAlign: "left",
          tabBarIcon: ({ color }) => (
            <Ionicons name="car-sport" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="request" // Point the tab directly to the request flow
        options={{
          title: "Find Car",
          headerTitle: "Find Car",
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name="search"
              size={Platform.OS === "web" ? 30 : 28}
              color={Platform.OS === "web" ? "#fff" : focused ? COLORS.accent : "#fff"}
            />
          ),
          tabBarButton: (props) => (
            <RequestTabButton
              {...props}
              onPress={(e: any) => {
                if (!user) {
                  if (Platform.OS === "web") {
                    router.push("/login");
                    return;
                  }

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
          headerShown: false, // This will hide the main header for the request flow
        }}
      />
      <Tabs.Screen
        name="my-requests"
        options={{
          title: "My Requests",
          headerTitle: "My Requests",
          headerTitleAlign: "left",
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-circle" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null, // This will hide the button from the tab bar
          headerShown: false, // Hiding header as profile screen uses SafeAreaView
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          headerTitle: "Notifications",
          headerTitleAlign: "left",
          tabBarIcon: ({ color }) => (
            <Ionicons name="notifications" size={24} color={color} />
          ),
          tabBarBadge:
            unreadNotificationCount > 0 ? unreadNotificationCount : undefined,
          tabBarBadgeStyle: { backgroundColor: COLORS.accent, color: "white" },
        }}
      />
      {/* --- Hidden Screens --- */}
      {/* This screen exists but should not have a button on the tab bar. */}
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
  webTabButtonContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    marginTop: -26,
  },
  webInnerButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#101317",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#F4F4F4",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
  },
});
