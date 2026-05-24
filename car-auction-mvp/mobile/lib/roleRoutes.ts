import { Platform } from "react-native";
import type { User } from "@/hooks/useAuth";

const isWeb = Platform.OS === "web";

export const PUBLIC_HOME_ROUTE = "/(tabs)";
export const LOGIN_ROUTE = "/(auth)/login";

export const ADMIN_ROUTES = {
  root: isWeb ? "/(admin)/admin-dashboard" : "/(admin)/dashboard",
  dashboard: isWeb ? "/(admin)/admin-dashboard" : "/(admin)/dashboard",
  users: isWeb ? "/(admin)/admin-users" : "/(admin)/users",
  listings: isWeb ? "/(admin)/admin-listings" : "/(admin)/listings",
  dealers: isWeb ? "/(admin)/admin-dealers" : "/(admin)/dealers",
  rentals: isWeb ? "/(admin)/admin-rentals" : "/(admin)/rentals",
  messages: isWeb ? "/(admin)/admin-messages" : "/(admin)/messages",
  pointRequests: isWeb
    ? "/(admin)/admin-point-requests"
    : "/(admin)/point-requests",
  notifications: isWeb
    ? "/(admin)/admin-notifications"
    : "/(admin)/admin-notifications",
} as const;

export const DEALER_ROUTES = {
  root: isWeb ? "/(dealer)/dealer-dashboard" : "/(dealer)/dashboard",
  dashboard: isWeb ? "/(dealer)/dealer-dashboard" : "/(dealer)/dashboard",
  analytics: isWeb ? "/(dealer)/dealer-analytics" : "/(dealer)/analytics",
  messages: isWeb ? "/(dealer)/dealer-messages" : "/(dealer)/messages",
  notifications: isWeb
    ? "/(dealer)/dealer-notifications"
    : "/(dealer)/notifications",
  profile: isWeb ? "/(dealer)/dealer-profile" : "/(dealer)/profile",
  submit: isWeb ? "/(dealer)/dealer-submit" : "/(dealer)/submit",
  editListing: isWeb
    ? "/(dealer)/dealer-edit-listing"
    : "/(dealer)/edit-listing",
  placeOffer: isWeb
    ? "/(dealer)/dealer-place-offer"
    : "/(dealer)/place-offer",
  points: isWeb ? "/(dealer)/dealer-points" : "/(dealer)/points",
} as const;

export const RENTAL_ROUTES = {
  root: "/(rental)/rental-dashboard",
  dashboard: "/(rental)/rental-dashboard",
  profile: "/(rental)/rental-profile",
  addRental: "/(rental)/add-rental",
  manageRental: "/(rental)/manage-rental",
  points: isWeb ? "/(rental)/rental-points" : "/(rental)/points",
} as const;

export function getPostLoginRoute(user: User | null | undefined) {
  if (user?.is_admin) {
    return ADMIN_ROUTES.root;
  }

  if (user?.is_dealer) {
    return DEALER_ROUTES.root;
  }

  if (user?.is_rental_company) {
    return RENTAL_ROUTES.root;
  }

  return PUBLIC_HOME_ROUTE;
}

export function toWebRoute(route: string) {
  if (!isWeb) {
    return route;
  }

  const normalized = route.replace(/\/\([^/]+\)/g, "");
  return normalized || "/";
}
