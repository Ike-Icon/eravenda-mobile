import { request } from './http';
import type { Handyman, ProfessionalBooking, ServiceBooking, ServiceReview, ServiceJobPhoto, ServicePortfolio } from '../types/api';

export const handymanService = {
  workers: (signal?: AbortSignal) => request<Handyman[]>('/services/workers', { auth: false, signal }),
  worker: (id: string, signal?: AbortSignal) => request<Handyman>(`/services/workers/${id}`, { auth: false, signal }),
  ratings: (id: string, signal?: AbortSignal) => request<ServiceReview[]>(`/services/workers/${id}/ratings`, { auth: false, signal }),
  myProfile: () => request<Handyman>('/services/me'),
  register: (input: { job_title: string; custom_job_title?: string; professional_name: string; company_name?: string; work_experience: string; education?: string; qualifications?: string }) => {
    const body = new FormData();
    Object.entries({ ...input, terms_accepted: 'true', payments_on_platform_accepted: 'true' }).forEach(([key, value]) => {
      if (value !== undefined) body.append(key, value);
    });
    return request<Handyman>('/services/register', { method: 'POST', multipart: body });
  },
  updateProfile: (input: { job_title: string; custom_job_title?: string; professional_name: string; company_name?: string; work_experience: string; education?: string; qualifications?: string }) => {
    const body = new FormData();
    Object.entries(input).forEach(([key, value]) => { if (value !== undefined) body.append(key, value); });
    return request<Handyman>('/services/me', { method: 'PUT', multipart: body });
  },
  createBooking: (input: { handyman_id: string; details: string; location: string; preferred_contact: string; contact_details: string }) =>
    request<ServiceBooking>('/services/bookings', { method: 'POST', json: input }),
  myBookings: () => request<ServiceBooking[]>('/services/bookings/mine'),
  booking: (id: string) => request<ServiceBooking>(`/services/bookings/${id}`),
  professionalBookings: () => request<ProfessionalBooking[]>('/services/professional/bookings'),
  accept: (id: string, quoted_amount?: number) => request<ServiceBooking>(`/services/bookings/${id}/accept`, { method: 'PUT', json: { quoted_amount } }),
  requestCompletion: (id: string, escrow_amount: number) => request<ServiceBooking>(`/services/bookings/${id}/request-completion`, { method: 'PUT', json: { escrow_amount } }),
  addPortfolio: (image_url: string, caption?: string) => request<ServicePortfolio>('/services/me/portfolio', { method: 'POST', json: { image_url, caption } }),
  deletePortfolio: (imageId: string) => request<void>(`/services/me/portfolio/${imageId}`, { method: 'DELETE' }),
  addPhoto: (bookingId: string, image_url: string, caption?: string) => request<ServiceJobPhoto>(`/services/bookings/${bookingId}/photos`, { method: 'POST', json: { image_url, caption } }),
  rate: (id: string, rating: number, comment: string) => request<ServiceReview>(`/services/bookings/${id}/rating`, { method: 'POST', json: { rating, comment } }),
  initializePayment: (booking_id: string) => request<{ authorization_url: string; access_code: string; reference: string }>('/payments/service/initialize', { method: 'POST', json: { booking_id } }),
  verifyPayment: (reference: string) => request<{ status: string; booking_id: string; booking_status: string; amount: number; reference: string }>(`/payments/service/verify/${encodeURIComponent(reference)}`),
};
