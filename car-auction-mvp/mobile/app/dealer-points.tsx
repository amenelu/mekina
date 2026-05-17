import React from "react";
import { Stack } from "expo-router";

import DealerPointsRequestScreen from "@/components/_components/DealerPointsRequestScreen";

export default function DealerPointsRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <DealerPointsRequestScreen />
    </>
  );
}
