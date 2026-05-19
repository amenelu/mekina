import { useEffect } from "react";

import { saveRequestDraft } from "@/lib/requestDraft";
import { useAuth } from "@/hooks/useAuth";

export function useRequestDraftPersistence(
  pathname: string,
  params: Record<string, unknown>
) {
  const userId = useAuth((state) => state.user?.id);

  useEffect(() => {
    if (!userId) return;

    saveRequestDraft(pathname, params, userId).catch((error) => {
      console.error("Failed to save request draft:", error);
    });
  }, [pathname, JSON.stringify(params), userId]);
}
