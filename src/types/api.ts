/** Types mirror backend/app/schemas.py. Keep them in sync when the API changes. */
export type UserRole = 'buyer' | 'seller' | 'admin' | 'delivery';

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  is_verified: boolean;
  avatar_url: string | null;
  region: string | null;
  city: string | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  icon_url: string | null;
}

export interface ProductImage {
  id: string;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
}

export interface Product {
  id: string;
  store_id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  brand: string | null;
  condition: string;
  price: number;
  discount_price: number | null;
  stock_quantity: number;
  status: 'pending' | 'approved' | 'rejected' | 'out_of_stock';
  average_rating: number;
  review_count: number;
  colors: unknown[] | null;
  options: unknown[] | null;
  sizes: unknown[] | null;
  cod_eligible: boolean;
  sales_type: 'retail' | 'wholesale';
  wholesale_min_quantity: number | null;
  images: ProductImage[];
  created_at: string;
}

export interface ProductList {
  total: number;
  page: number;
  page_size: number;
  items: Product[];
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  color: string | null;
  option: string | null;
  size: string | null;
}

/** A wholesale product that blocks checkout: below the seller's minimum, or above stock. */
export interface WholesaleIssue {
  product_id: string;
  product_name: string;
  kind: 'minimum' | 'stock';
  minimum_quantity: number;
  current_quantity: number;
  available_stock: number;
  message: string;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
  wholesale_issues: WholesaleIssue[];
}

export interface WishlistEntry {
  id: string;
  product: Product;
  created_at: string;
}

export type HandymanStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type ServiceBookingStatus = 'requested' | 'assigned' | 'in_progress' | 'escrow_funded' | 'completion_requested' | 'completed' | 'released' | 'cancelled';
export interface ServicePortfolio { id: string; image_url: string; caption: string | null }
export interface Handyman {
  id: string; job_title: string; custom_job_title: string | null; professional_name: string | null; company_name: string | null;
  work_experience: string | null; education: string | null; qualifications: string; resume_path: string | null;
  status: HandymanStatus; verified_pro: boolean; background_checked: boolean; average_rating: number; review_count: number;
  badge_keys: string[] | null; safety_rating: number; portfolio: ServicePortfolio[]; created_at: string;
}
export interface ServiceJobPhoto { id: string; booking_id: string; uploaded_by: string; uploader_role: string; image_url: string; caption: string | null; created_at: string }
export interface ServiceReview { id: string; rating: number; comment: string | null; created_at: string }
export interface ServiceBooking {
  id: string; handyman_id: string; details: string; location: string | null; preferred_contact: string | null; contact_details: string | null;
  quoted_amount: number | null; escrow_amount: number; commission_amount: number; payout_amount: number; payout_status: string;
  payout_held: boolean; completion_requested_at: string | null; paid_at: string | null; payout_released_at: string | null;
  status: ServiceBookingStatus; created_at: string; photos: ServiceJobPhoto[]; review: ServiceReview | null;
}
export interface ProfessionalBooking extends Omit<ServiceBooking, 'handyman_id' | 'preferred_contact' | 'contact_details'> {
  client_name: string; client_phone: string | null;
}

// ---------- Phase 2 ----------
export interface Address {
  id: string;
  label: string | null;
  recipient_name: string;
  phone: string;
  region: string;
  city: string;
  area: string | null;
  sub_town: string | null;
  landmark: string | null;
  is_default: boolean;
}
export type AddressInput = Omit<Address, 'id'>;

export type OrderStatus = 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type PaymentMethod = 'cash_on_delivery' | 'mobile_money';

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  commission_amount: number;
  color: string | null;
  option: string | null;
  size: string | null;
  wholesale_min_quantity: number | null;
  image_url: string | null;
}

export interface Order {
  id: string;
  order_number: string;
  store_id: string;
  status: OrderStatus;
  subtotal: number;
  delivery_fee: number;
  is_pickup: boolean;
  order_type: 'retail' | 'wholesale';
  commission_amount: number;
  total_amount: number;
  payment_method: PaymentMethod;
  seller_note: string | null;
  shipping_carrier: string | null;
  tracking_number: string | null;
  estimated_delivery: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  items: OrderItem[];
  created_at: string;
}

export interface DeliveryQuote {
  delivery_fee: number;
  store_count: number;
}

export interface PaymentInit {
  authorization_url: string;
  access_code: string;
  reference: string;
}
export interface PaymentVerify {
  status: 'pending' | 'success' | 'failed' | 'refunded';
  order_id: string;
  order_status: OrderStatus;
  amount: number;
  reference: string;
}

export type ReportReason = 'spam' | 'counterfeit' | 'prohibited_item' | 'inappropriate' | 'scam' | 'other';

export interface BlockedStore {
  store_id: string;
  store_name: string;
}

export interface DeletionCheck {
  can_delete: boolean;
  blockers: string[];
  requires_password: boolean;
}

export interface NotificationPrefs {
  order_updates_email: boolean;
  order_updates_push: boolean;
  seller_orders_push: boolean;
}

export interface Store {
  id: string;
  store_name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  region: string | null;
  city: string | null;
  sub_town: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  rejection_reason: string | null;
  follower_count?: number;
  badge_keys?: string[] | null;
}

export interface StoreFollow {
  id: string;
  store: Store;
  created_at: string;
}

export interface StoreInput {
  store_name?: string;
  description?: string | null;
  region?: string | null;
  city?: string | null;
  sub_town?: string | null;
  logo_url?: string | null;
  banner_url?: string | null;
  business_registration_number?: string | null;
}

export interface ProductInput {
  name?: string;
  category_id?: string;
  description?: string;
  brand?: string;
  price?: number;
  discount_price?: number | null;
  stock_quantity?: number;
  cod_eligible?: boolean;
  sales_type?: 'retail' | 'wholesale';
  wholesale_min_quantity?: number | null;
  colors?: unknown[];
  sizes?: unknown[];
  options?: unknown[];
}
