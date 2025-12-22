import { Redirect } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet, Image } from "react-native";

export default function Index() {
  // Use 'as any' to bypass the missing type definition for isLoading if necessary
  const { user, isLoading } = useAuth() as any;
  const [isSplashAnimationComplete, setSplashAnimationComplete] =
    useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashAnimationComplete(true);
    }, 3000); // Keep splash screen for 3 seconds

    return () => clearTimeout(timer);
  }, []);

  // Treat undefined user as loading state if isLoading is not explicitly returned
  const showSplash =
    !isSplashAnimationComplete ||
    isLoading ||
    (isLoading === undefined && user === undefined);

  if (showSplash) {
    return (
      <View style={styles.container}>
        <Image
          source={require("../assets/images/splash.png")}
          style={styles.splashImage}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color="#FFFFFF" style={styles.loader} />
      </View>
    );
  }

  if (user?.is_admin) {
    return <Redirect href="/(admin)/dashboard" />;
  }

  if (user?.is_dealer) {
    return <Redirect href="/(dealer)/dashboard" />;
  }

  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#A370F7",
    justifyContent: "center",
    alignItems: "center",
  },
  splashImage: {
    width: "100%",
    height: "100%",
  },
  loader: {
    position: "absolute",
    bottom: 50,
  },
});
