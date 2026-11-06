/**
 * Variant helpers shared by the seller editor and the buyer product page.
 *
 * Server shapes (backend/app/schemas.py normalizers):
 *   colors : { name, hex, stock, available }
 *   sizes  : { label, stock, available }                       (stock only, base price)
 *   options: { label, price, discount_price, stock, available } (own price, e.g. "250ml")
 * Product.stock_quantity is recomputed by the server from variant stock
 * (sizes first, then colors, then options), so the stock field is read-only when variants exist.
 * Legacy rows may be plain strings; they are treated as available.
 */
import type { Product } from '../types/api';

const rec = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});
const str = (v: unknown) => (v === undefined || v === null ? '' : String(v));

// ---------------- Seller drafts (all fields are strings while typing) ----------------
export interface ColorDraft { name: string; hex: string; stock: string; available: boolean }
export interface SizeDraft { label: string; stock: string; available: boolean }
export interface OptionDraft { label: string; price: string; discount: string; stock: string; available: boolean }
export interface VariantDrafts { colors: ColorDraft[]; sizes: SizeDraft[]; options: OptionDraft[] }

export const emptyDrafts = (): VariantDrafts => ({ colors: [], sizes: [], options: [] });

export function draftsFromProduct(p?: Product): VariantDrafts {
  if (!p) return emptyDrafts();
  return {
    colors: (p.colors ?? []).map((c) => {
      if (typeof c === 'string') return { name: c, hex: '', stock: '0', available: true };
      const o = rec(c);
      return { name: str(o.name), hex: str(o.hex), stock: str(o.stock ?? 0), available: o.available !== false };
    }),
    sizes: (p.sizes ?? []).map((s) => {
      if (typeof s === 'string') return { label: s, stock: '0', available: true };
      const o = rec(s);
      return { label: str(o.label ?? o.name), stock: str(o.stock ?? 0), available: o.available !== false };
    }),
    options: (p.options ?? []).map((s) => {
      const o = rec(s);
      return { label: str(o.label ?? o.name), price: str(o.price), discount: str(o.discount_price), stock: str(o.stock ?? 0), available: o.available !== false };
    }),
  };
}

const int = (s: string) => (s.trim() === '' ? 0 : Number(s));
const isInt = (s: string) => s.trim() === '' || /^\d+$/.test(s.trim());
const blank = (...v: string[]) => v.every((x) => x.trim() === '' || x.trim() === '0');

/** Rows the seller added but left empty are dropped silently. */
export function cleanDrafts(d: VariantDrafts): VariantDrafts {
  return {
    colors: d.colors.filter((c) => !(blank(c.name, c.hex, c.stock))),
    sizes: d.sizes.filter((s) => !(blank(s.label, s.stock))),
    options: d.options.filter((o) => !(blank(o.label, o.price, o.discount, o.stock))),
  };
}

/** Returns a message for the first problem, or null when everything is valid. */
export function validateDrafts(raw: VariantDrafts): string | null {
  const d = cleanDrafts(raw);
  const dup = (labels: string[]) => new Set(labels.map((l) => l.trim().toLowerCase())).size !== labels.length;

  for (const c of d.colors) {
    if (!c.name.trim()) return 'Every colour needs a name.';
    if (c.name.trim().length > 60) return `Colour name "${c.name.slice(0, 12)}…" is too long (60 characters max).`;
    if (c.hex.trim() && !/^#?[0-9A-Fa-f]{3,8}$/.test(c.hex.trim())) return `"${c.hex}" is not a valid colour code (example: #1C6B4F).`;
    if (!isInt(c.stock)) return `Stock for colour "${c.name}" must be a whole number.`;
  }
  if (dup(d.colors.map((c) => c.name))) return 'Two colours have the same name.';

  for (const s of d.sizes) {
    if (!s.label.trim()) return 'Every size needs a label.';
    if (s.label.trim().length > 80) return 'A size label is too long (80 characters max).';
    if (!isInt(s.stock)) return `Stock for size "${s.label}" must be a whole number.`;
  }
  if (dup(d.sizes.map((s) => s.label))) return 'Two sizes have the same label.';

  for (const o of d.options) {
    if (!o.label.trim()) return 'Every option needs a label (for example "250ml").';
    if (o.label.trim().length > 80) return 'An option label is too long (80 characters max).';
    const price = Number(o.price);
    if (!(price > 0)) return `Option "${o.label}" needs a price greater than 0.`;
    if (o.discount.trim() && !(Number(o.discount) > 0 && Number(o.discount) < price)) return `Discount for "${o.label}" must be above 0 and below its price.`;
    if (!isInt(o.stock)) return `Stock for option "${o.label}" must be a whole number.`;
  }
  if (dup(d.options.map((o) => o.label))) return 'Two options have the same label.';
  return null;
}

/** Payload for POST/PUT /products. Empty arrays are sent on purpose so removing every variant clears them. */
export function draftsToPayload(raw: VariantDrafts) {
  const d = cleanDrafts(raw);
  return {
    colors: d.colors.map((c) => ({ name: c.name.trim(), hex: c.hex.trim() ? (c.hex.trim().startsWith('#') ? c.hex.trim() : `#${c.hex.trim()}`) : '', stock: int(c.stock), available: c.available })),
    sizes: d.sizes.map((s) => ({ label: s.label.trim(), stock: int(s.stock), available: s.available })),
    options: d.options.map((o) => ({ label: o.label.trim(), price: Number(o.price), discount_price: o.discount.trim() ? Number(o.discount) : null, stock: int(o.stock), available: o.available })),
  };
}

/** Same priority the server uses (sizes > colours > options). null = no variants, stock is typed by hand. */
export function variantStockTotal(raw: VariantDrafts): number | null {
  const d = cleanDrafts(raw);
  const sum = (xs: { stock: string }[]) => xs.reduce((n, x) => n + (Number(x.stock) || 0), 0);
  if (d.sizes.length) return sum(d.sizes);
  if (d.colors.length) return sum(d.colors);
  if (d.options.length) return sum(d.options);
  return null;
}

// ---------------- Buyer view ----------------
export interface VariantEntry {
  label: string;
  available: boolean;
  stock: number | null;
  hex?: string;
  price?: number;
  discountPrice?: number | null;
}

export function variantEntries(list: unknown[] | null | undefined): VariantEntry[] {
  return (list ?? [])
    .map((v): VariantEntry | null => {
      if (typeof v === 'string') return v ? { label: v, available: true, stock: null } : null;
      const o = rec(v);
      const label = str(o.label ?? o.name ?? o.value).trim();
      if (!label) return null;
      const stock = o.stock === undefined || o.stock === null ? null : Number(o.stock);
      const price = o.price === undefined || o.price === null ? undefined : Number(o.price);
      const discountPrice = o.discount_price === undefined || o.discount_price === null ? null : Number(o.discount_price);
      return {
        label,
        stock,
        available: o.available !== false && (stock === null || stock > 0),
        hex: str(o.hex) || undefined,
        price,
        discountPrice,
      };
    })
    .filter((x): x is VariantEntry => x !== null);
}

/** Price a priced option actually charges (mirrors the server's _effective_option_price). */
export function optionPrices(e: VariantEntry | undefined, fallback: number): { price: number; list: number } {
  if (!e || !e.price || e.price <= 0) return { price: fallback, list: fallback };
  const d = e.discountPrice;
  return d && d > 0 && d < e.price ? { price: d, list: e.price } : { price: e.price, list: e.price };
}

/** Unit price for a cart line: its option's price when it has one, else the product's own. */
export function lineUnitPrice(p: Product, optionLabel: string | null, productPrice: number): number {
  if (!optionLabel) return productPrice;
  const e = variantEntries(p.options).find((x) => x.label === optionLabel);
  return optionPrices(e, productPrice).price;
}
