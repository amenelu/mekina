import React from "react";
import { View, Text, Pressable, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");

const COLORS = {
  accent: "#A370F7",
  background: "#14181F",
  text: "#F8F8F8",
  textSecondary: "#8A94A3",
};

interface SegmentedControlProps {
  tabs: string[];
  currentIndex: number;
  onChange: (index: number) => void;
}

const SegmentedControl: React.FC<SegmentedControlProps> = ({
  tabs,
  currentIndex,
  onChange,
}) => {
  const segmentWidth = (width - 80) / tabs.length; // 20 padding on each side of formCard

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: withTiming(currentIndex * segmentWidth) }],
    };
  });

  return (
    <View style={[styles.container, { width: segmentWidth * tabs.length }]}>
      <Animated.View
        style={[styles.activeBox, { width: segmentWidth }, animatedStyle]}
      />
      {tabs.map((tab, index) => (
        <Pressable
          key={tab}
          onPress={() => onChange(index)}
          style={[styles.tab, { width: segmentWidth }]}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  currentIndex === index ? COLORS.text : COLORS.textSecondary,
              },
            ]}
          >
            {tab}
          </Text>
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: COLORS.background,
    borderRadius: 10,
    height: 44,
    marginBottom: 20,
  },
  activeBox: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
  },
  tab: { justifyContent: "center", alignItems: "center" },
  tabText: { fontWeight: "bold", fontSize: 14 },
});

export default SegmentedControl;
