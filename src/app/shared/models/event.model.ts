export interface EventListItem {
  eventId: number;
  eventNameEn: string;
  eventNameAr?: string;
  eventType: string;
  sport?: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  venueName?: string;
  maxParticipants: number;
  currentEnrollment: number;
  availableSpots: number;
  isPaid: boolean;
  basePrice?: number;
  status?: string;
  isPublished: boolean;
  isFeatured: boolean;
  hasBanner: boolean;
  // Subscription fields (Migration 024)
  isSubscription: boolean;
  priceMonthly?: number;
  priceYearly?: number;
  gracePeriodDays: number;
  // Sibling Quota (Migration 026)
  siblingQuotaEnabled?: boolean;
}

export interface EventDetails extends EventListItem {
  description?: string;
  tags?: string[];
  durationMinutes?: number;
  recurrenceType?: string;
  recurrenceDays?: number[];
  recurrenceEndDate?: string;
  excludedDates?: string[];
  venueAddress?: string;
  locationCoordinates?: string;
  locationUrl?: string;
  minParticipants: number;
  waitlistCount: number;
  minAge?: number;
  maxAge?: number;
  gender?: string;
  skillLevel?: string;
  prerequisites?: string;
  requiresApproval: boolean;
  currency: string;
  allowMultipleOffers: boolean;
  maxDiscountPercentage: number;
  allowCoupons: boolean;
  allowCouponsWithOffers: boolean;
  paymentDeadline?: string;
  allowPartialPayment: boolean;
  partialPaymentMinimum?: number;
  refundPolicy?: string;
  refundDeadline?: string;
  refundPercentage?: number;
  registrationStartDate?: string;
  registrationEndDate?: string;
  enableWaitlist: boolean;
  waitlistCapacity?: number;
  autoConfirmEnrollment: boolean;
  canEnrollNow: boolean;
  primaryInstructorId?: number;
  primaryInstructorName?: string;
  staffNotes?: string;
  equipmentNeeded?: string;
  bannerFileName?: string;
  isActive: boolean;
  isCancelled: boolean;
  cancellationReason?: string;
  whatToBring?: string;
  medicalRequirements?: string;
  requiresParentalConsent: boolean;
  certificateProvided: boolean;
  mealsIncluded: boolean;
  transportationProvided: boolean;
  createdOn: string;
}

export interface CreateEventRequest {
  eventNameEn: string;
  eventNameAr?: string;
  eventType: string;
  sport?: string;
  description?: string;
  tags?: string[];
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  recurrenceType?: string;
  recurrenceDays?: number[];
  recurrenceEndDate?: string;
  excludedDates?: string[];
  venueName?: string;
  venueAddress?: string;
  maxParticipants: number;
  minParticipants: number;
  minAge?: number;
  maxAge?: number;
  gender?: string;
  skillLevel?: string;
  isPaid: boolean;
  basePrice?: number;
  allowMultipleOffers: boolean;
  allowCoupons: boolean;
  siblingQuotaEnabled?: boolean;
  isPublished: boolean;
  isFeatured: boolean;
}

export interface EventApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}
