import { request } from './http';
import type { Category, ProductList, Product, Store, StoreFollow } from '../types/api';

export interface ProductQuery {
  q?: string;
  category_id?: string;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'rating';
  page?: number;
  page_size?: number;
  sales_type?: 'retail' | 'wholesale';
  cod_eligible?: boolean;
  /** Needs the optional backend patch in /backend-patch; older servers ignore it. */
  store_id?: string;
}

/** Public endpoints: no token needed, so browsing works before login. */
export const catalogService = {
  categories: (signal?: AbortSignal) => request<Category[]>('/categories', { auth: false, signal }),
  products: (query: ProductQuery, signal?: AbortSignal) =>
    request<ProductList>('/products', { query: query as Record<string, string | number | boolean | undefined>, auth: false, signal }),
  product: (id: string) => request<Product>(`/products/${id}`, { auth: false }),
  /** Public store profile (name, logo, location, follower count). */
  store: (id: string) => request<Store>(`/stores/${id}`, { auth: false }),
  following: () => request<StoreFollow[]>('/stores/following'),
  followStatus: (id: string) => request<{ is_following: boolean }>(`/stores/${id}/follow-status`),
  follow: (id: string) => request<unknown>(`/stores/${id}/follow`, { method: 'POST' }),
  unfollow: (id: string) => request<void>(`/stores/${id}/follow`, { method: 'DELETE' }),
};
