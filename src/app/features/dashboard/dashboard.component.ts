import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';
import { UserInfo } from '../../models/api.models';
import { EventsService } from '../../core/services/events.service';
import { ThemeService } from '../../core/services/theme.service';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher.component';
import { SidebarNavigationComponent } from '../../shared/components/sidebar-navigation/sidebar-navigation.component';
import { PaymentPanelComponent } from '../../shared/components/payment-panel/payment-panel.component';
import { QuickAttendancePanelComponent } from '../../shared/components/quick-attendance-panel/quick-attendance-panel.component';
import { ToastService } from '../../core/services/toast.service';
import { SidebarStateService } from '../../core/services/sidebar-state.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { environment } from '../../../environments/environment';

interface EventStats {
  totalEvents: number;
  upcomingEvents: number;
  activeEvents: number;
  thisMonthEvents: number;
  totalEnrollments: number;
  publishedEvents: number;
  draftEvents: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule,
    LanguageSwitcherComponent, SidebarNavigationComponent,
    PaymentPanelComponent, QuickAttendancePanelComponent,
    PageHeaderComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: [
    './dashboard.component.scss',
    './notification-styles.scss'
  ]
})
export class DashboardComponent implements OnInit, OnDestroy {
  currentUser: UserInfo | null = null;
  permissions: string[] = [];
  hasLogo = false;
  logoUrl: SafeUrl | null = null;

  eventStats: EventStats = {
    totalEvents: 0, upcomingEvents: 0, activeEvents: 0,
    thisMonthEvents: 0, totalEnrollments: 0, publishedEvents: 0, draftEvents: 0
  };
  loadingStats = true;
  upcomingEvents: any[] = [];
  loadingUpcomingEvents = true;
  isSidebarOpen = false;

  private readonly apiBase = environment.apiUrl;

  // Payment history panel
  showPaymentPanel = false;
  phLoading = false;
  phRows: any[] = [];
  phFiltered: any[] = [];
  phEvents: any[] = [];
  phEventId = 0;
  phStudentName = '';
  phStatus = 'all';
  phSummary = { pending: 0, paid: 0, total: 0 };
  phSearchTimer: any;
  pendingPaymentCount = 0;
  loadingPaymentStats = true;

  showQuickPay = false;
  quickPayData: any = null;
  showAuditPanel = false;
  auditRow: any = null;
  showAttendancePanel = false;

  // Refund panel
  showRefundPanel = false;
  refundData: any = null;
  refundAmount = 0;
  refundMethod = 'Cash';
  refundReason = '';
  refundReference = '';
  isProcessingRefund = false;
  refundSuccess: any = null;
  refundHistory: any[] = [];
  loadingRefundHistory = false;

  refundMethods = [
    { value: 'Cash',         label: '💵 Cash' },
    { value: 'Card',         label: '💳 Card' },
    { value: 'BankTransfer', label: '🏦 Bank Transfer' },
    { value: 'Online',       label: '🌐 Online' },
    { value: 'STCPay',       label: '📱 STC Pay' },
    { value: 'Mada',         label: '💳 Mada' },
    { value: 'Check',        label: '📝 Check' },
    { value: 'Other',        label: '🔄 Other' }
  ];

  // Send Notification Panel
  showNotifPanel   = false;
  notifType        = '';
  notifPreviewing  = false;
  notifSending     = false;
  notifPreview: any = null;
  notifResult: any  = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private eventsService: EventsService,
    private themeService: ThemeService,
    private toastService: ToastService,
    private sidebarState: SidebarStateService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.hasLogo = user?.theme?.hasLogo || false;
      this.loadClubTheme();
      if (this.hasLogo) this.loadLogo();
    });
    this.permissions = this.authService.permissions;
    this.loadEventStats();
    this.loadUpcomingEvents();
    if (this.hasPermission('view_payments')) this.loadPendingCount();
  }

  ngOnDestroy(): void {
    if (this.logoUrl) URL.revokeObjectURL(this.logoUrl.toString());
  }

  // ── Send Notification Panel ──────────────────────────────────

  openSendNotification(): void { this.showNotifPanel = true; this.resetNotifState(); }
  closeNotifPanel(): void      { this.showNotifPanel = false; this.resetNotifState(); }

  resetNotifState(): void {
    this.notifPreviewing = false;
    this.notifSending    = false;
    this.notifPreview    = null;
    this.notifResult     = null;
  }

  previewNotification(): void {
    if (!this.notifType) return;
    this.notifPreviewing = true;
    this.notifPreview    = null;
    this.http.post<any>(`${this.apiBase}/Notifications/preview`, { notificationType: this.notifType }).subscribe({
      next: (res) => {
        this.notifPreviewing = false;
        if (res.success) this.notifPreview = res.preview;
        else this.toastService.showError(res.message || 'Preview failed');
      },
      error: (err) => {
        this.notifPreviewing = false;
        this.toastService.showError(err.error?.message || 'Preview failed');
      }
    });
  }

  sendNotification(): void {
    if (!this.notifType) return;
    this.notifSending = true;
    this.http.post<any>(`${this.apiBase}/Notifications/send-manual`, { notificationType: this.notifType }).subscribe({
      next: (res) => {
        this.notifSending = false;
        this.notifResult  = res;
        if (res.success) this.toastService.showSuccess(res.message);
      },
      error: (err) => {
        this.notifSending = false;
        this.notifResult  = { success: false, message: err.error?.message || 'Failed to send notifications' };
      }
    });
  }

  // ── Stats ────────────────────────────────────────────────────

  loadEventStats(): void {
    if (!this.hasPermission('view_events')) { this.loadingStats = false; return; }
    this.eventsService.getEventStats().subscribe({
      next: (r) => { if (r.success && r.data) this.eventStats = r.data; this.loadingStats = false; },
      error: () => { this.loadingStats = false; }
    });
  }

  loadUpcomingEvents(): void {
    if (!this.hasPermission('view_events')) { this.loadingUpcomingEvents = false; return; }
    this.eventsService.getUpcomingEvents(5).subscribe({
      next: (r) => { if (r.success && r.data) this.upcomingEvents = r.data; this.loadingUpcomingEvents = false; },
      error: () => { this.loadingUpcomingEvents = false; }
    });
  }

  // ── Sidebar ──────────────────────────────────────────────────

  toggleSidebar(): void { this.sidebarState.toggle(); }
  closeSidebar():  void { this.sidebarState.close();  }
  logout(): void {
    const url = this.authService.getLogoutRedirectUrl();
    this.authService.logout();
    this.router.navigateByUrl(url);
  }

  hasPermission(p: string): boolean { return this.authService.hasPermission(p); }

  // ── Logo ─────────────────────────────────────────────────────

  loadLogo(): void {
    if (!this.currentUser?.clubId) return;
    this.http.get(`${environment.apiUrl}/club/logo`, { responseType: 'blob' }).subscribe({
      next: (b) => { this.logoUrl = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(b)); },
      error: () => { this.hasLogo = false; }
    });
  }

  getLogoInitials(): string {
    if (!this.currentUser?.clubNameEn) return 'CM';
    const w = this.currentUser.clubNameEn.split(' ');
    return w.length >= 2 ? (w[0][0] + w[1][0]).toUpperCase() : this.currentUser.clubNameEn.substring(0, 2).toUpperCase();
  }

  loadClubTheme(): void {
    if (!this.currentUser?.clubId) { this.themeService.loadThemeFromStorage(); return; }
    this.themeService.loadAndApplyClubTheme(this.currentUser.clubId).subscribe({
      error: () => this.themeService.applyDefaultTheme()
    });
  }

  // ── Payment history ──────────────────────────────────────────

  loadPendingCount(): void {
    this.loadingPaymentStats = true;
    this.http.get<any[]>(`${this.apiBase}/Invoice/history?status=pending`).subscribe({
      next: (r) => { this.pendingPaymentCount = r.length; this.loadingPaymentStats = false; },
      error: () => { this.loadingPaymentStats = false; }
    });
  }

  openPaymentHistory(): void { this.router.navigate(['/payments/history']); }
  closePaymentHistory(): void { this.showPaymentPanel = false; }

  loadPaymentHistory(): void {
    this.phLoading = true;
    const p: string[] = [];
    if (this.phEventId > 0)        p.push(`eventId=${this.phEventId}`);
    if (this.phStudentName.trim()) p.push(`studentName=${encodeURIComponent(this.phStudentName.trim())}`);
    if (this.phStatus !== 'all')   p.push(`status=${this.phStatus}`);
    const qs = p.length ? '?' + p.join('&') : '';
    this.http.get<any[]>(`${this.apiBase}/Invoice/history${qs}`).subscribe({
      next: (r) => { this.phRows = r; this.phFiltered = r; this.computeSummary(); this.phLoading = false; },
      error: () => { this.phLoading = false; }
    });
  }

  onPhStudentSearch(): void {
    clearTimeout(this.phSearchTimer);
    this.phSearchTimer = setTimeout(() => this.loadPaymentHistory(), 350);
  }

  setPhStatus(s: string): void { this.phStatus = s; this.loadPaymentHistory(); }

  computeSummary(): void {
    this.phSummary = this.phFiltered.reduce((acc, r) => {
      if (['Sent','Partial','Overdue'].includes(r.status)) acc.pending += r.amountDue;
      if (r.status === 'Paid') acc.paid += r.amountPaid;
      acc.total += r.totalAmount;
      return acc;
    }, { pending: 0, paid: 0, total: 0 });
  }

  openQuickPay(row: any): void {
    this.quickPayData = {
      studentId: row.studentId, eventId: row.eventId || 0,
      invoiceId: row.invoiceId || null, invoiceType: row.invoiceType,
      studentName: row.studentName,
      eventName: row.eventName || row.invoiceType + ' charge',
      totalAmount: row.totalAmount, amountPaid: row.amountPaid,
      amountDue: row.amountDue, invoiceNumber: row.invoiceNumber
    };
    this.showPaymentPanel = false;
    this.showQuickPay = true;
  }

  closeQuickPay(): void { this.showQuickPay = false; this.quickPayData = null; }
  openAudit(row: any): void { this.auditRow = row; this.showAuditPanel = true; }
  closeAudit(): void        { this.showAuditPanel = false; this.auditRow = null; }

  onQuickPayRecorded(): void {
    this.closeQuickPay();
    this.toastService.showSuccess('✅ Payment recorded successfully');
    this.loadPaymentHistory();
    this.loadPendingCount();
    this.showPaymentPanel = true;
  }

  // ── Refund ───────────────────────────────────────────────────

  openRefund(row: any): void {
    this.refundData = row; this.refundAmount = row.amountPaid;
    this.refundMethod = 'Cash'; this.refundReason = ''; this.refundReference = '';
    this.refundSuccess = null; this.refundHistory = [];
    this.showPaymentPanel = false; this.showRefundPanel = true;
    this.loadRefundHistory(row.invoiceId);
  }

  closeRefund(): void { this.showRefundPanel = false; this.refundData = null; this.refundSuccess = null; }

  loadRefundHistory(invoiceId: number): void {
    this.loadingRefundHistory = true;
    this.http.get<any[]>(`${this.apiBase}/Invoice/${invoiceId}/refunds`).subscribe({
      next: (r) => { this.refundHistory = r; this.loadingRefundHistory = false; },
      error: () => { this.loadingRefundHistory = false; }
    });
  }

  submitRefund(): void {
    if (!this.refundData || this.refundAmount <= 0 || this.refundAmount > this.refundData.amountPaid + 0.01) return;
    this.isProcessingRefund = true;
    this.http.post<any>(`${this.apiBase}/Invoice/${this.refundData.invoiceId}/refund`, {
      amount: this.refundAmount, refundMethod: this.refundMethod,
      reason: this.refundReason || null, referenceNumber: this.refundReference || null
    }).subscribe({
      next: (res) => {
        this.isProcessingRefund = false;
        if (res.success) { this.refundSuccess = res; this.loadPaymentHistory(); this.loadPendingCount(); }
      },
      error: (err) => {
        this.isProcessingRefund = false;
        this.toastService.showError(err.error?.message || 'Failed to process refund');
      }
    });
  }

  onRefundDone(): void { this.closeRefund(); this.showPaymentPanel = true; }

  getAttendanceEmoji(status: string): string {
    return ({ Present: '✅', Absent: '❌', Late: '🕐', Excused: '📝', not_marked: '⚪' } as any)[status] ?? '📋';
  }

  goToSettings(): void { this.router.navigate(['/club/settings']); }

  // ── Navigation ───────────────────────────────────────────────
  viewStudents():        void { this.router.navigate(['/students']); }
  registerStudent():     void { this.router.navigate(['/students/register']); }
  viewEvents():          void { this.router.navigate(['/events']); }
  createEvent():         void { this.router.navigate(['/events/create']); }
  viewUsers():           void { this.router.navigate(['/users/list']); }
  registerUser():        void { this.router.navigate(['/users/register']); }
  manageSubscriptions(): void { this.router.navigate(['/subscriptions/admin']); }
  browseSubscriptions(): void { this.router.navigate(['/subscriptions/catalog']); }
  viewReports():         void { this.router.navigate(['/reports']); }
  goToUserNotifPreferences(): void { this.router.navigate(['/club/notifications/user-preferences']); }
  goToNotifLog():             void { this.router.navigate(['/club/notifications/log']); }
  goToWallets():              void { this.router.navigate(['/wallets']); }
}
