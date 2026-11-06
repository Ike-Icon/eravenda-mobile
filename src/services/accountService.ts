import { request } from './http';
import type { Address, AddressInput, DeletionCheck, NotificationPrefs, User, WishlistEntry } from '../types/api';

export const accountService = {
  addresses: () => request<Address[]>('/auth/addresses'),
  createAddress: (a: AddressInput) => request<Address>('/auth/addresses', { method: 'POST', json: a }),
  updateAddress: (id: string, a: Partial<AddressInput>) => request<Address>(`/auth/addresses/${id}`, { method: 'PUT', json: a }),
  deleteAddress: (id: string) => request<void>(`/auth/addresses/${id}`, { method: 'DELETE' }),
  updateProfile: (body: { full_name?: string; phone?: string }) => request<User>('/users/me', { method: 'PUT', json: body }),
  changePassword: (current_password: string, new_password: string) =>
    request<unknown>('/users/me/password', { method: 'PUT', json: { current_password, new_password } }),
  resendVerification: () => request<{ message: string }>('/auth/resend-verification', { method: 'POST' }),
  /** Can this account be deleted right now? If not, `blockers` explains why in plain language. */
  deletionCheck: () => request<DeletionCheck>('/users/me/deletion-check'),
  /** Irreversible. The server anonymises the account; `confirm` must be the word DELETE. */
  deleteAccount: (body: { confirm: string; password?: string }) => request<void>('/users/me/delete', { method: 'POST', json: body }),
  notificationPrefs: () => request<NotificationPrefs>('/users/me/notification-preferences'),
  /** Send only the switch that changed; the server returns the full, saved set. */
  updateNotificationPrefs: (change: Partial<NotificationPrefs>) =>
    request<NotificationPrefs>('/users/me/notification-preferences', { method: 'PUT', json: change }),
  wishlist: () => request<WishlistEntry[]>('/wishlist'),
  /** One review per purchased item; sending again updates it. Server only allows it after delivery. */
  review: (body: { product_id: string; order_item_id: string; rating: number; comment?: string }) =>
    request<unknown>('/reviews', { method: 'POST', json: body }),
};
