import { SITE_ORIGIN } from '../config/env';
import type { Product } from '../types/api';

/** Ghana cedi formatting, e.g. GH₵ 1,250.00 */
export function formatPrice(amount: number): string {
  return `GH₵ ${amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** The API returns absolute URLs (Cloudinary) or site-relative paths (/static/...). */
export function absoluteUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

export function primaryImage(product: Product): string | undefined {
  const img = product.images.find((i) => i.is_primary) ?? product.images[0];
  return absoluteUrl(img?.image_url);
}

/** The price the buyer pays: a valid discount wins over the list price. */
export function effectivePrice(p: Product): number {
  return p.discount_price && p.discount_price > 0 && p.discount_price < p.price ? p.discount_price : p.price;
}

export function discountPercent(p: Product): number {
  const now = effectivePrice(p);
  return now < p.price ? Math.round(((p.price - now) / p.price) * 100) : 0;
}

export function inStock(p: Product): boolean {
  return p.status === 'approved' && p.stock_quantity > 0;
}

/** Variants may arrive as strings or {name|label|value} objects; reduce to display strings. */
export function variantLabels(list: unknown[] | null | undefined): string[] {
  if (!list) return [];
  return list
    .map((v) => {
      if (typeof v === 'string') return v;
      if (v && typeof v === 'object') {
        const o = v as Record<string, unknown>;
        return String(o.name ?? o.label ?? o.value ?? '');
      }
      return '';
    })
    .filter(Boolean);
}
