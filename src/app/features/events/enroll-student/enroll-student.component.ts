import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { EnrollmentService } from '../../../core/services/enrollment.service';
import { StudentService } from '../../../core/services/student.service';
import { EventsService } from '../../../core/services/events.service';
import { ToastService } from '../../../core/services/toast.service';
import { WalletService } from '../../../core/services/wallet.service';
import {
  EnrollStudentRequest,
  EligibilityCheckResult,
  EnrollmentOfferType,
  OfferRowState,
  AppliedOffer
} from '../../../shared/models/enrollment.model';
import { StudentListItem } from '../../../models/api.models';
import { EventDetails } from '../../../shared/models/event.model';
import { environment } from '../../../../environments/environment';

// ── Interfaces ────────────────────────────────────────────────────────────────

interface EnrolledStudent {
  enrollmentId:   number;
  studentId:      number;
  studentNameEn:  string;
  studentAge:     number;
  studentGender:  string;
  enrollmentDate: string;
  status:         string;
  paymentStatus:  string;
  isActive:       boolean;
  enrollmentNotes:string;
  totalFees:      number;
  amountPaid:     number;
  amountDue:      number;
}

// Subscription status for a student on a subscription event
interface SubStatus {
  subscriptionId:    number;
  studentId:         number;
  billingCycle:      string;   // 'monthly' | 'yearly'
  status:            string;   // 'active' | 'pending_payment' | 'cancelled'
  startDate:         string;
  nextBillingDate:   string;
  effectivePrice:    number;
  hasActiveOverride: boolean;
  overridePrice:     number | null;
  overrideExpiresOn: string | null;
  overrideReason:    string | null;
  daysUntilBilling:  number;
  inGracePeriod:     boolean;
  isOverdue:         boolean;
  latestInvoiceStatus: string | null;
  latestAmountPaid:  number;
  latestAmountDue:   number;
}

interface StudentCard extends StudentListItem {
  enrolled:    boolean;
  enrollment?: EnrolledStudent;
  // Subscription state
  subStatus?:          SubStatus;
  // UI state
  expanded:            boolean;
  deactivating:        boolean;
  deactivateReason:    string;
  payDrawerOpen:       boolean;
  // Subscription action panels
  subAction:           'none' | 'enroll' | 'renew' | 'billing-date' | 'switch-cycle' | 'override' | 'cancel';
  // Inline enroll state (regular)
  eligibilityResult:   EligibilityCheckResult | null;
  isCheckingElig:      boolean;
  acknowledgeWarnings: boolean;
  enrollmentNotes:     string;
  payNow:              boolean;
  paymentMethod:       string;
  paymentAmount:       number;
  paymentReference:    string;
  paymentNotes:        string;
  isEnrolling:         boolean;
  // Sibling quota
  applyingQuota:       boolean;
  siblingDiscount:     number;
  // Offer / discount panel
  showOffers:          boolean;
  offerRows:           OfferRowState[];
  // Wallet
  walletBalance:       number;   // loaded from API
  walletLoaded:        boolean;
  useWallet:           boolean;  // toggle
  walletAmount:        number;   // SAR to use from wallet
  // Subscription enroll
  subBillingCycle:     string;   // 'monthly' | 'yearly'
  subOverridePrice:    number | null;
  subOverrideReason:   string;
  subOverrideExpiry:   string;
  subPayNow:           boolean;
  subPayMethod:        string;
  subPayRef:           string;
  isSubscribing:       boolean;
  // Renewal
  renewPayNow:         boolean;
  renewPayMethod:      string;
  renewPayRef:         string;
  renewNotes:          string;
  isRenewing:          boolean;
  // Billing date change
  newBillingDate:      string;
  billingDateReason:   string;
  applyProRation:      boolean;
  isSavingDate:        boolean;
  // Switch cycle
  newCycle:            string;
  isSwitchingCycle:    boolean;
  // Price override
  overridePriceInput:  number | null;
  overrideReasonInput: string;
  overrideExpiryInput: string;
  isSavingOverride:    boolean;
  // Cancel
  cancelReason:        string;
  isCancelling:        boolean;
}

@Component({
  selector: 'app-enroll-student',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './enroll-student.component.html',
  styleUrls: ['./enroll-student.component.scss']
})
export class EnrollStudentComponent implements OnInit {

  eventId!:    number;
  event:       EventDetails | null = null;
  pageLoading  = true;
  searchTerm   = '';
  filterPayStatus = '';

  // Offer types loaded once from API
  offerTypes:  EnrollmentOfferType[] = [];

  allCards:      StudentCard[] = [];
  filteredCards: StudentCard[] = [];

  // Pagination
  pageSize    = 20;
  currentPage = 1;
  get totalPages(): number { return Math.max(1, Math.ceil(this.filteredCards.length / this.pageSize)); }
  get pagedCards(): StudentCard[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredCards.slice(start, start + this.pageSize);
  }
  get pageEnd(): number { return Math.min(this.currentPage * this.pageSize, this.filteredCards.length); }
  get pageNumbers(): number[] { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }
  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.currentPage = p;
    this.allCards.forEach(c => { c.expanded = false; c.subAction = 'none'; });
  }

  paymentMethods = [
    { value: 'Cash', label: 'Cash' },
    { value: 'BankTransfer', label: 'Bank Transfer' },
    { value: 'Card', label: 'Card' },
    { value: 'Online', label: 'Online' },
    { value: 'STCPay', label: 'STC Pay' },
    { value: 'Mada', label: 'Mada' }
  ];

  get isSubscriptionEvent(): boolean {
    return (this.event as any)?.isSubscription === true;
  }
  get siblingQuotaEnabled(): boolean {
    return (this.event as any)?.siblingQuotaEnabled === true;
  }
  get priceMonthly(): number  { return (this.event as any)?.priceMonthly  ?? 0; }
  get priceYearly():  number  { return (this.event as any)?.priceYearly   ?? 0; }
  get yearlySaving(): number  {
    return this.priceMonthly > 0 && this.priceYearly > 0
      ? Math.round((this.priceMonthly * 12 - this.priceYearly) * 100) / 100 : 0;
  }

  constructor(
    private route:        ActivatedRoute,
    private router:       Router,
    private http:         HttpClient,
    private enrollSvc:    EnrollmentService,
    private studentSvc:   StudentService,
    private eventsSvc:    EventsService,
    private toastSvc:     ToastService,
    private walletSvc:    WalletService
  ) {}

  // Expose Math for template
  Math = Math;

  ngOnInit(): void {
    this.eventId = Number(this.route.snapshot.paramMap.get('eventId'));
    // Load offer types once — used for all cards
    this.enrollSvc.getOfferTypes().subscribe({
      next: r => { if (r.success && r.data) this.offerTypes = r.data; }
    });
    this.loadAll();
  }

  // ── Load everything ───────────────────────────────────────────────

  loadAll(): void {
    this.pageLoading = true;
    let eventDone = false, studentsDone = false, enrolledDone = false, subsDone = false;
    let allStudents:  StudentListItem[] = [];
    let enrolledList: EnrolledStudent[] = [];
    let subList:      SubStatus[]       = [];

    const tryMerge = () => {
      const subsRequired = this.isSubscriptionEvent;
      if (!eventDone || !studentsDone || !enrolledDone) return;
      if (subsRequired && !subsDone) return;
      this.buildCards(allStudents, enrolledList, subList);
      this.pageLoading = false;
    };

    // 1. Event
    this.eventsSvc.getEventById(this.eventId).subscribe({
      next: r => {
        if (r.success && r.data) this.event = r.data;
        eventDone = true;
        // Now we know if it's a subscription event — kick off sub load
        if (this.isSubscriptionEvent) {
          this.http.get<any>(`${environment.apiUrl}/subscriptions/event/${this.eventId}/students`).subscribe({
            next: sr => {
              if (sr.success && sr.data) subList = sr.data;
              subsDone = true; tryMerge();
            },
            error: () => { subsDone = true; tryMerge(); }
          });
        } else {
          subsDone = true;
        }
        tryMerge();
      },
      error: () => { eventDone = true; subsDone = true; tryMerge(); }
    });

    // 2. All students
    this.studentSvc.getStudents().subscribe({
      next: s => { allStudents = s; studentsDone = true; tryMerge(); },
      error: () => { studentsDone = true; tryMerge(); }
    });

    // 3. Enrollments
    this.http.get<any>(`${environment.apiUrl}/enrollments/event/${this.eventId}`).subscribe({
      next: r => {
        if (r.success && r.data) {
          enrolledList = r.data.map((e: any) => ({
            enrollmentId:   e.enrollmentId,
            studentId:      e.studentId,
            studentNameEn:  e.studentNameEn,
            studentAge:     e.studentAge,
            studentGender:  e.studentGender ?? '',
            enrollmentDate: e.enrollmentDate,
            status:         e.status,
            paymentStatus:  e.paymentStatus,
            isActive:       e.status !== 'Cancelled',
            enrollmentNotes:e.enrollmentNotes ?? '',
            totalFees:      e.eventPrice  ?? 0,
            amountPaid:     e.amountPaid  ?? 0,
            amountDue:      e.amountDue   ?? 0
          }));
        }
        enrolledDone = true; tryMerge();
      },
      error: () => { enrolledDone = true; tryMerge(); }
    });
  }

  // ── Build cards ───────────────────────────────────────────────────

  buildCards(students: StudentListItem[], enrolled: EnrolledStudent[], subs: SubStatus[]): void {
    const enrolledMap = new Map(enrolled.map(e => [e.studentId, e]));
    const subMap      = new Map(subs.map(s => [s['studentId'], s]));

    const cards: StudentCard[] = students.map(s => {
      const enr = enrolledMap.get(s.studentId);
      const sub = subMap.get(s.studentId) as SubStatus | undefined;
      return {
        ...s,
        enrolled:    !!enr || !!sub,
        enrollment:  enr,
        subStatus:   sub,
        expanded:         false,
        deactivating:     false,
        deactivateReason: '',
        payDrawerOpen:    false,
        subAction:        'none',
        eligibilityResult:   null,
        isCheckingElig:      false,
        acknowledgeWarnings: false,
        enrollmentNotes:     '',
        payNow:              false,
        paymentMethod:       'Cash',
        paymentAmount:       this.calcTotal(),
        paymentReference:    '',
        paymentNotes:        '',
        isEnrolling:         false,
        applyingQuota:       false,
        siblingDiscount:     0,
        showOffers:          false,
        offerRows:           [],
        walletBalance:       0,
        walletLoaded:        false,
        useWallet:           false,
        walletAmount:        0,
        subBillingCycle:     'monthly',
        subOverridePrice:    null,
        subOverrideReason:   '',
        subOverrideExpiry:   '',
        subPayNow:           false,
        subPayMethod:        'Cash',
        subPayRef:           '',
        isSubscribing:       false,
        renewPayNow:         false,
        renewPayMethod:      'Cash',
        renewPayRef:         '',
        renewNotes:          '',
        isRenewing:          false,
        newBillingDate:      '',
        billingDateReason:   '',
        applyProRation:      false,
        isSavingDate:        false,
        newCycle:            sub ? (sub.billingCycle === 'monthly' ? 'yearly' : 'monthly') : 'yearly',
        isSwitchingCycle:    false,
        overridePriceInput:  sub?.overridePrice ?? null,
        overrideReasonInput: sub?.overrideReason ?? '',
        overrideExpiryInput: sub?.overrideExpiresOn ?? '',
        isSavingOverride:    false,
        cancelReason:        '',
        isCancelling:        false
      };
    });

    const enrolledCards   = cards.filter(c => c.enrolled).sort((a, b) => a.fullName.localeCompare(b.fullName));
    const unenrolledCards = cards.filter(c => !c.enrolled).sort((a, b) => a.fullName.localeCompare(b.fullName));
    this.allCards = [...enrolledCards, ...unenrolledCards];
    this.applySearch();
  }

  applySearch(): void {
    const q = this.searchTerm.toLowerCase();
    this.filteredCards = this.allCards.filter(c => {
      if (q && !c.fullName.toLowerCase().includes(q)) return false;
      if (this.filterPayStatus) {
        if (!c.enrolled) return false;
        const ps = this.isSubscriptionEvent
          ? c.subStatus?.latestInvoiceStatus ?? 'Unpaid'
          : c.enrollment?.paymentStatus ?? 'Unpaid';
        if (ps !== this.filterPayStatus) return false;
      }
      return true;
    });
    this.currentPage = 1;
  }

  get eventFee(): number {
    if (!this.event) return 0;
    // basePrice is the total-charged amount (tax inclusive).
    // Fall back to actualPrice, then basePrice, guard against null/undefined.
    const fee = (this.event as any).basePrice
             ?? (this.event as any).actualPrice
             ?? 0;
    return Number(fee) || 0;
  }
  calcTotal():     number { return this.eventFee; }  // base_price already includes VAT — no recalculation

  /** Effective fee for a student after sibling discount */
  effectiveFee(card: StudentCard): number {
    if (card.applyingQuota && card.siblingDiscount > 0) {
      return Math.max(0, this.eventFee - card.siblingDiscount);
    }
    return this.eventFee;
  }

  // ── Offer helpers ─────────────────────────────────────────────────────────────────────

  /** Build offer rows from master list when the admin ticks "Apply Discount" */
  initOfferRows(card: StudentCard): void {
    if (card.offerRows.length > 0) return;  // already built
    card.offerRows = this.offerTypes.map(ot => {
      let defaultComment = ot.defaultCommentTpl ?? '';
      // Pre-fill sibling comment with enrolled sibling names
      if (ot.offerCode === 'SIBLING' && card.eligibilityResult?.enrolledSiblings?.length) {
        const names = card.eligibilityResult.enrolledSiblings.map(s => s.studentNameEn).join(', ');
        defaultComment = `Sibling of ${names}`;
      }
      return {
        offerType: ot,
        selected:  false,
        amount:    ot.isWaiver ? this.eventFee : ot.defaultAmount,
        comment:   defaultComment
      };
    });
  }

  /** Sum of all selected offer discounts for display */
  totalOfferDiscount(card: StudentCard): number {
    if (!card.showOffers) return 0;
    const hasWaiver = card.offerRows.some(r => r.selected && r.offerType.isWaiver);
    if (hasWaiver) return this.eventFee;
    return card.offerRows
      .filter(r => r.selected)
      .reduce((sum, r) => {
        const amt = r.offerType.isPercentage
          ? Math.round(this.eventFee * r.amount / 100 * 100) / 100
          : r.amount;
        return sum + amt;
      }, 0);
  }

  /** Effective fee after all selected offers */
  effectiveFeeWithOffers(card: StudentCard): number {
    return Math.max(0, this.eventFee - this.totalOfferDiscount(card));
  }

  // ── Wallet helpers ─────────────────────────────────────────────────────────────────────

  /** Fee after offers, before wallet */
  feeAfterOffers(card: StudentCard): number {
    return this.effectiveFeeWithOffers(card);
  }

  /** How much cash is still needed after wallet deduction */
  remainingCash(card: StudentCard): number {
    if (!card.useWallet) return this.feeAfterOffers(card);
    return Math.max(0, this.feeAfterOffers(card) - card.walletAmount);
  }

  /** Max wallet amount allowed (can't exceed fee or balance) */
  maxWalletAmount(card: StudentCard): number {
    return Math.min(card.walletBalance, this.feeAfterOffers(card));
  }

  /** True when wallet fully covers the fee */
  walletCoversAll(card: StudentCard): boolean {
    return card.useWallet && card.walletAmount >= this.feeAfterOffers(card) && card.walletBalance >= this.feeAfterOffers(card);
  }

  /** Validate: any selected offer with requiresComment has a non-empty comment */
  offersValid(card: StudentCard): boolean {
    if (!card.showOffers) return true;
    return card.offerRows
      .filter(r => r.selected && r.offerType.requiresComment)
      .every(r => r.comment.trim().length > 0);
  }

  /** Build the AppliedOffer[] to send to the API */
  buildAppliedOffers(card: StudentCard): AppliedOffer[] {
    if (!card.showOffers) return [];
    return card.offerRows
      .filter(r => r.selected)
      .map(r => ({
        offerTypeId:    r.offerType.offerTypeId,
        offerCode:      r.offerType.offerCode,
        offerName:      r.offerType.offerNameEn,
        discountAmount: r.offerType.isWaiver ? this.eventFee : r.amount,
        isPercentage:   r.offerType.isPercentage,
        isWaiver:       r.offerType.isWaiver,
        comment:        r.comment || undefined
      }));
  }

  subPriceFor(card: StudentCard): number {
    if (card.subBillingCycle === 'yearly') return this.priceYearly;
    return this.priceMonthly;
  }

  // ── Card click ────────────────────────────────────────────────────

  toggleCard(card: StudentCard): void {
    const wasOpen = card.expanded;
    this.allCards.forEach(c => {
      c.expanded = false; c.deactivating = false;
      c.payDrawerOpen = false; c.subAction = 'none';
    });
    if (!wasOpen) {
      card.expanded = true;

      // Load wallet balance for this student's parent
      if (this.event?.isPaid && !card.walletLoaded) {
        const parentId = (card as any).parentId ?? (card as any).parentUserId;
        if (parentId) {
          this.walletSvc.getWallet(parentId).subscribe({
            next: r => {
              if (r.success) {
                card.walletBalance = r.wallet?.balance ?? 0;
                card.walletLoaded  = true;
              }
            }
          });
        }
      }

      if (this.isSubscriptionEvent) {
        if (!card.enrolled) card.subAction = 'enroll';
      } else {
        if (!card.enrolled && !card.eligibilityResult && !card.isCheckingElig) {
          this.checkEligibility(card);
        }
      }
    }
  }

  openSubAction(card: StudentCard, action: StudentCard['subAction'], $event: MouseEvent): void {
    $event.stopPropagation();
    this.allCards.forEach(c => { c.subAction = 'none'; c.expanded = false; });
    card.expanded  = true;
    card.subAction = action;
  }

  // ── Eligibility ───────────────────────────────────────────────────

  checkEligibility(card: StudentCard): void {
    card.isCheckingElig = true; card.eligibilityResult = null;
    this.enrollSvc.checkEligibility(this.eventId, card.studentId).subscribe({
      next: r => { card.isCheckingElig = false; if (r.success && r.data) card.eligibilityResult = r.data; },
      error: () => { card.isCheckingElig = false; }
    });
  }

  canEnroll(card: StudentCard): boolean {
    if (!card.eligibilityResult) return false;
    if (card.eligibilityResult.errors.length > 0) return false;
    if (card.eligibilityResult.warnings.length > 0 && !card.acknowledgeWarnings) return false;
    if (!this.offersValid(card)) return false;
    return true;
  }

  // ── Regular enroll ────────────────────────────────────────────────

  enrollStudent(card: StudentCard): void {
    if (!this.canEnroll(card)) return;
    card.isEnrolling = true;
    if (this.event?.isPaid) {
      this.enrollSvc.enrollWithPayment({
        studentId: card.studentId, eventId: this.eventId,
        enrollmentNotes: card.enrollmentNotes || undefined,
        payNow:    this.remainingCash(card) > 0,
        paymentMethod:    card.paymentMethod,
        paymentAmount:    this.remainingCash(card) > 0 ? this.remainingCash(card) : undefined,
        paymentReference: card.paymentReference || undefined,
        paymentNotes:     card.paymentNotes     || undefined,
        siblingQuotaApplied:   card.applyingQuota || undefined,
        siblingDiscountAmount: (card.applyingQuota && card.siblingDiscount > 0) ? card.siblingDiscount : undefined,
        walletAmount:    card.useWallet ? card.walletAmount : 0,
        appliedOffers:   this.buildAppliedOffers(card)
      }).subscribe({
        next: (r: any) => { card.isEnrolling = false; if (r.success) { this.toastSvc.showSuccess(`${card.fullName} enrolled!`); this.loadAll(); } },
        error: () => { card.isEnrolling = false; this.toastSvc.showError('Enroll failed.'); }
      });
    } else {
      this.enrollSvc.enrollStudent({
        eventId: this.eventId, studentId: card.studentId,
        enrollmentNotes: card.enrollmentNotes || undefined,
        acknowledgeWarnings: card.acknowledgeWarnings
      }).subscribe({
        next: r => { card.isEnrolling = false; if (r.success) { this.toastSvc.showSuccess(`${card.fullName} enrolled!`); this.loadAll(); } },
        error: () => { card.isEnrolling = false; this.toastSvc.showError('Enroll failed.'); }
      });
    }
  }

  // ── Subscription enroll ───────────────────────────────────────────

  subscribeStudent(card: StudentCard): void {
    card.isSubscribing = true;
    this.http.post<any>(`${environment.apiUrl}/subscriptions/event/subscribe`, {
      studentId:       card.studentId,
      eventId:         this.eventId,
      billingCycle:    card.subBillingCycle,
      overridePrice:   card.subOverridePrice || null,
      overrideReason:  card.subOverrideReason || null,
      overrideExpiresOn: card.subOverrideExpiry || null,
      payNow:          card.subPayNow,
      paymentMethod:   card.subPayNow ? card.subPayMethod : null,
      paymentReference:card.subPayNow ? card.subPayRef    : null
    }).subscribe({
      next: r => {
        card.isSubscribing = false;
        if (r.success) { this.toastSvc.showSuccess(`${card.fullName} subscribed!`); this.loadAll(); }
        else { this.toastSvc.showError(r.message || 'Failed to subscribe'); }
      },
      error: (e) => { card.isSubscribing = false; this.toastSvc.showError(e.error?.message || 'Failed.'); }
    });
  }

  // ── Renewal ───────────────────────────────────────────────────────

  renewSubscription(card: StudentCard): void {
    if (!card.subStatus) return;
    card.isRenewing = true;
    this.http.post<any>(`${environment.apiUrl}/subscriptions/event/${card.subStatus.subscriptionId}/renew`, {
      payNow:          card.renewPayNow,
      paymentMethod:   card.renewPayNow ? card.renewPayMethod : null,
      paymentAmount:   card.renewPayNow ? card.subStatus.effectivePrice : null,
      paymentReference:card.renewPayNow ? card.renewPayRef    : null,
      notes:           card.renewNotes || null
    }).subscribe({
      next: r => {
        card.isRenewing = false;
        if (r.success) { this.toastSvc.showSuccess('Subscription renewed!'); this.loadAll(); }
        else { this.toastSvc.showError(r.message || 'Renewal failed'); }
      },
      error: (e) => { card.isRenewing = false; this.toastSvc.showError(e.error?.message || 'Failed.'); }
    });
  }

  // ── Billing date change ───────────────────────────────────────────

  saveBillingDate(card: StudentCard): void {
    if (!card.subStatus || !card.newBillingDate) return;
    card.isSavingDate = true;
    this.http.patch<any>(`${environment.apiUrl}/subscriptions/event/${card.subStatus.subscriptionId}/billing-date`, {
      newBillingDate: card.newBillingDate,
      applyProRation: card.applyProRation,
      reason:         card.billingDateReason || null
    }).subscribe({
      next: r => {
        card.isSavingDate = false;
        if (r.success) {
          const msg = r.proRatedAmount
            ? `Billing date updated. Pro-rated invoice: ${r.proRatedAmount} SAR`
            : 'Billing date updated.';
          this.toastSvc.showSuccess(msg);
          this.loadAll();
        }
      },
      error: (e) => { card.isSavingDate = false; this.toastSvc.showError(e.error?.message || 'Failed.'); }
    });
  }

  // ── Switch cycle ──────────────────────────────────────────────────

  switchCycle(card: StudentCard): void {
    if (!card.subStatus) return;
    card.isSwitchingCycle = true;
    this.http.patch<any>(`${environment.apiUrl}/subscriptions/event/${card.subStatus.subscriptionId}/switch-cycle`, {
      newCycle: card.newCycle
    }).subscribe({
      next: r => {
        card.isSwitchingCycle = false;
        if (r.success) { this.toastSvc.showSuccess(`Switched to ${r.newCycle} billing. New price: ${r.newEffectivePrice} SAR`); this.loadAll(); }
      },
      error: (e) => { card.isSwitchingCycle = false; this.toastSvc.showError(e.error?.message || 'Failed.'); }
    });
  }

  // ── Price override ────────────────────────────────────────────────

  saveOverride(card: StudentCard): void {
    if (!card.subStatus || !card.overridePriceInput) return;
    card.isSavingOverride = true;
    this.http.patch<any>(`${environment.apiUrl}/subscriptions/event/${card.subStatus.subscriptionId}/price-override`, {
      overridePrice: card.overridePriceInput,
      reason:        card.overrideReasonInput || null,
      expiresOn:     card.overrideExpiryInput || null
    }).subscribe({
      next: r => {
        card.isSavingOverride = false;
        if (r.success) { this.toastSvc.showSuccess('Price override saved.'); this.loadAll(); }
      },
      error: (e) => { card.isSavingOverride = false; this.toastSvc.showError(e.error?.message || 'Failed.'); }
    });
  }

  removeOverride(card: StudentCard): void {
    if (!card.subStatus || !confirm('Remove price override and revert to standard price?')) return;
    this.http.delete<any>(`${environment.apiUrl}/subscriptions/event/${card.subStatus.subscriptionId}/price-override`).subscribe({
      next: () => { this.toastSvc.showSuccess('Override removed.'); this.loadAll(); },
      error: (e) => { this.toastSvc.showError(e.error?.message || 'Failed.'); }
    });
  }

  // ── Cancel subscription ───────────────────────────────────────────

  cancelSubscription(card: StudentCard): void {
    if (!card.subStatus) return;
    card.isCancelling = true;
    this.http.delete<any>(
      `${environment.apiUrl}/subscriptions/event/${card.subStatus.subscriptionId}?reason=${encodeURIComponent(card.cancelReason)}`
    ).subscribe({
      next: r => {
        card.isCancelling = false;
        if (r.success) { this.toastSvc.showSuccess('Subscription cancelled.'); this.loadAll(); }
      },
      error: (e) => { card.isCancelling = false; this.toastSvc.showError(e.error?.message || 'Failed.'); }
    });
  }

  // ── Deactivate (regular events) ───────────────────────────────────

  openDeactivate(card: StudentCard, $event: MouseEvent): void {
    $event.stopPropagation();
    this.allCards.forEach(c => c.deactivating = false);
    card.expanded = true; card.deactivating = true;
  }

  confirmDeactivate(card: StudentCard): void {
    if (!card.enrollment) return;
    this.enrollSvc.cancelEnrollment(
      card.enrollment.enrollmentId,
      card.deactivateReason || 'Deactivated by admin'
    ).subscribe({
      next: r => {
        if ((r as any).success) { this.toastSvc.showSuccess(`${card.fullName}'s enrollment deactivated.`); this.loadAll(); }
      },
      error: () => this.toastSvc.showError('Failed to deactivate.')
    });
  }

  // ── Navigation ────────────────────────────────────────────────────

  goBack(): void {
    const qp = this.route.snapshot.queryParams;
    this.router.navigate(['/events'], {
      queryParams: {
        search: qp['search'] || null,
        type:   qp['type']   || null,
        status: qp['status'] || null,
        view:   qp['view']   || null
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────

  get enrolledCount(): number {
    return this.allCards.filter(c => c.enrolled && c.enrollment?.status !== 'Cancelled' && c.subStatus?.status !== 'cancelled').length;
  }

  initials(name: string): string {
    return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
  }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-SA', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  payStatusClass(s: string): string {
    const m: Record<string, string> = { Paid: 'paid', Unpaid: 'unpaid', Partial: 'partial', Pending: 'pending' };
    return m[s] ?? 'unpaid';
  }

  enrollStatusClass(s: string): string {
    const m: Record<string, string> = { Active: 'active', Cancelled: 'cancelled', Pending: 'pending', Waitlisted: 'wait', active: 'active', cancelled: 'cancelled', pending_payment: 'pending' };
    return m[s] ?? 'pending';
  }

  subStatusLabel(s: SubStatus): string {
    if (s.isOverdue)       return 'Overdue';
    if (s.inGracePeriod)   return 'Grace';
    if (s.status === 'active') return 'Active';
    if (s.status === 'pending_payment') return 'Pending';
    if (s.status === 'cancelled') return 'Cancelled';
    return s.status;
  }

  subStatusClass(s: SubStatus): string {
    if (s.isOverdue)       return 'es-overdue';
    if (s.inGracePeriod)   return 'es-grace';
    if (s.status === 'active') return 'es-active';
    return 'es-pending';
  }

  todayIso(): string {
    return new Date().toISOString().split('T')[0];
  }
}
