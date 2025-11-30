import React, { useEffect, useRef } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import HeaderRight from "../_components/HeaderRight";
import { Animated, StyleSheet, TouchableOpacity, View } from "react-native";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
};

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
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name="search"
              size={28}
              color={focused ? COLORS.accent : "#fff"}
            />
          ),
          tabBarButton: (props) => <PulsatingTabBarButton {...props} />,
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
