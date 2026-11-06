/**
 * CART STATE FLOW
 *  The server owns the cart. This context keeps the latest copy so the tab badge,
 *  product page and cart screen stay in sync.
 *  signed in  -> GET /cart. signed out -> cart cleared.
 *  add/update/remove -> API call -> replace local cart with the response.
 *  Wishlist ids are tracked here too so heart icons render instantly.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { cartService, wishlistService, type AddToCartInput } from '../services/cartService';
import type { Cart } from '../types/api';
import { useAuth } from './AuthContext';

interface CartValue {
  cart: Cart | null;
  count: number;
  loading: boolean;
  refresh: () => Promise<void>;
  addItem: (input: AddToCartInput) => Promise<void>;
  setQuantity: (itemId: string, productId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  wishlistIds: Set<string>;
  toggleWishlist: (productId: string) => Promise<void>;
}

const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (status !== 'signedIn') return;
    setLoading(true);
    try {
      const [c, w] = await Promise.all([cartService.get(), wishlistService.list()]);
      setCart(c);
      setWishlistIds(new Set(w.map((e) => e.product.id)));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    if (status === 'signedIn') void refresh().catch(() => undefined);
    else {
      setCart(null);
      setWishlistIds(new Set());
    }
  }, [status, refresh]);

  const value = useMemo<CartValue>(
    () => ({
      cart,
      count: cart?.items.reduce((n, i) => n + i.quantity, 0) ?? 0,
      loading,
      refresh,
      addItem: async (input) => setCart(await cartService.add(input)),
      setQuantity: async (itemId, productId, quantity) => setCart(await cartService.setQuantity(itemId, productId, quantity)),
      removeItem: async (itemId) => setCart(await cartService.remove(itemId)),
      wishlistIds,
      toggleWishlist: async (productId) => {
        const has = wishlistIds.has(productId);
        // Optimistic update, rolled back if the API call fails.
        setWishlistIds((prev) => {
          const next = new Set(prev);
          has ? next.delete(productId) : next.add(productId);
          return next;
        });
        try {
          if (has) await wishlistService.remove(productId);
          else await wishlistService.add(productId);
        } catch (e) {
          setWishlistIds((prev) => {
            const next = new Set(prev);
            has ? next.add(productId) : next.delete(productId);
            return next;
          });
          throw e;
        }
      },
    }),
    [cart, loading, refresh, wishlistIds],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
