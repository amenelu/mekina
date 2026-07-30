import React from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ImageBackground,
  StyleProp,
  ViewStyle,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

const COLORS = {
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#6118D7",
};

export type Vehicle = {
  id: string; // Expects a string for router params
  year: number;
  make: string;
  model: string;
  price: string; // The formatted price string to display
  image: string; // The image URL to display
  mileage: number;
  condition?: string;
  body_type?: string;
  drivetrain?: string;
  fuel_type?: string;
  electric_range_km?: number | null;
  is_featured?: boolean;
  listingType: "Sale" | "Auction" | "Rental" | "sale" | "auction" | "rental"; // The type of listing
};

type VehicleCardProps = {
  item: Vehicle;
  isCompared?: boolean;
  isFavorite?: boolean;
  onToggleCompare?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onPress?: (id: string) => void;
  style?: StyleProp<ViewStyle>;
};

const VehicleCard = ({
  item,
  isCompared,
  isFavorite,
  onToggleCompare,
  onToggleFavorite,
  onPress,
  style,
}: VehicleCardProps) => {
  const router = useRouter();
  const listingType = item.listingType.toLowerCase();

  return (
    <Pressable
      testID={`vehicle-card-${item.id}`}
      style={[styles.vehicleCard, Platform.OS === "web" && styles.webVehicleCard, style]}
      onPress={() => {
        if (onPress) {
          onPress(item.id);
          return;
        }

        router.push({
          pathname: "/[id]",
          params: { id: item.id },
        });
      }}
    >
      <ImageBackground
        source={{ uri: item.image }}
        style={styles.vehicleCardImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.8)"]}
          style={styles.gradientOverlay}
        />
        {item.is_featured && (
          <View style={styles.featuredTagContainer}>
            <Text style={styles.featuredTag}>Featured</Text>
          </View>
        )}
        <Text
          style={[
            styles.vehicleCardTag,
            {
              backgroundColor:
                listingType === "sale" ? "#28a745" : COLORS.accent,
            },
          ]}
        >
          {listingType === "sale"
            ? "Sale"
            : listingType === "rental"
            ? "Rental"
            : "Auction"}
        </Text>
        <View style={styles.infoContainer}>
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.7)", "rgba(0,0,0,0.9)"]}
            style={styles.infoGradient}
          />
          <View style={styles.infoTextContainer}>
            <Text
              style={styles.vehicleCardTitle}
              numberOfLines={2}
            >{`${item.year} ${item.make} ${item.model}`}</Text>
            <Text style={styles.vehicleCardPrice}>{item.price}</Text>
          </View>
          {onToggleCompare && (
            <Pressable
              testID={`vehicle-card-compare-${item.id}`}
              style={styles.compareButton}
              onPress={(event) => {
                event.stopPropagation();
                onToggleCompare(item.id);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={isCompared ? "checkbox" : "square-outline"}
                size={24}
                color={isCompared ? COLORS.accent : "#fff"}
              />
            </Pressable>
          )}
          {onToggleFavorite && (
            <Pressable
              testID={`vehicle-card-favorite-${item.id}`}
              style={styles.favoriteButton}
              onPress={(event) => {
                event.stopPropagation();
                onToggleFavorite(item.id);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={24}
                color={isFavorite ? "#e74c3c" : "#fff"}
              />
            </Pressable>
          )}
        </View>
      </ImageBackground>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  vehicleCard: {
    width: "48%", // This will be overridden by the style prop if provided
    backgroundColor: COLORS.card,
    borderRadius: 12,
    marginBottom: 15,
    height: 250,
  },
  webVehicleCard: {
    touchAction: "pan-y",
  },
  vehicleCardImage: {
    width: "100%",
    height: "100%",
    justifyContent: "space-between",
    borderRadius: 12,
    overflow: "hidden",
  },
  gradientOverlay: { ...StyleSheet.absoluteFillObject },
  vehicleCardTag: {
    position: "absolute",
    top: 10,
    right: 10,
    color: COLORS.foreground,
    fontSize: 12,
    fontWeight: "600",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    overflow: "hidden",
  },
  infoContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  infoGradient: { ...StyleSheet.absoluteFillObject },
  infoTextContainer: { flex: 1, marginRight: 10 },
  vehicleCardTitle: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  vehicleCardPrice: { fontSize: 14, color: COLORS.accent, marginTop: 5 },
  compareButton: {},
  favoriteButton: { marginLeft: 10 },
  featuredTagContainer: {
    position: "absolute",
    top: 10,
    left: 10,
  },
  featuredTag: {
    backgroundColor: COLORS.accent,
    color: COLORS.foreground,
    fontSize: 12,
    fontWeight: "bold",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: "hidden",
  },
});

export default VehicleCard;
