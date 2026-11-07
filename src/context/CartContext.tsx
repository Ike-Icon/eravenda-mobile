/**
 * Signed-in carts live on the API; guest carts persist on this device and are
 * merged into the account cart after sign-in.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { cartService, wishlistService, type AddToCartInput } from '../services/cartService';
import { guestCartStore, guestLineId, type GuestCartLine } from '../services/guestCartStore';
import { guestWishlistStore } from '../services/guestWishlistStore';
import type { Cart, CartItem, Product } from '../types/api';
import { effectivePrice } from '../utils/format';
import { lineUnitPrice } from '../utils/variants';
import { useAuth } from './AuthContext';

interface CartValue {
  cart: Cart | null;
  count: number;
  loading: boolean;
  refresh: () => Promise<void>;
  addItem: (input: AddToCartInput, product: Product) => Promise<void>;
  setQuantity: (itemId: string, productId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  wishlistIds: Set<string>;
  wishlistProducts: Product[];
  toggleWishlist: (productId: string, product?: Product) => Promise<void>;
}

const CartContext = createContext<CartValue | null>(null);

function guestCart(lines: GuestCartLine[]): Cart {
  const items: CartItem[] = lines.map((line) => ({
    id: line.local_id,
    product: line.product,
    quantity: line.quantity,
    color: line.color ?? null,
    option: line.option ?? null,
    size: line.size ?? null,
  }));
  return {
    id: 'guest-cart',
    items,
    subtotal: lines.reduce((sum, line) => sum + lineUnitPrice(line.product, line.option ?? null, effectivePrice(line.product)) * line.quantity, 0),
    wholesale_issues: [],
  };
}

function combinedCart(serverCart: Cart | null, guestLines: GuestCartLine[]): Cart | null {
  const local = guestCart(guestLines);
  if (!serverCart) return guestLines.length ? local : null;
  if (!guestLines.length) return serverCart;
  return {
    ...serverCart,
    items: [...serverCart.items, ...local.items],
    subtotal: serverCart.subtotal + local.subtotal,
  };
}

function linePayload({ local_id: _localId, product: _product, ...payload }: GuestCartLine): AddToCartInput {
  return payload;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [guestReady, setGuestReady] = useState(false);
  const guestLinesRef = useRef<GuestCartLine[]>([]);
  const guestWishlistRef = useRef<Product[]>([]);
  const serverCartRef = useRef<Cart | null>(null);
  const refreshPromiseRef = useRef<Promise<void> | null>(null);

  const updateVisibleCart = useCallback((server: Cart | null, guest: GuestCartLine[] = guestLinesRef.current) => {
    serverCartRef.current = server;
    setCart(combinedCart(server, guest));
  }, []);

  const setGuestLines = useCallback(async (lines: GuestCartLine[]) => {
    guestLinesRef.current = lines;
    await guestCartStore.save(lines);
    setCart(combinedCart(serverCartRef.current, lines));
  }, []);

  const refresh = useCallback((): Promise<void> => {
    if (status !== 'signedIn') return Promise.resolve();
    if (refreshPromiseRef.current) return refreshPromiseRef.current;

    const pending = (async () => {
      setLoading(true);
      try {
        const [cartResult, wishlistResult] = await Promise.allSettled([cartService.get(), wishlistService.list()]);
        let serverWishlistIds = new Set<string>();
        let localWishlist = await guestWishlistStore.get();
        if (wishlistResult.status === 'fulfilled') {
          const serverProducts = wishlistResult.value.map((entry) => entry.product);
          serverWishlistIds = new Set(serverProducts.map((product) => product.id));
          for (const product of [...localWishlist]) {
            if (serverWishlistIds.has(product.id)) {
              localWishlist = localWishlist.filter((item) => item.id !== product.id);
              continue;
            }
            try {
              await wishlistService.add(product.id);
              serverWishlistIds.add(product.id);
              localWishlist = localWishlist.filter((item) => item.id !== product.id);
            } catch {
              // Keep unsynced guest saves on-device and retry the next time the cart refreshes.
            }
          }
          await guestWishlistStore.save(localWishlist);
          guestWishlistRef.current = localWishlist;
          setWishlistProducts(localWishlist);
          setWishlistIds(new Set([...serverWishlistIds, ...localWishlist.map((product) => product.id)]));
        } else {
          guestWishlistRef.current = localWishlist;
          setWishlistProducts(localWishlist);
          setWishlistIds(new Set(localWishlist.map((product) => product.id)));
        }
        let remaining = await guestCartStore.get();
        guestLinesRef.current = remaining;
        if (cartResult.status === 'rejected') {
          // Keep locally stored guest items usable even when the account cart endpoint is offline.
          updateVisibleCart(null, remaining);
          return;
        }
        let currentServerCart = cartResult.value;

        // Remove each local line only after the API accepts it, so a failed request stays visible and can retry.
        for (const line of [...remaining]) {
          try {
            currentServerCart = await cartService.add(linePayload(line));
            remaining = remaining.filter((candidate) => candidate.local_id !== line.local_id);
            guestLinesRef.current = remaining;
            await guestCartStore.save(remaining);
          } catch {
            break;
          }
        }

        updateVisibleCart(currentServerCart, remaining);
      } finally {
        setLoading(false);
      }
    })();
    refreshPromiseRef.current = pending;
    void pending.finally(() => { if (refreshPromiseRef.current === pending) refreshPromiseRef.current = null; }).catch(() => undefined);
    return pending;
  }, [status, updateVisibleCart]);

  useEffect(() => {
    let active = true;
    Promise.all([guestCartStore.get(), guestWishlistStore.get()]).then(([lines, savedWishlist]) => {
      if (!active) return;
      guestLinesRef.current = lines;
      guestWishlistRef.current = savedWishlist;
      setWishlistProducts(savedWishlist);
      setWishlistIds(new Set(savedWishlist.map((product) => product.id)));
      setGuestReady(true);
      if (status === 'signedOut') updateVisibleCart(null, lines);
      setLoading(false);
    });
    return () => { active = false; };
    // Read local guest data exactly once; auth transitions are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!guestReady) return;
    if (status === 'signedIn') {
      void refresh().catch(() => undefined);
    } else if (status === 'signedOut') {
      serverCartRef.current = null;
      setCart(guestCart(guestLinesRef.current));
      setWishlistProducts(guestWishlistRef.current);
      setWishlistIds(new Set(guestWishlistRef.current.map((product) => product.id)));
      setLoading(false);
    }
  }, [guestReady, refresh, status]);

  const value = useMemo<CartValue>(() => ({
    cart,
    count: cart?.items.reduce((count, item) => count + item.quantity, 0) ?? 0,
    loading,
    refresh,
    addItem: async (input, product) => {
      if (status === 'signedIn') {
        if (refreshPromiseRef.current) await refreshPromiseRef.current.catch(() => undefined);
        const updated = await cartService.add(input);
        updateVisibleCart(updated);
        return;
      }

      const localId = guestLineId(input);
      const current = guestLinesRef.current;
      const existing = current.find((line) => line.local_id === localId);
      const next = existing
        ? current.map((line) => line.local_id === localId ? { ...line, quantity: line.quantity + input.quantity } : line)
        : [...current, { ...input, local_id: localId, product }];
      await setGuestLines(next);
    },
    setQuantity: async (itemId, productId, quantity) => {
      if (itemId.startsWith('guest:')) {
        const next = guestLinesRef.current.map((line) => line.local_id === itemId && line.product_id === productId ? { ...line, quantity } : line);
        await setGuestLines(next);
        return;
      }
      if (refreshPromiseRef.current) await refreshPromiseRef.current.catch(() => undefined);
      updateVisibleCart(await cartService.setQuantity(itemId, productId, quantity));
    },
    removeItem: async (itemId) => {
      if (itemId.startsWith('guest:')) {
        await setGuestLines(guestLinesRef.current.filter((line) => line.local_id !== itemId));
        return;
      }
      if (refreshPromiseRef.current) await refreshPromiseRef.current.catch(() => undefined);
      updateVisibleCart(await cartService.remove(itemId));
    },
    wishlistIds,
    toggleWishlist: async (productId, product) => {
      if (status !== 'signedIn') {
        const alreadySaved = guestWishlistRef.current.some((item) => item.id === productId);
        if (!alreadySaved && !product) throw new Error('Could not save this product. Please try again.');
        const next = alreadySaved
          ? guestWishlistRef.current.filter((item) => item.id !== productId)
          : [...guestWishlistRef.current, product!];
        guestWishlistRef.current = next;
        await guestWishlistStore.save(next);
        setWishlistProducts(next);
        setWishlistIds(new Set(next.map((item) => item.id)));
        return;
      }
      if (guestWishlistRef.current.some((item) => item.id === productId)) {
        const next = guestWishlistRef.current.filter((item) => item.id !== productId);
        guestWishlistRef.current = next;
        await guestWishlistStore.save(next);
        setWishlistProducts(next);
        setWishlistIds((previous) => {
          const updated = new Set(previous);
          updated.delete(productId);
          return updated;
        });
        return;
      }
      const has = wishlistIds.has(productId);
      setWishlistIds((previous) => {
        const next = new Set(previous);
        has ? next.delete(productId) : next.add(productId);
        return next;
      });
      try {
        if (has) await wishlistService.remove(productId);
        else await wishlistService.add(productId);
      } catch (error) {
        setWishlistIds((previous) => {
          const next = new Set(previous);
          has ? next.add(productId) : next.delete(productId);
          return next;
        });
        throw error;
      }
    },
    wishlistProducts,
  }), [cart, loading, refresh, setGuestLines, status, updateVisibleCart, wishlistIds, wishlistProducts]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
