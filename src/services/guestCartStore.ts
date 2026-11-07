import { File, Paths } from 'expo-file-system';
import type { AddToCartInput } from './cartService';
import type { Product } from '../types/api';

export interface GuestCartLine extends AddToCartInput {
  local_id: string;
  product: Product;
}

const cartFile = new File(Paths.document, 'eravenda-guest-cart.json');
let pendingWrite: Promise<void> = Promise.resolve();

export const guestCartStore = {
  async get(): Promise<GuestCartLine[]> {
    await pendingWrite.catch(() => undefined);
    try {
      if (!cartFile.exists) return [];
      const parsed = JSON.parse(await cartFile.text());
      return Array.isArray(parsed) ? parsed as GuestCartLine[] : [];
    } catch {
      return [];
    }
  },

  save(lines: GuestCartLine[]): Promise<void> {
    pendingWrite = pendingWrite.catch(() => undefined).then(async () => {
      if (!cartFile.exists) cartFile.create();
      await cartFile.write(JSON.stringify(lines));
    });
    return pendingWrite;
  },
};

export function guestLineId(input: Pick<AddToCartInput, 'product_id' | 'color' | 'size' | 'option'>) {
  return `guest:${JSON.stringify([input.product_id, input.color ?? '', input.size ?? '', input.option ?? ''])}`;
}
