import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ParentService, ParentInvoice, ChildSummary } from '../../core/services/parent.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-pending-invoices',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './pending-invoices.component.html',
  styleUrls: ['./pending-invoices.component.scss']
})
export class PendingInvoicesComponent implements OnInit {
  invoices: ParentInvoice[] = [];
  children: ChildSummary[] = [];
  selectedChildId: number | null = null;
  selectedInvoiceIds: Set<number> = new Set();
  isLoading = false;
  error: string | null = null;

  // Summary
  totalInvoices = 0;
  totalPendingAmount = 0;
  overdueCount = 0;

  constructor(
    private parentService: ParentService,
    private router: Router,
    private route: ActivatedRoute,
    private toastService: ToastService,
    private authService: AuthService,
    private themeService: ThemeService
  ) {}

  ngOnInit() {
    // Apply club theme
    const user = this.authService.currentUserValue;
    if (user?.clubId) {
      this.themeService.loadAndApplyClubTheme(user.clubId).subscribe({
        error: () => this.themeService.loadThemeFromStorage()
      });
    } else {
      this.themeService.loadThemeFromStorage();
    }

    // Check for childId query param
    this.route.queryParams.subscribe(params => {
      if (params['childId']) {
        this.selectedChildId = +params['childId'];
      }
    });

    this.loadChildren();
    this.loadInvoices();
  }

  loadChildren() {
    this.parentService.getMyChildren().subscribe({
      next: (response) => {
        if (response.success) {
          this.children = response.children;
        }
      },
      error: (err) => {
        console.error('Error loading children:', err);
      }
    });
  }

  loadInvoices() {
    this.isLoading = true;
    this.error = null;
    this.selectedInvoiceIds.clear();

    if (this.selectedChildId) {
      // Load invoices for specific child
      this.parentService.getPendingInvoicesByChild(this.selectedChildId).subscribe({
        next: (response) => {
          this.handleInvoicesResponse(response);
        },
        error: (err) => {
          this.handleError(err);
        }
      });
    } else {
      // Load all pending invoices
      this.parentService.getAllPendingInvoices().subscribe({
        next: (response) => {
          this.handleInvoicesResponse(response);
        },
        error: (err) => {
          this.handleError(err);
        }
      });
    }
  }

  handleInvoicesResponse(response: any) {
    if (response.success) {
      this.invoices = response.invoices;
      this.totalInvoices = response.summary.totalInvoices;
      this.totalPendingAmount = response.summary.totalPendingAmount;
      this.overdueCount = response.summary.overdueCount || 0;
    }
    this.isLoading = false;
  }

  handleError(err: any) {
    console.error('Error loading invoices:', err);
    this.error = 'Error loading invoices. Please try again.';
    this.isLoading = false;
    this.toastService.showError('❌ Error loading invoices');
  }

  onChildFilterChange() {
    this.loadInvoices();
  }

  toggleInvoiceSelection(invoiceId: number) {
    if (this.selectedInvoiceIds.has(invoiceId)) {
      this.selectedInvoiceIds.delete(invoiceId);
    } else {
      this.selectedInvoiceIds.add(invoiceId);
    }
  }

  isInvoiceSelected(invoiceId: number): boolean {
    return this.selectedInvoiceIds.has(invoiceId);
  }

  selectAll() {
    this.invoices.forEach(inv => this.selectedInvoiceIds.add(inv.invoiceId));
  }

  clearSelection() {
    this.selectedInvoiceIds.clear();
  }

  getSelectedTotal(): number {
    return this.invoices
      .filter(inv => this.selectedInvoiceIds.has(inv.invoiceId))
      .reduce((sum, inv) => sum + inv.amountDue, 0);
  }

  getSelectedCount(): number {
    return this.selectedInvoiceIds.size;
  }

  proceedToPayment() {
    if (this.selectedInvoiceIds.size === 0) {
      this.toastService.showWarning('⚠️ Please select at least one invoice');
      return;
    }

    const selectedIds = Array.from(this.selectedInvoiceIds);
    this.router.navigate(['/parent/payments/checkout'], {
      queryParams: { invoiceIds: selectedIds.join(',') }
    });
  }

  formatCurrency(amount: number): string {
    return `${amount.toFixed(2)} SAR`;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getDaysUntilDue(invoice: ParentInvoice): string {
    if (invoice.isOverdue) {
      const days = Math.abs(invoice.daysUntilDue);
      return `${days} day${days !== 1 ? 's' : ''} overdue`;
    } else if (invoice.daysUntilDue === 0) {
      return 'Due today';
    } else {
      return `Due in ${invoice.daysUntilDue} day${invoice.daysUntilDue !== 1 ? 's' : ''}`;
    }
  }

  getStatusClass(invoice: ParentInvoice): string {
    if (invoice.isOverdue) return 'status-overdue';
    if (invoice.daysUntilDue <= 3) return 'status-warning';
    return 'status-normal';
  }
}
