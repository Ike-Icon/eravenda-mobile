import { request } from './http';
import type { Cart, WishlistEntry } from '../types/api';

export interface AddToCartInput {
  product_id: string;
  quantity: number;
  color?: string | null;
  option?: string | null;
  size?: string | null;
}

/** The cart lives on the server (one per user). Every mutation returns the full updated cart. */
export const cartService = {
  get: () => request<Cart>('/cart'),
  add: (item: AddToCartInput) => request<Cart>('/cart/items', { method: 'POST', json: item }),
  /** The API re-uses CartItemIn for updates: product_id + new quantity. */
  setQuantity: (itemId: string, productId: string, quantity: number) =>
    request<Cart>(`/cart/items/${itemId}`, { method: 'PUT', json: { product_id: productId, quantity } }),
  remove: (itemId: string) => request<Cart>(`/cart/items/${itemId}`, { method: 'DELETE' }),
};

export const wishlistService = {
  list: () => request<WishlistEntry[]>('/wishlist'),
  add: (productId: string) => request<WishlistEntry>(`/wishlist/${productId}`, { method: 'POST' }),
  remove: (productId: string) => request<void>(`/wishlist/${productId}`, { method: 'DELETE' }),
};
