import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { SidebarNavigationComponent } from '../../shared/components/sidebar-navigation/sidebar-navigation.component';
import { PaymentPanelComponent } from '../../shared/components/payment-panel/payment-panel.component';
import { ToastService } from '../../shared/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { SidebarStateService } from '../../core/services/sidebar-state.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-payment-history',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarNavigationComponent, PaymentPanelComponent, PageHeaderComponent],
  templateUrl: './payment-history.component.html',
  styleUrls: ['./payment-history.component.scss']
})
export class PaymentHistoryComponent implements OnInit, OnDestroy {

  private readonly api = environment.apiUrl;

  isSidebarOpen = false;

  // Data
  rows:     any[] = [];
  filtered: any[] = [];
  events:   any[] = [];
  loading   = false;

  // Filters
  eventId     = 0;
  studentName = '';
  status      = 'pending';   // default to pending on load

  // Pagination
  pageSize    = 10;
  currentPage = 1;
  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered.length / this.pageSize)); }
  get pagedRows(): any[]   { return this.filtered.slice((this.currentPage - 1) * this.pageSize, this.currentPage * this.pageSize); }
  get pageEnd():   number  { return Math.min(this.currentPage * this.pageSize, this.filtered.length); }
  get pageNums():  number[] { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }
  goToPage(p: number): void { if (p >= 1 && p <= this.totalPages) this.currentPage = p; }
  summary     = { pending: 0, paid: 0, total: 0 };
  private searchTimer: any;

  // Quick pay panel
  showQuickPay  = false;
  quickPayData: any = null;

  // Refund panel
  showRefundPanel = false;
  refundData: any = null;
  refundAmount    = 0;
  refundMethod    = 'Cash';
  refundReason    = '';
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

  constructor(
    private http:      HttpClient,
    private router:    Router,
    private toastSvc:  ToastService,
    private authSvc:   AuthService,
    private themeSvc:  ThemeService,
    private sidebarState: SidebarStateService
  ) {}

  ngOnInit(): void {
    // Apply club dynamic theme — same as all other pages
    const user = this.authSvc.currentUserValue;
    if (user?.clubId) {
      this.themeSvc.loadAndApplyClubTheme(user.clubId)
        .subscribe({ error: () => this.themeSvc.loadThemeFromStorage() });
    } else {
      this.themeSvc.loadThemeFromStorage();
    }

    this.http.get<any[]>(`${this.api}/Invoice/history/events`).subscribe({
      next: (e) => this.events = e, error: () => {}
    });
    this.load();
  }

  ngOnDestroy(): void {
    clearTimeout(this.searchTimer);
  }

  // ── Data ─────────────────────────────────────────────────────

  load(): void {
    this.loading = true;
    const p: string[] = [];
    if (this.eventId > 0)          p.push(`eventId=${this.eventId}`);
    if (this.studentName.trim())   p.push(`studentName=${encodeURIComponent(this.studentName.trim())}`);
    if (this.status !== 'all')     p.push(`status=${this.status}`);
    const qs = p.length ? '?' + p.join('&') : '';
    this.http.get<any[]>(`${this.api}/Invoice/history${qs}`).subscribe({
      next: (r) => { this.rows = r; this.filtered = r; this.computeSummary(); this.currentPage = 1; this.loading = false; },
      error: ()  => { this.loading = false; }
    });
  }

  onStudentSearch(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.load(), 350);
  }

  setStatus(s: string): void { this.status = s; this.load(); }

  computeSummary(): void {
    this.summary = this.filtered.reduce((acc, r) => {
      if (['Sent','Partial','Overdue'].includes(r.status)) acc.pending += r.amountDue;
      if (r.status === 'Paid') acc.paid += r.amountPaid;
      acc.total += r.totalAmount;
      return acc;
    }, { pending: 0, paid: 0, total: 0 });
  }

  // ── Quick pay ─────────────────────────────────────────────────

  openQuickPay(row: any): void {
    this.quickPayData = {
      studentId:    row.studentId,
      eventId:      row.eventId || 0,
      invoiceId:    row.invoiceId || null,
      invoiceType:  row.invoiceType,
      studentName:  row.studentName,
      eventName:    row.eventName || row.invoiceType + ' charge',
      totalAmount:  row.totalAmount,
      amountPaid:   row.amountPaid,
      amountDue:    row.amountDue,
      invoiceNumber:row.invoiceNumber
    };
    this.showQuickPay = true;
  }

  closeQuickPay(): void { this.showQuickPay = false; this.quickPayData = null; }

  onPaymentRecorded(): void {
    this.closeQuickPay();
    this.toastSvc.showSuccess('✅ Payment recorded successfully');
    this.load();
  }

  // ── Refund ────────────────────────────────────────────────────

  openRefund(row: any): void {
    this.refundData = row; this.refundAmount = row.amountPaid;
    this.refundMethod = 'Cash'; this.refundReason = '';
    this.refundReference = ''; this.refundSuccess = null; this.refundHistory = [];
    this.showRefundPanel = true;
    this.loadRefundHistory(row.invoiceId);
  }

  closeRefund(): void { this.showRefundPanel = false; this.refundData = null; this.refundSuccess = null; }

  loadRefundHistory(invoiceId: number): void {
    this.loadingRefundHistory = true;
    this.http.get<any[]>(`${this.api}/Invoice/${invoiceId}/refunds`).subscribe({
      next: (r) => { this.refundHistory = r; this.loadingRefundHistory = false; },
      error: () => { this.loadingRefundHistory = false; }
    });
  }

  submitRefund(): void {
    if (!this.refundData || this.refundAmount <= 0 || this.refundAmount > this.refundData.amountPaid + 0.01) return;
    this.isProcessingRefund = true;
    this.http.post<any>(`${this.api}/Invoice/${this.refundData.invoiceId}/refund`, {
      amount: this.refundAmount, refundMethod: this.refundMethod,
      reason: this.refundReason || null, referenceNumber: this.refundReference || null
    }).subscribe({
      next: (res) => {
        this.isProcessingRefund = false;
        if (res.success) { this.refundSuccess = res; this.load(); }
      },
      error: (err) => {
        this.isProcessingRefund = false;
        this.toastSvc.showError(err.error?.message || 'Failed to process refund');
      }
    });
  }

  onRefundDone(): void { this.closeRefund(); }

  // ── Navigation ────────────────────────────────────────────────

  goBack(): void { this.router.navigate(['/dashboard']); }
  toggleSidebar(): void { this.sidebarState.toggle(); }
}
