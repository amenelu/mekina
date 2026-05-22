export interface PendingPointRequestSummary {
  requested_points: number;
  request_count: number;
  latest_request_id: number;
}

export interface AdminDashboardStats {
  user_count: number;
  active_auction_count: number;
  pending_point_request_count: number;
  for_sale_count: number;
  for_rent_count: number;
  pending_approval_count: number;
  pending_trade_in_count: number;
}

export interface AdminPendingListing {
  id: number;
  year: number;
  make: string;
  model: string;
  listing_type: string;
  owner: {
    id: number;
    username: string;
  };
}

export interface AdminTradeInRequest {
  id: number;
  make: string;
  model: string;
  year: number;
  condition: string;
  status: string;
  created_at: string;
}

export interface AdminListing {
  id: number;
  year: number;
  make: string;
  model: string;
  owner_username: string;
  listing_type: string;
  image_url?: string;
  is_approved: boolean;
  is_active: boolean;
}

export interface AdminDealer {
  id: number;
  username: string;
  email: string;
  is_dealer?: boolean;
  is_rental_company?: boolean;
  account_type?: string;
  active_listings: number;
  avg_rating: number;
  review_count: number;
  pending_point_request?: PendingPointRequestSummary | null;
}

export interface AdminRental {
  id: number;
  year: number;
  make: string;
  model: string;
  owner_id: number;
  owner_username: string;
  owner_pending_point_request?: PendingPointRequestSummary | null;
  price_per_day: string;
  is_approved: boolean;
  is_active: boolean;
}
