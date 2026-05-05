import { Redirect } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { View, ActivityIndicator, StyleSheet, Image, Platform } from "react-native";
import { useEffect } from "react";

export default function Index() {
  const { user, isLoading, hasHydrated, setIsLoading, setHasHydrated } =
    useAuth() as any;

  useEffect(() => {
    if (!hasHydrated && isLoading) {
      const timer = setTimeout(() => {
        setIsLoading(false);
        setHasHydrated(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [hasHydrated, isLoading, setHasHydrated, setIsLoading]);

  // Show splash while auth state is loading
  const showSplash =
    Platform.OS !== "web" && !hasHydrated && (isLoading || user === undefined);

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
