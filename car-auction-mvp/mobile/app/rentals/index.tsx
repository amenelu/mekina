import { Redirect } from "expo-router";

import { useAuth } from "@/hooks/useAuth";
import { ADMIN_ROUTES, getPostLoginRoute } from "@/lib/roleRoutes";

export default function LegacyRentalIndexRedirect() {
  const { hasHydrated, user } = useAuth();

  if (!hasHydrated) {
    return null;
  }

  if (user?.is_admin) {
    return <Redirect href={ADMIN_ROUTES.rentals as any} />;
  }

  if (user?.is_dealer || user?.is_rental_company) {
    return <Redirect href={getPostLoginRoute(user) as any} />;
  }

  return <Redirect href="/(tabs)/rentals" />;
}
