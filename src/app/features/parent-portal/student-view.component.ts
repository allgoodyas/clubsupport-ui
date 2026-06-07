import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ParentService, ChildSummary, ChildEnrollment } from '../../core/services/parent.service';
import { ToastService } from '../../core/services/toast.service';
import { environment } from '../../../environments/environment';
import { StudentIdCardComponent } from '../../shared/components/student-id-card/student-id-card.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-student-view',
  standalone: true,
  imports: [CommonModule, StudentIdCardComponent],
  templateUrl: './student-view.component.html',
  styleUrls: ['./student-view.component.scss']
})
export class StudentViewComponent implements OnInit, OnDestroy {
  student: ChildSummary | null = null;
  enrollments: ChildEnrollment[] = [];
  studentId: number = 0;
  isLoading = false;
  error: string | null = null;
  qrCodeUrl: string = '';
  showQRCode   = false;
  showIdCard   = false;

  // Photo loaded with Bearer token
  studentPhotoUrl: SafeUrl | null = null;
  private _blobUrl: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private parentService: ParentService,
    private toastService: ToastService,
    private authService: AuthService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnDestroy(): void {
    if (this._blobUrl) URL.revokeObjectURL(this._blobUrl);
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.studentId = +params['id'];
      if (this.studentId) {
        this.loadStudentDetails();
      }
    });
  }

  loadStudentDetails() {
    this.isLoading = true;
    this.error = null;

    this.parentService.getChildDetails(this.studentId).subscribe({
      next: (response) => {
        if (response.success) {
          this.student = response.student;
          this.enrollments = response.enrollments;
          this.loadStudentPhoto();
        } else {
          this.error = 'Failed to load student details';
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('❌ Error loading student:', err);
        this.error = 'Error loading student details. Please try again.';
        this.isLoading = false;
        this.toastService.showError('Error loading student details');
      }
    });
  }

  private loadStudentPhoto(): void {
    this.http.get(
      `${environment.apiUrl}/students/${this.studentId}/photo`,
      { responseType: 'blob' }
    ).subscribe({
      next: blob => {
        if (this._blobUrl) URL.revokeObjectURL(this._blobUrl);
        this._blobUrl = URL.createObjectURL(blob);
        this.studentPhotoUrl = this.sanitizer.bypassSecurityTrustUrl(this._blobUrl);
      },
      error: () => { this.studentPhotoUrl = null; }
    });
  }

  goBack() {
    this.router.navigate(['/parent/dashboard']);
  }

  viewPendingInvoices() {
    this.router.navigate(['/parent/invoices'], { queryParams: { childId: this.studentId } });
  }

  formatCurrency(amount: number): string {
    return `${amount.toFixed(2)} SAR`;
  }

  formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getAge(dateOfBirth: string | Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  getGenderEmoji(gender: string): string {
    return gender.toLowerCase() === 'male' ? '👦' : '👧';
  }

  getEventTypeEmoji(eventType: string): string {
    const emojiMap: { [key: string]: string } = {
      'Training': '🏋️',
      'Tournament': '🏆',
      'Camp': '🏕️',
      'Workshop': '🎯',
      'Match': '⚽',
      'Competition': '🥇',
      'Class': '📚'
    };
    return emojiMap[eventType] || '📅';
  }

  getStatusBadgeClass(isActive: boolean): string {
    return isActive ? 'status-active' : 'status-inactive';
  }

  toggleQRCode() {
    this.showQRCode = !this.showQRCode;
    if (this.showQRCode && !this.qrCodeUrl) {
      this.loadQRCode();
    }
  }

  loadQRCode() {
    // Use the base64 endpoint — HttpClient sends the Bearer token via the auth interceptor
    // (plain <img src> cannot send Authorization headers, so we can't use the PNG endpoint directly)
    this.http.get<any>(`${environment.apiUrl}/QRCode/student/${this.studentId}/base64`).subscribe({
      next: (res) => {
        if (res.success && res.qrCode) {
          this.qrCodeUrl = `data:image/png;base64,${res.qrCode}`;
          console.log('📱 QR Code loaded successfully');
        } else {
          this.toastService.showError('Failed to generate QR code');
        }
      },
      error: (err) => {
        console.error('❌ Error loading QR code:', err);
        this.toastService.showError('Error loading QR code. Please try again.');
      }
    });
  }

  downloadQRCode() {
    // If QR already loaded, download directly from the data URL
    if (this.qrCodeUrl) {
      const a = document.createElement('a');
      a.href = this.qrCodeUrl;
      a.download = `student-${this.studentId}-qrcode.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      this.toastService.showSuccess('QR Code downloaded successfully');
      return;
    }

    // If not yet loaded, fetch first then download
    this.http.get<any>(`${environment.apiUrl}/QRCode/student/${this.studentId}/base64`).subscribe({
      next: (res) => {
        if (res.success && res.qrCode) {
          const dataUrl = `data:image/png;base64,${res.qrCode}`;
          this.qrCodeUrl = dataUrl;
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = `student-${this.studentId}-qrcode.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          this.toastService.showSuccess('QR Code downloaded successfully');
        } else {
          this.toastService.showError('Failed to generate QR code');
        }
      },
      error: (err) => {
        console.error('Error downloading QR code:', err);
        this.toastService.showError('Error downloading QR code');
      }
    });
  }

  onPhotoError(event: any) {
    // Hide the image if it fails to load (e.g., student has no photo)
    event.target.style.display = 'none';
  }
}
