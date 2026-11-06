import * as WebBrowser from 'expo-web-browser';
import { paymentService } from '../services/orderService';
import type { OrderStatus, PaymentVerify } from '../types/api';

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Placed',
  paid: 'Paid',
  processing: 'Processing',
  shipped: 'Dispatched',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

/** Tracker steps shown to the buyer. Index of the active step for each status. */
export const TRACK_STEPS = ['Placed', 'Processing', 'Dispatched', 'Delivered'];
export function stepIndex(status: OrderStatus): number {
  switch (status) {
    case 'processing': return 1;
    case 'shipped': return 2;
    case 'delivered': return 3;
    default: return 0; // pending, paid
  }
}

/**
 * PAYSTACK FLOW
 *  1. POST /payments/initialize -> hosted checkout URL (card / mobile money) + reference
 *  2. open it in the in-app browser; the buyer pays and closes it
 *  3. GET /payments/verify/{reference} -> the SERVER confirms with Paystack (never trust the app)
 * Returns the verified result, or null if the buyer closed the browser without paying.
 */
export async function payForOrder(orderId: string): Promise<PaymentVerify | null> {
  const init = await paymentService.initialize(orderId);
  await WebBrowser.openBrowserAsync(init.authorization_url);
  try {
    return await paymentService.verify(init.reference);
  } catch {
    return null;
  }
}
