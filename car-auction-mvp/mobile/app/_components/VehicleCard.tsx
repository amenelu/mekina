import React from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ImageBackground,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

const COLORS = {
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
};

export type Vehicle = {
  id: string;
  year: number;
  make: string;
  model: string;
  price: string;
  image: string;
  mileage: number;
  is_featured?: boolean;
  listingType: "Sale" | "Auction";
};

type VehicleCardProps = {
  item: Vehicle;
  isCompared?: boolean;
  onToggleCompare?: (id: string) => void;
};

const VehicleCard = ({
  item,
  isCompared,
  onToggleCompare,
}: VehicleCardProps) => {
  const router = useRouter();

  return (
    <Pressable
      style={styles.vehicleCard}
      onPress={() =>
        router.push({
          pathname: "/[id]",
          params: { id: item.id },
        })
      }
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
                item.listingType === "Sale" ? "#28a745" : COLORS.accent,
            },
          ]}
        >
          {item.listingType}
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
              style={styles.compareButton}
              onPress={() => onToggleCompare(item.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={isCompared ? "checkbox" : "square-outline"}
                size={24}
                color={isCompared ? COLORS.accent : "#fff"}
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
    width: "48%",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    marginBottom: 15,
    height: 250,
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
