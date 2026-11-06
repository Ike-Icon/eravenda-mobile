import { request } from './http';
import type { DeliveryQuote, Order, OrderStatus, PaymentInit, PaymentMethod, PaymentVerify } from '../types/api';

export const orderService = {
  /** Shipping cost for the current cart to this address (POST /orders/delivery-quote). */
  quote: (addressId: string) => request<DeliveryQuote>('/orders/delivery-quote', { method: 'POST', json: { address_id: addressId } }),

  /** Turns the cart into ONE order PER STORE. Requires a verified email (server enforces it). */
  checkout: (input: { address_id: string; payment_method: PaymentMethod; is_pickup: boolean }) =>
    request<Order[]>('/orders/checkout', { method: 'POST', json: input }),

  mine: () => request<Order[]>('/orders'),
  get: (id: string) => request<Order>(`/orders/${id}`),
  cancel: (id: string) => request<Order>(`/orders/${id}/cancel`, { method: 'POST' }),

  // Seller side
  storeOrders: () => request<Order[]>('/orders/store/mine'),
  updateStatus: (id: string, body: { status: OrderStatus; seller_note?: string; shipping_carrier?: string; tracking_number?: string }) =>
    request<Order>(`/orders/${id}/status`, { method: 'PUT', json: body }),
};

export const paymentService = {
  /** Returns a Paystack hosted-checkout URL (card or mobile money). */
  initialize: (orderId: string) => request<PaymentInit>('/payments/initialize', { method: 'POST', json: { order_id: orderId } }),
  /** Ask the server to confirm with Paystack. Safe to call repeatedly. */
  verify: (reference: string) => request<PaymentVerify>(`/payments/verify/${encodeURIComponent(reference)}`),
};
