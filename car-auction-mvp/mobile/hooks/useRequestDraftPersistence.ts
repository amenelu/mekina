import { useEffect } from "react";

import { saveRequestDraft } from "@/lib/requestDraft";

export function useRequestDraftPersistence(
  pathname: string,
  params: Record<string, unknown>
) {
  useEffect(() => {
    saveRequestDraft(pathname, params).catch((error) => {
      console.error("Failed to save request draft:", error);
    });
  }, [pathname, JSON.stringify(params)]);
}
