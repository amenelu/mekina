import React, { useEffect, useRef } from "react";
import { Tabs, usePathname, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import HeaderRight from "@/components/_components/HeaderRight";
import {
  Animated,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSocket } from "../../contexts/SocketContext";
import { useAuth } from "@/hooks/useAuth";
import { showNativeFlowAlert } from "@/lib/nativeFlowAlert";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
};

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

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

export default function TabsLayoutWeb() {
  const pathname = usePathname();
  const router = useRouter();
  const { unreadNotificationCount } = useSocket();
  const { user } = useAuth();

  const isTabBarVisible = !pathname.startsWith("/request/");

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: "#8A94A3",
        tabBarStyle: {
          display: isTabBarVisible ? "flex" : "none",
          backgroundColor: COLORS.card,
          borderTopColor: "#313843",
          height: 64,
          paddingTop: 6,
          paddingBottom: 6,
          overflow: "visible",
        },
        headerStyle: {
          backgroundColor: COLORS.card,
          shadowColor: "transparent",
          height: 52,
        },
        headerTitleStyle: {
          color: COLORS.foreground,
          fontSize: 18,
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
        name="request"
        options={{
          title: "Find Car",
          headerTitle: "Find Car",
          tabBarIcon: () => <Ionicons name="search" size={30} color="#fff" />,
          tabBarButton: (props) => (
            <WebTabBarButton
              {...props}
              onPress={(e: any) => {
                if (!user) {
                  showNativeFlowAlert(
                    "Login Required",
                    "Please log in to find a car.",
                    () => router.push("/login"),
                    "Login"
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
          headerTitleAlign: "left",
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
          headerTitleAlign: "left",
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
