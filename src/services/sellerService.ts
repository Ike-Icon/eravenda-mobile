import * as ImagePicker from 'expo-image-picker';
import { request } from './http';
import type { Product, ProductImage, ProductInput, Store, StoreInput } from '../types/api';

/** Cloudinary unsigned upload (same approach as the website). Returns the secure https URL. */
const CLOUD = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export async function uploadToCloudinary(asset: ImagePicker.ImagePickerAsset): Promise<string> {
  if (!CLOUD || !PRESET) throw new Error('Image upload is not configured. Set the Cloudinary variables in .env.');
  const form = new FormData();
  // React Native's FormData accepts {uri,name,type} for files.
  form.append('file', { uri: asset.uri, name: asset.fileName ?? 'photo.jpg', type: asset.mimeType ?? 'image/jpeg' } as unknown as Blob);
  form.append('upload_preset', PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: 'POST', body: form });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.secure_url) throw new Error(json?.error?.message ?? 'Image upload failed. Try again.');
  return json.secure_url as string;
}

export const sellerService = {
  /** 404 (ApiError.status === 404) means this account has not applied for a store yet. */
  store: () => request<Store>('/stores/me'),
  /** Creates a PENDING store. An admin approves it and only then does the account's role become "seller". */
  createStore: (body: StoreInput & { store_name: string }) => request<Store>('/stores', { method: 'POST', json: body }),
  updateStore: (body: StoreInput) => request<Store>('/stores/me', { method: 'PUT', json: body }),
  products: () => request<Product[]>('/products/store/mine'),
  /** New products start as "pending" until an admin approves them. */
  create: (body: Required<Pick<ProductInput, 'name' | 'category_id' | 'price'>> & ProductInput) =>
    request<Product>('/products', { method: 'POST', json: body }),
  update: (id: string, body: ProductInput) => request<Product>(`/products/${id}`, { method: 'PUT', json: body }),
  remove: (id: string) => request<void>(`/products/${id}`, { method: 'DELETE' }),
  /** The API takes image_url and is_primary as QUERY parameters, not a JSON body. */
  addImage: (id: string, imageUrl: string, isPrimary: boolean) =>
    request<ProductImage>(`/products/${id}/images`, { method: 'POST', query: { image_url: imageUrl, is_primary: isPrimary } }),
  removeImage: (productId: string, imageId: string) => request<void>(`/products/${productId}/images/${imageId}`, { method: 'DELETE' }),
};
