// enroll-student-dialog.component.ts
// Dialog for enrolling students in events - WITH PAYMENT SUPPORT

import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { EnrollmentService } from '../../../../core/services/enrollment.service'
import { StudentService } from '../../../../core/services/student.service';
import {
  EnrollStudentRequest,
  EligibilityCheckResult
} from '../../../../shared/models/enrollment.model';
import { StudentListItem } from '../../../../models/api.models';

@Component({
  selector: 'app-enroll-student-dialog',
  standalone: false,
  templateUrl: './enroll-student-dialog.component.html',
  styleUrls: ['./enroll-student-dialog.component.css']
})
export class EnrollStudentDialogComponent implements OnInit {
  @Input() eventId!: number;
  @Input() eventName!: string;
  @Input() eventFee: number = 0; // NEW: Event registration fee
  @Output() closed = new EventEmitter<void>();
  @Output() enrolled = new EventEmitter<void>();

  students: StudentListItem[] = [];
  filteredStudents: StudentListItem[] = [];
  searchTerm: string = '';
  selectedStudent: StudentListItem | null = null;
  enrollmentNotes: string = '';
  
  eligibilityResult: EligibilityCheckResult | null = null;
  isCheckingEligibility: boolean = false;
  isEnrolling: boolean = false;
  showEligibilityWarnings: boolean = false;
  acknowledgeWarnings: boolean = false;

  // NEW: Payment fields
  payNow: boolean = false;
  paymentMethod: string = 'Cash';
  paymentAmount: number = 0;
  paymentReference: string = '';
  paymentNotes: string = '';

  // NEW: Payment methods
  paymentMethods = [
    { value: 'Cash', label: '💵 Cash' },
    { value: 'BankTransfer', label: '🏦 Bank Transfer' },
    { value: 'Card', label: '💳 Card' },
    { value: 'Online', label: '🌐 Online' },
    { value: 'STCPay', label: '📱 STC Pay' },
    { value: 'Mada', label: '💳 Mada' }
  ];

  constructor(
    private enrollmentService: EnrollmentService,
    private studentService: StudentService
  ) {}

  ngOnInit(): void {
    this.loadStudents();
    this.calculatePaymentAmount();
    // alert(this.eventFee);
  }

  // NEW: Calculate payment amount with tax
  calculatePaymentAmount(): void {
    if (this.eventFee > 0) {
      const subtotal = this.eventFee;
      const tax = subtotal * 0.15; // 15% VAT
      this.paymentAmount = subtotal + tax;
    }
  }

  // NEW: Handle pay now checkbox change
  onPayNowChange(): void {
    console.log('💳 Pay now changed:', this.payNow);
    if (!this.payNow) {
      // Clear payment fields if unchecked
      this.paymentReference = '';
      this.paymentNotes = '';
    }
  }

  loadStudents(): void {
    this.studentService.getStudents().subscribe({
      next: (students) => {
        this.students = students;
        this.filteredStudents = students;
      },
      error: (error: any) => {
        console.error('Error loading students:', error);
      }
    });
  }

  filterStudents(): void {
    if (!this.searchTerm) {
      this.filteredStudents = this.students;
      return;
    }

    const search = this.searchTerm.toLowerCase();
    this.filteredStudents = this.students.filter(student =>
      student.fullName.toLowerCase().includes(search)
    );
  }

  selectStudent(student: StudentListItem): void {
    this.selectedStudent = student;
    this.checkEligibility();
  }

  checkEligibility(): void {
    if (!this.selectedStudent) return;

    this.isCheckingEligibility = true;
    this.eligibilityResult = null;
    this.showEligibilityWarnings = false;
    this.acknowledgeWarnings = false;

    this.enrollmentService.checkEligibility(this.eventId, this.selectedStudent.studentId).subscribe({
      next: (response) => {
        this.isCheckingEligibility = false;
        if (response.success && response.data) {
          this.eligibilityResult = response.data;
          this.showEligibilityWarnings = 
            response.data.warnings.length > 0 || 
            response.data.errors.length > 0;
        }
      },
      error: (error: any) => {
        this.isCheckingEligibility = false;
        console.error('Error checking eligibility:', error);
      }
    });
  }

  canEnroll(): boolean {
    if (!this.selectedStudent || !this.eligibilityResult) {
      return false;
    }

    // Has hard errors that block enrollment
    if (this.eligibilityResult.errors.length > 0) {
      return false;
    }

    // Has warnings - need acknowledgment
    if (this.eligibilityResult.warnings.length > 0) {
      return this.acknowledgeWarnings;
    }

    // No errors or warnings
    return true;
  }

  enrollStudent(): void {
    if (!this.selectedStudent || !this.canEnroll()) {
      return;
    }

    this.isEnrolling = true;

    // NEW: Use with-payment endpoint if payment option is available
    if (this.eventFee > 0) {
      // Call the new endpoint with payment support
      const enrollmentData = {
        studentId: this.selectedStudent.studentId,
        eventId: this.eventId,
        enrollmentNotes: this.enrollmentNotes || undefined,
        payNow: this.payNow,
        paymentMethod: this.payNow ? this.paymentMethod : undefined,
        paymentAmount: this.payNow ? this.paymentAmount : undefined,
        paymentReference: this.payNow ? this.paymentReference : undefined,
        paymentNotes: this.payNow ? this.paymentNotes : undefined
      };

      // Call the enrollWithPayment method
      this.enrollmentService.enrollWithPayment(enrollmentData).subscribe({
        next: (response: any) => {
          this.isEnrolling = false;
          if (response.success) {
            console.log('✅ Enrollment successful:', response);
            
            // Show success messages
            if (response.invoiceNumber) {
              console.log('📄 Invoice:', response.invoiceNumber);
            }
            if (response.receiptNumber) {
              console.log('🧾 Receipt:', response.receiptNumber);
            }
            
            this.enrolled.emit();
            this.close();
          }
        },
        error: (error: any) => {
          this.isEnrolling = false;
          console.error('Error enrolling student:', error);
          alert('Failed to enroll student. Please try again.');
        }
      });
    } else {
      // OLD: Use original enrollment without payment
      const request: EnrollStudentRequest = {
        eventId: this.eventId,
        studentId: this.selectedStudent.studentId,
        enrollmentNotes: this.enrollmentNotes || undefined,
        acknowledgeWarnings: this.acknowledgeWarnings
      };

      this.enrollmentService.enrollStudent(request).subscribe({
        next: (response) => {
          this.isEnrolling = false;
          if (response.success) {
            this.enrolled.emit();
            this.close();
          }
        },
        error: (error: any) => {
          this.isEnrolling = false;
          console.error('Error enrolling student:', error);
          alert('Failed to enroll student. Please try again.');
        }
      });
    }
  }

  close(): void {
    this.closed.emit();
  }

  getStudentAge(student: StudentListItem): number {
    return student.age;
  }
}
