import { request } from './http';
import type { BlockedStore, ReportReason } from '../types/api';

export const moderationService = {
  /** Reports a product or store. Reporting the same thing twice returns the first report (already_reported: true). */
  report: (body: { target_type: 'product' | 'store'; target_id: string; reason: ReportReason; details?: string }) =>
    request<{ id: string; status: string; already_reported: boolean }>('/reports', { method: 'POST', json: body }),

  blockedStores: () => request<BlockedStore[]>('/blocks/stores'),
  block: (storeId: string) => request<void>(`/blocks/stores/${storeId}`, { method: 'POST' }),
  unblock: (storeId: string) => request<void>(`/blocks/stores/${storeId}`, { method: 'DELETE' }),
};
