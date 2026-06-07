// enrolled-students-list.component.ts
// Component to display and manage enrolled students for an event

import { Component, OnInit, Input } from '@angular/core';
import { EnrollmentService } from '../../../../core/services/enrollment.service';
import { EnrolledStudentDto } from '../../../../shared/models/enrollment.model';

@Component({
  selector: 'app-enrolled-students-list',
  standalone: false,
  templateUrl: './enrolled-students-list.component.html',
  styleUrls: ['./enrolled-students-list.component.css']
})
export class EnrolledStudentsListComponent implements OnInit {
  @Input() eventId!: number;
  @Input() eventFee: number = 0;

  enrollments: EnrolledStudentDto[] = [];
  loading: boolean = true;
  showEnrollDialog: boolean = false;  
  
  // Filters
  filterStatus: string = 'all';
  filterPayment: string = 'all';
  searchTerm: string = '';

  constructor(private enrollmentService: EnrollmentService) {}

  ngOnInit(): void {
      console.log('🔍 Enrolled students list initialized with eventFee:', this.eventFee);		 
    this.loadEnrollments();
  }

  loadEnrollments(): void {
    this.loading = true;
    this.enrollmentService.getEventEnrollments(this.eventId).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success && response.data) {
          this.enrollments = response.data;
        }
      },
      error: (error: any) => {
        this.loading = false;
        console.error('Error loading enrollments:', error);
      }
    });
  }

  getFilteredEnrollments(): EnrolledStudentDto[] {
    return this.enrollments.filter(enrollment => {
      // Status filter
      if (this.filterStatus !== 'all' && enrollment.status !== this.filterStatus) {
        return false;
      }

      // Payment filter
      if (this.filterPayment !== 'all' && enrollment.paymentStatus !== this.filterPayment) {
        return false;
      }

      // Search filter
      if (this.searchTerm) {
        const search = this.searchTerm.toLowerCase();
        return enrollment.studentNameEn.toLowerCase().includes(search);
      }

      return true;
    });
  }

  getEnrollmentCount(): { enrolled: number; waitlist: number; total: number } {
    const enrolled = this.enrollments.filter(e => e.status === 'Enrolled').length;
    const waitlist = this.enrollments.filter(e => e.status === 'Waitlist').length;
    return { enrolled, waitlist, total: this.enrollments.length };
  }

onStudentEnrolled(): void {
    console.log('✅ Student enrolled successfully, refreshing list');
    this.showEnrollDialog = false;
    this.loadEnrollments(); // Refresh the list
  }
  cancelEnrollment(enrollment: EnrolledStudentDto): void {
    const reason = prompt('Enter cancellation reason (optional):');
    if (reason === null) return; // User clicked cancel

    if (confirm(`Cancel enrollment for ${enrollment.studentNameEn}?`)) {
      this.enrollmentService.cancelEnrollment(enrollment.enrollmentId, reason || undefined).subscribe({
        next: (response) => {
          if (response.success) {
            this.loadEnrollments();
          }
        },
        error: (error: any) => {
          console.error('Error cancelling enrollment:', error);
          alert('Failed to cancel enrollment. Please try again.');
        }
      });
    }
  }

  getStatusBadgeClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'Enrolled': 'badge-success',
      'Waitlist': 'badge-warning',
      'Cancelled': 'badge-danger',
      'Completed': 'badge-info'
    };
    return statusClasses[status] || 'badge-default';
  }

  getPaymentBadgeClass(paymentStatus: string): string {
    const paymentClasses: { [key: string]: string } = {
      'Paid': 'badge-success',
      'Pending': 'badge-warning',
      'Partial': 'badge-info',
      'Waived': 'badge-secondary',
      'Refunded': 'badge-danger'
    };
    return paymentClasses[paymentStatus] || 'badge-default';
  }

 

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }
}
