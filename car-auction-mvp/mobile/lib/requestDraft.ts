import {
  deleteItemAsync,
  getItemAsync,
  setItemAsync,
} from "@/lib/appStorage";

const REQUEST_DRAFT_KEY = "request_flow_draft";

export type RequestDraftParams = Record<string, string | string[]>;

export type RequestDraft = {
  pathname: string;
  params: RequestDraftParams;
  updatedAt: string;
};

function normalizeParams(
  params: Record<string, unknown> | undefined
): RequestDraftParams {
  const normalized: RequestDraftParams = {};

  if (!params) return normalized;

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    if (Array.isArray(value)) {
      const items = value
        .map((item) => (item == null ? "" : String(item)))
        .filter(Boolean);

      if (items.length > 0) {
        normalized[key] = items;
      }
      return;
    }

    normalized[key] = String(value);
  });

  return normalized;
}

export async function saveRequestDraft(
  pathname: string,
  params?: Record<string, unknown>
) {
  const draft: RequestDraft = {
    pathname,
    params: normalizeParams(params),
    updatedAt: new Date().toISOString(),
  };

  await setItemAsync(REQUEST_DRAFT_KEY, JSON.stringify(draft));
}

export async function loadRequestDraft(): Promise<RequestDraft | null> {
  const rawValue = await getItemAsync(REQUEST_DRAFT_KEY);
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue) as RequestDraft;
    if (!parsed?.pathname) return null;
    return {
      pathname: parsed.pathname,
      params: normalizeParams(parsed.params),
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function clearRequestDraft() {
  await deleteItemAsync(REQUEST_DRAFT_KEY);
}
