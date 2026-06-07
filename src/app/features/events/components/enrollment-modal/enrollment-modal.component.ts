import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { EnrollmentService, EnrollStudentWithPaymentDto } from '../../../../shared/services/enrollment.service';
import { SubscriptionService, CheckCoverageResponse } from '../../../../shared/services/subscription.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-enrollment-modal',
  standalone: false,
  templateUrl: './enrollment-modal.component.html',
  styleUrls: ['./enrollment-modal.component.scss']
})
export class EnrollmentModalComponent implements OnInit, OnChanges {
  @Input() isOpen: boolean = false;
  @Input() eventId: number = 0;
  @Input() eventName: string = '';
  @Input() eventFee: number = 0;
  @Input() students: any[] = []; // Available students to enroll
  @Output() closeModal = new EventEmitter<void>();
  @Output() enrollmentCreated = new EventEmitter<void>();

  // Selected student
  selectedStudentId: number = 0;
  enrollmentNotes: string = '';

  // Payment options
  payNow: boolean = false;
  paymentMethod: string = 'Cash';
  paymentAmount: number = 0;
  paymentReference: string = '';
  paymentNotes: string = '';

  // Payment methods
  paymentMethods = [
    { value: 'Cash', label: '💵 Cash' },
    { value: 'BankTransfer', label: '🏦 Bank Transfer' },
    { value: 'Card', label: '💳 Card' },
    { value: 'Online', label: '🌐 Online' },
    { value: 'STCPay', label: '📱 STC Pay' },
    { value: 'Mada', label: '💳 Mada' }
  ];

  // Loading state
  isSaving: boolean = false;

  // Subscription Coverage
  isCheckingCoverage: boolean = false;
  subscriptionCoverage: CheckCoverageResponse | null = null;
  isCoveredBySubscription: boolean = false;

  constructor(
    private enrollmentService: EnrollmentService,
    private subscriptionService: SubscriptionService,
    private toastr: ToastService
  ) {}

  ngOnInit(): void {
    this.calculatePaymentAmount();
  }

  ngOnChanges(): void {
    if (this.isOpen) {
      this.resetForm();
      this.calculatePaymentAmount();
      console.log('🔍 Modal opened:', {
      isOpen: this.isOpen,
      eventFee: this.eventFee,
      students: this.students?.length,
      paymentSection: 'Should be visible'
    });

    }
  }

  /**
   * Calculate payment amount with tax
   */
  calculatePaymentAmount(): void {
    if (this.isCoveredBySubscription) {
      // Free enrollment with subscription
      this.paymentAmount = 0;
    } else if (this.eventFee > 0) {
      const subtotal = this.eventFee;
      const tax = subtotal * 0.15; // 15% VAT
      this.paymentAmount = subtotal + tax;
    }
  }

  /**
   * Check if event is covered by student's subscription
   */
  checkSubscriptionCoverage(): void {
    if (!this.selectedStudentId || !this.eventId) {
      return;
    }

    this.isCheckingCoverage = true;
    this.subscriptionCoverage = null;
    this.isCoveredBySubscription = false;

    this.subscriptionService.checkCoverage({
      studentId: this.selectedStudentId,
      eventId: this.eventId
    }).subscribe({
      next: (response) => {
        console.log('🎯 Subscription coverage:', response);
        this.subscriptionCoverage = response;
        this.isCoveredBySubscription = response.isCovered && response.freeEnrollment;
        
        if (this.isCoveredBySubscription) {
          // Disable payment section and set to free
          this.payNow = false;
          this.calculatePaymentAmount();
          this.toastr.showSuccess(
            `✨ FREE Enrollment! ${response.message}`
          );
        } else {
          this.calculatePaymentAmount();
        }
        
        this.isCheckingCoverage = false;
      },
      error: (error) => {
        console.error('❌ Error checking coverage:', error);
        this.isCheckingCoverage = false;
        // Continue with normal enrollment if check fails
        this.calculatePaymentAmount();
      }
    });
  }

  /**
   * Handle student selection change
   */
  onStudentChange(): void {
    console.log('👤 Student changed:', this.selectedStudentId);
    this.checkSubscriptionCoverage();
  }

  /**
   * Handle pay now checkbox change
   */
  onPayNowChange(): void {
    console.log('💳 Pay now changed:', this.payNow);
    if (!this.payNow) {
      // Clear payment fields if unchecked
      this.paymentReference = '';
      this.paymentNotes = '';
    }
  }

  /**
   * Enroll student
   */
  enrollStudent(): void {
    // Validation
    if (!this.selectedStudentId || this.selectedStudentId === 0) {
      this.toastr.showError('Please select a student');
      return;
    }

    if (!this.eventId) {
      this.toastr.showError('Event ID is missing');
      return;
    }

    // Prepare enrollment data
    const enrollmentData: EnrollStudentWithPaymentDto = {
      studentId: this.selectedStudentId,
      eventId: this.eventId,
      enrollmentNotes: this.enrollmentNotes || undefined,
      payNow: this.payNow,
      paymentMethod: this.payNow ? this.paymentMethod : undefined,
      paymentAmount: this.payNow ? this.paymentAmount : undefined,
      paymentReference: this.payNow ? this.paymentReference : undefined,
      paymentNotes: this.payNow ? this.paymentNotes : undefined
    };

    console.log('📊 Enrollment data:', enrollmentData);

    this.isSaving = true;

    this.enrollmentService.enrollWithPayment(enrollmentData).subscribe({
      next: (response) => {
        console.log('✅ Enrollment response:', response);
        
        this.toastr.showSuccess(response.message);
        
        if (response.invoiceNumber) {
          this.toastr.showInfo(`Invoice: ${response.invoiceNumber}`);
        }
        
        if (response.receiptNumber) {
          this.toastr.showSuccess(`Receipt: ${response.receiptNumber}`);
        }

        this.isSaving = false;
        this.enrollmentCreated.emit();
        this.close();
      },
      error: (error) => {
        console.error('❌ Enrollment error:', error);
        this.isSaving = false;
        
        const errorMessage = error.error?.message || 'Failed to enroll student';
        this.toastr.showError(errorMessage);
      }
    });
  }

  /**
   * Reset form
   */
  resetForm(): void {
    this.selectedStudentId = 0;
    this.enrollmentNotes = '';
    this.payNow = false;
    this.paymentMethod = 'Cash';
    this.paymentReference = '';
    this.paymentNotes = '';
    this.isSaving = false;
    this.subscriptionCoverage = null;
    this.isCoveredBySubscription = false;
    this.calculatePaymentAmount();
  }

  /**
   * Close modal
   */
  close(): void {
    this.closeModal.emit();
  }

  /**
   * Get selected student name
   */
  getSelectedStudentName(): string {
    const student = this.students.find(s => s.studentId === this.selectedStudentId);
    return student ? student.fullName : '';
  }
}
