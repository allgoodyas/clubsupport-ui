import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/services/toast.service';
import { StudentService } from '../../core/services/student.service';

interface SubscriptionPlan {
  planId: number;
  planNameEn: string;
  descriptionEn: string;
  priceMonthly: number;
  priceYearly?: number;
  maxEventSelections?: number;
  requiresSelection: boolean;
  badgeColor: string;
  eligibleEvents: any[];
  savingsPercentage?: number;
}

interface Student {
  studentId: number;
  fullName: string;
  dateOfBirth?: string;
  idNumber?: string;
  studentCode?: string;
}

@Component({
  selector: 'app-purchase-subscription',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './purchase-subscription.component.html',
  styleUrl: './purchase-subscription.component.scss'
})
export class PurchaseSubscriptionComponent implements OnInit {
  // State
  currentStep = 1; // 1: Student Selection (admin), 2: Event Selection, 3: Payment, 4: Success
  isLoading = false;
  isPurchasing = false;
  
  // Plan
  plan: SubscriptionPlan | null = null;
  planId: number = 0;
  
  // Student Selection (for admin)
  students: Student[] = [];
  filteredStudents: Student[] = [];
  selectedStudentId: number = 0;
  selectedStudent: Student | null = null;
  studentSearchTerm: string = '';
  isAdminFlow = false; // If admin is purchasing for student
  
  // Event Selection (if N < M)
  selectedEventIds: number[] = [];
  
  // Billing
  billingCycle: 'monthly' | 'yearly' = 'monthly';
  autoRenew = true;
  
  // Payment
  paymentMethods = [
    { value: 'Cash', label: '💵 Cash' },
    { value: 'BankTransfer', label: '🏦 Bank Transfer' },
    { value: 'Card', label: '💳 Card' },
    { value: 'Online', label: '🌐 Online' },
    { value: 'STCPay', label: '📱 STC Pay' },
    { value: 'Mada', label: '💳 Mada' }
  ];
  
  // Split payment support
  paymentEntries: Array<{
    methodType: string;
    amount: number;
    referenceNumber: string;
    notes: string;
  }> = [];
  
  // Response
  successData: any = null;
  errorMessage = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private toastr: ToastService,
    private studentService: StudentService
  ) {}

  ngOnInit() {
    // Get plan ID from route
    this.route.params.subscribe(params => {
      if (params['planId']) {
        this.planId = +params['planId'];
        this.loadPlan();
      }
    });
    
    // Check if admin flow (query param)
    this.route.queryParams.subscribe(params => {
      this.isAdminFlow = params['admin'] === 'true';
      
      if (this.isAdminFlow) {
        // Admin purchasing for student - load student list
        this.loadStudents();
        this.currentStep = 1; // Start at student selection
      } else {
        // Student purchasing for themselves - get their ID from auth
        this.loadCurrentStudentId();
        // currentStep will be set after plan loads in loadPlan()
      }
      
      // Get billing cycle from query param
      if (params['billingCycle']) {
        this.billingCycle = params['billingCycle'];
      }
    });
    
    // Initialize with one payment entry
    this.addPaymentEntry();
  }

  loadCurrentStudentId() {
    // Get logged-in user's student ID from localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.selectedStudentId = user.studentId || user.student_id || 0;
        console.log('👤 Current student ID:', this.selectedStudentId);
        
        if (!this.selectedStudentId) {
          this.toastr.showError('❌ Student ID not found. Please log in again.');
          this.router.navigate(['/login']);
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        this.toastr.showError('❌ Failed to get student information');
        this.router.navigate(['/login']);
      }
    } else {
      this.toastr.showError('❌ Not logged in');
      this.router.navigate(['/login']);
    }
  }

  loadPlan() {
    this.isLoading = true;
    this.http.get<SubscriptionPlan>(`${environment.apiUrl}/SubscriptionPlan/${this.planId}`).subscribe({
      next: (plan) => {
        this.plan = plan;
        this.isLoading = false;
        
        // Set initial step for student self-purchase after plan is loaded
        if (!this.isAdminFlow) {
          this.currentStep = this.plan.requiresSelection ? 2 : 3;
          console.log('👉 Student self-purchase: Starting at step', this.currentStep);
        }
      },
      error: (error) => {
        console.error('Error loading plan:', error);
        this.toastr.showError('Failed to load subscription plan');
        this.router.navigate(['/subscriptions/catalog']);
      }
    });
  }

  loadStudents() {
    console.log('🔍 Loading students...');
    this.studentService.getAllStudents().subscribe({
      next: (students) => {
        console.log('✅ Students loaded:', students);
        this.students = students.map(s => ({
          studentId: s.studentId,
          fullName: s.fullName,
          dateOfBirth: (s as any).dateOfBirth || (s as any).date_of_birth,
          idNumber: (s as any).idNumber || (s as any).id_number || (s as any).nationalId,
          studentCode: (s as any).studentCode || (s as any).student_code
        }));
        this.filteredStudents = [...this.students];
        console.log('📋 Parsed students:', this.students.length, 'students');
        if (this.students.length === 0) {
          this.toastr.showError('⚠️ No students found. Please add students first.');
        }
      },
      error: (error) => {
        console.error('❌ Error loading students:', error);
        this.toastr.showError('Failed to load students. Please check your connection.');
      }
    });
  }

  // Student Search
  onStudentSearch() {
    const term = this.studentSearchTerm.toLowerCase().trim();
    
    if (!term) {
      this.filteredStudents = [...this.students];
      return;
    }

    this.filteredStudents = this.students.filter(student => {
      return (
        student.fullName.toLowerCase().includes(term) ||
        student.studentId.toString().includes(term) ||
        (student.idNumber && student.idNumber.toLowerCase().includes(term)) ||
        (student.studentCode && student.studentCode.toLowerCase().includes(term))
      );
    });
  }

  selectStudent(student: Student) {
    this.selectedStudentId = student.studentId;
    this.selectedStudent = student;
  }

  isStudentSelected(studentId: number): boolean {
    return this.selectedStudentId === studentId;
  }

  // Step Navigation
  nextStep() {
    if (this.currentStep === 1) {
      // Step 1: Student Selection (admin only)
      if (this.isAdminFlow && !this.selectedStudentId) {
        this.toastr.showError('Please select a student');
        return;
      }
      // Go to event selection if needed, otherwise payment
      if (this.plan?.requiresSelection) {
        this.currentStep = 2;
      } else {
        this.currentStep = 3;
      }
    } else if (this.currentStep === 2) {
      // Step 2: Event Selection
      if (!this.validateEventSelection()) {
        return;
      }
      this.currentStep = 3;
    }
  }

  previousStep() {
    if (this.currentStep === 3) {
      // From payment, go back to event selection or student selection
      if (this.plan?.requiresSelection) {
        this.currentStep = 2;
      } else {
        this.currentStep = 1;
      }
    } else if (this.currentStep === 2) {
      // From event selection, go back to student selection
      this.currentStep = 1;
    }
  }

  // Event Selection
  toggleEventSelection(eventId: number) {
    const index = this.selectedEventIds.indexOf(eventId);
    if (index > -1) {
      this.selectedEventIds.splice(index, 1);
    } else {
      // Check if already at max
      if (this.plan?.maxEventSelections && this.selectedEventIds.length >= this.plan.maxEventSelections) {
        this.toastr.showError(`You can only select ${this.plan.maxEventSelections} events`);
        return;
      }
      this.selectedEventIds.push(eventId);
    }
  }

  isEventSelected(eventId: number): boolean {
    return this.selectedEventIds.includes(eventId);
  }

  validateEventSelection(): boolean {
    if (!this.plan?.maxEventSelections) return true;
    
    if (this.selectedEventIds.length !== this.plan.maxEventSelections) {
      this.toastr.showError(`Please select exactly ${this.plan.maxEventSelections} events`);
      return false;
    }
    return true;
  }

  // Payment
  addPaymentEntry() {
    this.paymentEntries.push({
      methodType: 'Cash',
      amount: 0,
      referenceNumber: '',
      notes: ''
    });
  }

  removePaymentEntry(index: number) {
    if (this.paymentEntries.length > 1) {
      this.paymentEntries.splice(index, 1);
    }
  }

  getTotalPaymentAmount(): number {
    return this.paymentEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
  }

  getSubscriptionPrice(): number {
    if (!this.plan) return 0;
    return this.billingCycle === 'monthly' ? this.plan.priceMonthly : (this.plan.priceYearly || this.plan.priceMonthly * 12);
  }

  // Purchase
  purchaseSubscription() {
    // Validation
    if (this.isAdminFlow && !this.selectedStudentId) {
      this.toastr.showError('Please select a student');
      return;
    }

    if (this.plan?.requiresSelection && !this.validateEventSelection()) {
      return;
    }

    const totalPaid = this.getTotalPaymentAmount();
    const price = this.getSubscriptionPrice();
    
    if (totalPaid !== price) {
      this.toastr.showError(`Total payment (${totalPaid}) must equal subscription price (${price})`);
      return;
    }

    this.isPurchasing = true;
    this.errorMessage = '';

    const purchaseData = {
      StudentId: this.selectedStudentId, // Pascal case for C# backend
      PlanId: this.planId,
      BillingCycle: this.billingCycle,
      SelectedEventIds: this.plan?.requiresSelection ? this.selectedEventIds : [], // Empty array instead of null
      PaymentAmount: price,
      PaymentMethods: this.paymentEntries.map(entry => ({
        MethodType: entry.methodType,
        Amount: entry.amount,
        ReferenceNumber: entry.referenceNumber || '',
        Notes: entry.notes || ''
      })),
      AutoRenew: this.autoRenew,
      PurchasedBy: this.isAdminFlow ? 'admin' : 'student',
      Notes: '' // Root level notes field (required by backend)
    };

    this.http.post(`${environment.apiUrl}/StudentSubscription/purchase`, purchaseData).subscribe({
      next: (response: any) => {
        this.successData = response;
        this.currentStep = 4;
        this.isPurchasing = false;
        this.toastr.showSuccess('🎉 Subscription activated successfully!');
      },
      error: (error) => {
        console.error('Error purchasing subscription:', error);
        this.errorMessage = error.error?.message || 'Failed to purchase subscription';
        this.toastr.showError(this.errorMessage);
        this.isPurchasing = false;
      }
    });
  }

  // Navigation
  goToMySubscriptions() {
    this.router.navigate(['/subscriptions/my-subscriptions']);
  }

  goToCatalog() {
    // If admin flow, go back to admin plans page
    if (this.isAdminFlow) {
      this.router.navigate(['/subscriptions/admin']);
    } else {
      // Otherwise go to catalog
      this.router.navigate(['/subscriptions/catalog']);
    }
  }

  getBadgeIcon(color: string): string {
    return color === 'gold' ? '🥇' : color === 'silver' ? '🥈' : '🥉';
  }

  getEventNameById(eventId: number): string {
    const event = this.plan?.eligibleEvents.find(e => e.eventId === eventId);
    return event?.eventNameEn || 'Unknown Event';
  }

  setBillingCycle(cycle: 'monthly' | 'yearly') {
    this.billingCycle = cycle;
    console.log('📅 Billing cycle changed to:', cycle);
  }
}
