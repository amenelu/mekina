import {
  deleteItemAsync,
  getItemAsync,
  setItemAsync,
} from "@/lib/appStorage";

const RECENT_SUBMITTED_REQUESTS_KEY = "recent_submitted_requests";

export type RecentSubmittedRequest = {
  id: number;
  make: string | null;
  model: string | null;
  request_source?: "image_based" | "specific" | "general";
  min_year?: number | null;
  status: string;
  notes: string;
  created_at: string;
  offer_count?: number;
  deal_id: number | null;
  type?: "buy" | "trade-in";
  images?: { image_url: string }[];
  image_urls?: string[];
  detail_score?: number;
  user_id?: number;
};

function normalizeRequest(value: any): RecentSubmittedRequest | null {
  if (!value || typeof value.id !== "number") {
    return null;
  }

  return {
    id: value.id,
    make: value.make ?? null,
    model: value.model ?? null,
    request_source: value.request_source,
    min_year: value.min_year ?? null,
    status: value.status || "active",
    notes: value.notes || value.comments || "",
    created_at: value.created_at || new Date().toISOString(),
    offer_count: value.offer_count ?? value.bid_count ?? 0,
    deal_id: value.deal_id ?? null,
    type: value.type || "buy",
    images: value.images || [],
    image_urls: value.image_urls || [],
    detail_score: value.detail_score,
    user_id: value.user_id,
  };
}

function storageKey(userId?: number | null) {
  return userId
    ? `${RECENT_SUBMITTED_REQUESTS_KEY}:${userId}`
    : RECENT_SUBMITTED_REQUESTS_KEY;
}

export async function saveRecentSubmittedRequest(
  request: unknown,
  userId?: number | null
) {
  const normalized = normalizeRequest(request);
  if (!normalized) {
    return;
  }

  const existing = await loadRecentSubmittedRequests(userId);
  const merged = [
    normalized,
    ...existing.filter(
      (item) => !(item.id === normalized.id && item.type === normalized.type)
    ),
  ].slice(0, 10);

  await setItemAsync(storageKey(userId), JSON.stringify(merged));
}

export async function loadRecentSubmittedRequests(userId?: number | null) {
  const raw = await getItemAsync(storageKey(userId));
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => normalizeRequest(item))
      .filter((item): item is RecentSubmittedRequest => Boolean(item));
  } catch {
    return [];
  }
}

export async function clearRecentSubmittedRequests(userId?: number | null) {
  await deleteItemAsync(storageKey(userId));
}

export function mergeRecentSubmittedRequests<T extends RecentSubmittedRequest>(
  apiRequests: T[],
  recentRequests: RecentSubmittedRequest[]
) {
  const apiKeys = new Set(
    apiRequests.map((item) => `${item.type || "buy"}:${item.id}`)
  );

  return [
    ...recentRequests.filter(
      (item) => !apiKeys.has(`${item.type || "buy"}:${item.id}`)
    ),
    ...apiRequests,
  ];
}
