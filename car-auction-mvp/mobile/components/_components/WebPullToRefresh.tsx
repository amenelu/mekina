import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

const COLORS = {
  accent: "#6118D7",
  textSecondary: "#8A94A3",
};

function isInsideHorizontalScroller(target: unknown) {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return false;
  }

  let element = target instanceof HTMLElement ? target : null;
  while (element && element !== document.body) {
    const style = window.getComputedStyle(element);
    const canScrollHorizontally =
      /(auto|scroll)/.test(style.overflowX) &&
      element.scrollWidth > element.clientWidth;
    if (canScrollHorizontally) {
      return true;
    }
    element = element.parentElement;
  }

  return false;
}

type UseWebPullToRefreshOptions = {
  onRefresh: () => void;
  refreshing: boolean;
  threshold?: number;
};

export function useWebPullToRefresh({
  onRefresh,
  refreshing,
  threshold = 72,
}: UseWebPullToRefreshOptions) {
  const enabled = Platform.OS === "web";
  const scrollOffsetY = useRef(0);
  const pullDistanceRef = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    const win = window as any;
    win.__mekinaWebPullRefreshHandlers =
      (win.__mekinaWebPullRefreshHandlers || 0) + 1;

    return () => {
      win.__mekinaWebPullRefreshHandlers = Math.max(
        (win.__mekinaWebPullRefreshHandlers || 1) - 1,
        0
      );
    };
  }, [enabled]);

  useEffect(() => {
    if (!refreshing) {
      pullDistanceRef.current = 0;
      setPullDistance(0);
    }
  }, [refreshing]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (event, gestureState) =>
          enabled &&
          !refreshing &&
          scrollOffsetY.current <= 0 &&
          !isInsideHorizontalScroller(event?.nativeEvent?.target) &&
          gestureState.dy > 8 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderMove: (_, gestureState) => {
          if (!enabled || refreshing || scrollOffsetY.current > 0) {
            return;
          }

          const nextDistance = Math.max(
            0,
            Math.min(110, gestureState.dy * 0.55)
          );
          pullDistanceRef.current = nextDistance;
          setPullDistance(nextDistance);
        },
        onPanResponderRelease: () => {
          if (!enabled) {
            return;
          }

          const shouldRefresh = pullDistanceRef.current >= threshold;
          pullDistanceRef.current = 0;
          setPullDistance(0);

          if (shouldRefresh && !refreshing) {
            onRefresh();
          }
        },
        onPanResponderTerminate: () => {
          if (enabled) {
            pullDistanceRef.current = 0;
            setPullDistance(0);
          }
        },
      }),
    [enabled, onRefresh, refreshing, threshold]
  );

  return {
    panHandlers: enabled ? panResponder.panHandlers : {},
    pullDistance,
    readyToRefresh: pullDistance >= threshold,
    handleScroll: (event: any) => {
      scrollOffsetY.current = event?.nativeEvent?.contentOffset?.y ?? 0;
    },
    isWebEnabled: enabled,
  };
}

export function WebPullToRefreshIndicator({
  pullDistance,
  readyToRefresh,
  refreshing,
}: {
  pullDistance: number;
  readyToRefresh: boolean;
  refreshing: boolean;
}) {
  if (Platform.OS !== "web" && !refreshing) {
    return null;
  }

  const visibleHeight = refreshing ? 52 : pullDistance;

  return (
    <View style={[styles.container, { height: visibleHeight }]}>
      {visibleHeight > 8 ? (
        refreshing ? (
          <View style={styles.refreshingRow}>
            <ActivityIndicator size="small" color={COLORS.accent} />
            <Text style={styles.text}>Refreshing...</Text>
          </View>
        ) : (
          <Text style={styles.text}>
            {readyToRefresh ? "Release to refresh" : "Pull to refresh"}
          </Text>
        )
      ) : null}
    </View>
  );
}

export default function WebPullToRefreshRoutePlaceholder() {
  return null;
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  refreshingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  text: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
});
