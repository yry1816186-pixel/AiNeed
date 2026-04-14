export type ConsultantStatus =
  | "pending"
  | "active"
  | "suspended"
  | "inactive";

export type ServiceType =
  | "styling_consultation"
  | "wardrobe_audit"
  | "shopping_companion"
  | "color_analysis"
  | "special_event";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export interface ConsultantProfile {
  id: string;
  userId: string;
  studioName: string;
  specialties: string[];
  yearsOfExperience: number;
  certifications: Record<string, unknown>[];
  portfolioCases: Record<string, unknown>[];
  rating: number;
  reviewCount: number;
  bio?: string;
  avatar?: string;
  location?: string;
  responseTimeAvg?: number;
  status: ConsultantStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MatchResult {
  consultantId: string;
  studioName: string;
  avatar: string | null;
  specialties: string[];
  rating: number;
  reviewCount: number;
  matchPercentage: number;
  matchReasons: string[];
  price?: number;
}

export interface ConsultantMatchRequest {
  serviceType: ServiceType;
  budgetMin?: number;
  budgetMax?: number;
  notes?: string;
  preferOnline?: boolean;
}

export interface ServiceBooking {
  id: string;
  userId: string;
  consultantId: string;
  serviceType: ServiceType;
  scheduledAt: string;
  durationMinutes: number;
  status: BookingStatus;
  notes?: string;
  cancelReason?: string;
  price: number;
  currency: string;
  depositAmount?: number;
  finalPaymentAmount?: number;
  platformFee?: number;
  consultantPayout?: number;
  depositPaidAt?: string;
  finalPaidAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingRequest {
  consultantId: string;
  serviceType: ServiceType;
  scheduledAt: string;
  durationMinutes?: number;
  notes?: string;
  price: number;
  currency?: string;
}

export interface ConsultantAvailability {
  id: string;
  consultantId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
  isAvailable: boolean;
}

export interface AvailableTimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface ConsultantReview {
  id: string;
  bookingId: string;
  userId: string;
  consultantId: string;
  rating: number;
  content?: string;
  tags: string[];
  beforeImages: string[];
  afterImages: string[];
  isAnonymous: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewRequest {
  bookingId: string;
  rating: number;
  content?: string;
  tags?: string[];
  beforeImages?: string[];
  afterImages?: string[];
  isAnonymous?: boolean;
}

export interface ConsultantListParams {
  page?: number;
  pageSize?: number;
  specialty?: string;
  sortBy?: string;
}

export interface BookingListParams {
  page?: number;
  pageSize?: number;
  status?: BookingStatus;
}
