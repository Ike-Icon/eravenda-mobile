import { File, Paths } from 'expo-file-system';
import type { Product } from '../types/api';

const wishlistFile = new File(Paths.document, 'eravenda-guest-wishlist.json');
let pendingWrite: Promise<void> = Promise.resolve();

export const guestWishlistStore = {
  async get(): Promise<Product[]> {
    await pendingWrite.catch(() => undefined);
    try {
      if (!wishlistFile.exists) return [];
      const parsed: unknown = JSON.parse(await wishlistFile.text());
      return Array.isArray(parsed) ? parsed.filter((item): item is Product => Boolean(item && typeof item === 'object' && typeof (item as Product).id === 'string')) : [];
    } catch {
      return [];
    }
  },

  save(products: Product[]): Promise<void> {
    pendingWrite = pendingWrite.catch(() => undefined).then(async () => {
      if (!wishlistFile.exists) wishlistFile.create();
      await wishlistFile.write(JSON.stringify(products));
    });
    return pendingWrite;
  },
};
