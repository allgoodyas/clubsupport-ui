import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { StudentService } from '../../core/services/student.service';
import { ToastService } from '../../shared/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher.component';
import { PaymentPanelComponent } from '../../shared/components/payment-panel/payment-panel.component';
import { StudentDetails } from '../../models/api.models';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

// ===================================================
// INTERFACES
// ===================================================

interface StudentTeam {
  teamId: number;
  nameEn: string;
  nameAr?: string;
  ageGroup?: string;
  color?: string;
}

interface PaymentSummary {
  totalInvoices: number;
  paidInvoices: number;
  unpaidInvoices: number;
  totalAmount: number;
  totalPaid: number;
  totalOutstanding: number;
  currentDue: number;
}


@Component({
  selector: 'app-student-details',
  standalone: true,
  imports: [CommonModule, 
  TranslateModule, 
  LanguageSwitcherComponent,
  PaymentPanelComponent
  ],
  
  templateUrl: './student-details.component.html',
  styleUrl: './student-details.component.scss'
})
export class StudentDetailsComponent implements OnInit ,OnDestroy {
  student: StudentDetails | null = null;
  isLoading: boolean = false;
  photoUrl: SafeUrl | null = null;
  studentId: number = 0;
 
  // ===================================================
  // PAYMENT FEATURES - NEW
  // ===================================================
  
  paymentSummary: PaymentSummary | null = null;
  loadingPaymentSummary: boolean = false;
  showPaymentPanel: boolean = false;

  // Teams
  studentTeams: StudentTeam[] = [];
  loadingTeams = false;


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private studentService: StudentService,
    private toastService: ToastService,
    private authService: AuthService,
    private sanitizer: DomSanitizer,
	private http: HttpClient  
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.studentId = parseInt(id, 10);
      this.loadStudentDetails();
      this.loadPaymentSummary();
      this.loadStudentTeams();
    } else {
      this.toastService.error('Invalid student ID');
      this.goBack();
    }
  }

  ngOnDestroy(): void {
    // Clean up blob URL
    if (this.photoUrl && typeof this.photoUrl === 'string') {
      URL.revokeObjectURL(this.photoUrl);
    }
  }

  loadStudentDetails(): void {
    this.isLoading = true;

    this.studentService.getStudentById(this.studentId).subscribe({
      next: (student) => {
        this.student = student;
        this.isLoading = false;

        // Load photo if student has one
        if (student.hasPhoto) {
          this.loadPhoto();
        }
      },
      error: (error) => {
        console.error('Error loading student details:', error);
        this.toastService.error('Failed to load student details');
        this.isLoading = false;
        this.goBack();
      }
    });
  }

  loadPhoto(): void {
    // Get token from auth service
    const token = this.authService.getToken();
    
    if (!token) {
      console.error('No auth token available');
      return;
    }

    // Use authenticated photo URL with blob
    fetch(this.studentService.getStudentPhotoUrl(this.studentId), {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.blob();
    })
    .then(blob => {
      const objectUrl = URL.createObjectURL(blob);
      this.photoUrl = this.sanitizer.bypassSecurityTrustUrl(objectUrl);
    })
    .catch(error => {
      console.error('Error loading photo:', error);
    });
  }
  
  // ===================================================
  // PAYMENT SUMMARY - NEW
  // ===================================================
  
  loadPaymentSummary(): void {
    this.loadingPaymentSummary = true;
    console.log('📊 Loading payment summary for student:', this.studentId);

    this.http.get<PaymentSummary>(
      `${environment.apiUrl}/Payment/student/${this.studentId}/summary`
    ).subscribe({
      next: (summary) => {
        this.paymentSummary = summary;
        this.loadingPaymentSummary = false;
        console.log('✅ Payment summary loaded:', summary);
      },
      error: (error) => {
        console.error('❌ Error loading payment summary:', error);
        this.loadingPaymentSummary = false;
        // Don't show error toast - summary is optional
      }
    });
  }

  // ===================================================
  // PAYMENT PANEL - NEW
  // ===================================================
  
  openPaymentPanel(): void {
    console.log('💳 Opening payment panel for student:', this.studentId);
    this.showPaymentPanel = true;
  }

  closePaymentPanel(): void {
    console.log('Closing payment panel');
    this.showPaymentPanel = false;
  }

  onPaymentRecorded(): void {
    console.log('✅ Payment recorded - refreshing summary');
    this.closePaymentPanel();
    this.loadPaymentSummary();  // Refresh summary
    this.toastService.success('Payment recorded successfully!');
  }


  // ── Teams ──────────────────────────────────────────────────

  loadStudentTeams(): void {
    this.loadingTeams = true;
    this.http.get<StudentTeam[]>(
      `${environment.apiUrl}/teams/student/${this.studentId}`
    ).subscribe({
      next: (t) => { this.studentTeams = t; this.loadingTeams = false; },
      error: () => { this.loadingTeams = false; }
    });
  }

  getTeamBadgeStyle(color?: string): object {
    const c = color || '#3B82F6';
    return { 'background-color': c + '22', 'color': c, 'border': '1px solid ' + c + '55' };
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  editStudent(): void {
    this.router.navigate(['/students', this.studentId, 'edit']);
  }

  editParent(): void {
    this.router.navigate(['/students', this.studentId, 'edit-parent']);
  }

  goBack(): void {
    this.router.navigate(['/students']);
  }
}
