import { apiClient } from "./client";

export const consultantApi = {
  getProfiles: (params?: {
    page?: number;
    pageSize?: number;
    specialty?: string;
    sortBy?: string;
  }) => apiClient.get("/consultant/profiles", { params }),

  getProfileById: (id: string) =>
    apiClient.get(`/consultant/profiles/${id}`),

  matchConsultants: (data: {
    serviceType: string;
    budgetMin?: number;
    budgetMax?: number;
    notes?: string;
    preferOnline?: boolean;
  }) => apiClient.post("/consultant/match", data),

  getAvailableSlots: (consultantId: string, date: string) =>
    apiClient.get("/consultant/available-slots", {
      params: { consultantId, date },
    }),

  createBooking: (data: {
    consultantId: string;
    serviceType: string;
    scheduledAt: string;
    durationMinutes?: number;
    notes?: string;
    price: number;
  }) => apiClient.post("/consultant/bookings", data),

  getBookings: (params?: { page?: number; status?: string }) =>
    apiClient.get("/consultant/bookings", { params }),

  getBookingById: (id: string) =>
    apiClient.get(`/consultant/bookings/${id}`),

  payDeposit: (bookingId: string) =>
    apiClient.post(`/consultant/bookings/${bookingId}/pay-deposit`),

  payFinalPayment: (bookingId: string) =>
    apiClient.post(`/consultant/bookings/${bookingId}/pay-final`),

  createReview: (data: {
    bookingId: string;
    rating: number;
    content?: string;
    tags?: string[];
    beforeImages?: string[];
    afterImages?: string[];
    isAnonymous?: boolean;
  }) => apiClient.post("/consultant/reviews", data),

  getReviews: (params?: {
    consultantId?: string;
    page?: number;
    sortBy?: string;
  }) => apiClient.get("/consultant/reviews", { params }),

  getCases: (consultantId: string) =>
    apiClient.get(`/consultant/profiles/${consultantId}/cases`),

  getEarnings: (consultantId: string) =>
    apiClient.get("/consultant/earnings", { params: { consultantId } }),
};
