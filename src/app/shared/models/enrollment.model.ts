// enrollment.model.ts
// Angular models for enrollment system

export interface EnrollStudentRequest {
  eventId: number;
  studentId: number;
  enrollmentNotes?: string;
  acknowledgeWarnings: boolean;
  siblingQuotaApplied?: boolean;
  siblingDiscountAmount?: number;
}

export interface EnrolledSiblingDto {
  studentId:          number;
  studentNameEn:      string;
  studentAge:         number;
  paymentStatus:      string;
  siblingQuotaApplied: boolean;
}

export interface EligibilityCheckResult {
  isEligible: boolean;
  warnings: string[];
  errors: string[];
  canEnrollWithOverride: boolean;
  ageCheckPassed: boolean;
  genderCheckPassed: boolean;
  capacityAvailable: boolean;
  alreadyEnrolled: boolean;
  eventIsActive: boolean;
  studentAge: number;
  studentGender?: string;
  minAge?: number;
  maxAge?: number;
  eventGenderRequirement?: string;
  currentEnrollment: number;
  maxParticipants: number;
  // Sibling quota
  siblingQuotaAvailable: boolean;
  enrolledSiblings: EnrolledSiblingDto[];
}

export interface EnrollmentDto {
  enrollmentId: number;
  eventId: number;
  eventNameEn: string;
  eventNameAr?: string;
  eventType: string;
  sport?: string;
  eventStartDate: string;
  eventEndDate: string;
  studentId: number;
  studentNameEn: string;
  studentNameAr?: string;
  studentDateOfBirth: string;
  studentAge: number;
  studentGender?: string;
  enrolledBy: number;
  enrolledByName: string;
  enrollmentDate: string;
  enrollmentNotes?: string;
  status: string;
  isActive: boolean;
  ageRestrictionOverride: boolean;
  genderRestrictionOverride: boolean;
  eligibilityNotes?: string;
  paymentStatus: string;
  amountPaid: number;
  eventPrice: number;
  isPaid: boolean;
  attendanceStatus: string;
  attendancePercentage: number;
  requiresParentConsent: boolean;
  parentConsentGiven: boolean;
  certificateIssued: boolean;
  isCancelled: boolean;
  cancellationReason?: string;
  cancellationDate?: string;
}

export interface EnrolledStudentDto {
  enrollmentId: number;
  studentId: number;
  studentNameEn: string;
  studentNameAr?: string;
  studentAge: number;
  studentGender?: string;
  enrollmentDate: string;
  status: string;
  paymentStatus: string;
  attendanceStatus: string;
  hasWarnings: boolean;
  enrollmentNotes?: string;
}

export interface UpdateEnrollmentRequest {
  enrollmentId: number;
  status?: string;
  paymentStatus?: string;
  amountPaid?: number;
  attendanceStatus?: string;
  attendancePercentage?: number;
  notes?: string;
}

// ── Enrollment Offer Types ────────────────────────────────────────────────

export interface EnrollmentOfferType {
  offerTypeId:       number;
  offerCode:         string;
  offerNameEn:       string;
  offerNameAr?:      string;
  isPercentage:      boolean;
  defaultAmount:     number;
  isWaiver:          boolean;
  requiresComment:   boolean;
  defaultCommentTpl?: string;
  sortOrder:         number;
}

/** One offer row the admin has selected for this enrollment */
export interface AppliedOffer {
  offerTypeId?:   number;
  offerCode:      string;
  offerName:      string;
  discountAmount: number;
  isPercentage:   boolean;
  isWaiver:       boolean;
  comment?:       string;
}

/** State object kept per-card while the offer list is open */
export interface OfferRowState {
  offerType:   EnrollmentOfferType;
  selected:    boolean;
  amount:      number;
  comment:     string;
}

export interface EnrollmentApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  eligibilityCheck?: EligibilityCheckResult;
}
