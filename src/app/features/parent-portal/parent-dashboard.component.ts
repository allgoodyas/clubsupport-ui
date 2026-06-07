import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ParentService, DashboardSummary, ChildSummary } from '../../core/services/parent.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { PushNotificationService } from '../../core/services/push-notification.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-parent-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './parent-dashboard.component.html',
  styleUrls: ['./parent-dashboard.component.scss']
})
export class ParentDashboardComponent implements OnInit, OnDestroy {
  summary: DashboardSummary | null = null;
  children: ChildSummary[] = [];
  isLoading = false;
  error: string | null = null;
  currentUser: any = null;

  // Photo blob URLs keyed by studentId
  childPhotoUrls = new Map<number, SafeUrl>();
  private blobUrls: string[] = [];   // track for revoke on destroy

  get clubLogoUrl(): string | null {
    const t = this.currentUser?.theme as any;
    if (!t?.logoBase64) return null;
    const mime = t.logoContentType || 'image/png';
    return `data:${mime};base64,${t.logoBase64}`;
  }

  constructor(
    private parentService: ParentService,
    private router: Router,
    private http: HttpClient,
    private toastService: ToastService,
    private authService: AuthService,
    private themeService: ThemeService,
    private sanitizer: DomSanitizer,
    private pushService: PushNotificationService
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.currentUserValue;

    // Apply club theme
    if (this.currentUser?.clubId) {
      this.themeService.loadAndApplyClubTheme(this.currentUser.clubId).subscribe({
        error: () => this.themeService.loadThemeFromStorage()
      });
    } else {
      this.themeService.loadThemeFromStorage();
    }

    this.loadDashboard();

    // Initialise push notifications for parent users (non-blocking)
    this.initPushNotifications();
  }

  private async initPushNotifications(): Promise<void> {
    if (!this.pushService.isPushSupported()) return;
    if (this.pushService.isPermissionDenied()) return;

    // Register SW first
    await this.pushService.init();

    // If already subscribed, nothing to do
    if (await this.pushService.isSubscribed()) return;

    // Ask permission and subscribe
    // Small delay so dashboard loads first — avoids jarring immediate permission prompt
    setTimeout(async () => {
      const granted = await this.pushService.requestPermissionAndSubscribe();
      if (granted) {
        this.toastService.showSuccess('🔔 Notifications enabled — you\'ll be notified when attendance is marked');
      }
    }, 3000);
  }

  getInitials(name?: string | null): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
  }

  loadDashboard() {
    console.log('📥 loadDashboard() called');
    this.isLoading = true;
    this.error = null;

    console.log('🔄 Calling ParentService.getDashboardSummary()');
    // Load dashboard summary
    this.parentService.getDashboardSummary().subscribe({
      next: (response) => {
        if (response.success) {
          this.summary = response.summary;
          this.loadChildren();
        } else {
          this.error = 'Failed to load dashboard';
          this.isLoading = false;
        }
      },
      error: (err) => {
        console.error('Error loading dashboard:', err);
        this.error = 'Error loading dashboard. Please try again.';
        this.isLoading = false;
        this.toastService.showError('Error loading dashboard');
      }
    });
  }

  ngOnDestroy(): void {
    this.blobUrls.forEach(u => URL.revokeObjectURL(u));
  }

  loadChildren() {
    this.parentService.getMyChildren().subscribe({
      next: (response) => {
        if (response.success) {
          this.children = response.children;
          // Fetch each child's photo with Bearer token
          this.children.forEach(c => this.loadChildPhoto(c.studentId));
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading children:', err);
        this.isLoading = false;
        this.toastService.showError('Error loading children');
      }
    });
  }

  private loadChildPhoto(studentId: number): void {
    this.http.get(
      `${environment.apiUrl}/students/${studentId}/photo`,
      { responseType: 'blob' }
    ).subscribe({
      next: blob => {
        const objectUrl = URL.createObjectURL(blob);
        this.blobUrls.push(objectUrl);
        this.childPhotoUrls.set(studentId,
          this.sanitizer.bypassSecurityTrustUrl(objectUrl));
      },
      error: () => { /* no photo — show emoji fallback */ }
    });
  }

  getChildPhotoUrl(studentId: number): SafeUrl | null {
    return this.childPhotoUrls.get(studentId) || null;
  }

  viewChild(childId: number) {
    this.router.navigate(['/parent/student', childId]);
  }

  viewPendingInvoices(childId?: number) {
    if (childId) {
      this.router.navigate(['/parent/invoices'], { queryParams: { childId } });
    } else {
      this.router.navigate(['/parent/invoices']);
    }
  }

  payNow(childId?: number) {
    this.router.navigate(['/parent/invoices'], { queryParams: { childId } });
  }

  formatCurrency(amount: number): string {
    return `${amount.toFixed(2)} SAR`;
  }

  getChildInitials(name: string): string {
    const names = name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  getGenderEmoji(gender: string): string {
    return gender.toLowerCase() === 'male' ? '👦' : '👧';
  }

  logout() {
    const redirectUrl = this.authService.getLogoutRedirectUrl();
    this.authService.logout();
    this.toastService.showSuccess('Logged out successfully');
    this.router.navigateByUrl(redirectUrl);
  }

  goToProfile() {
    this.router.navigate(['/parent/profile']);
  }

  onPhotoError(event: any) {
    // Hide the image if it fails to load (e.g., student has no photo)
    event.target.style.display = 'none';
  }

  viewEvents(studentId: number) {
    console.log('📅 Viewing events for student:', studentId);
    this.router.navigate(['/parent/progress/events', studentId]);
  }

  viewAttendance(studentId: number) {
    const child = this.children.find(c => c.studentId === studentId);
    this.router.navigate(['/parent/progress/attendance', studentId], {
      state: { studentName: child?.studentName || '' }
    });
  }

  viewSubscriptions(studentId: number) {
    console.log('🎯 Viewing subscriptions for student:', studentId);
    this.router.navigate(['/parent/progress/subscriptions', studentId]);
  }
}
