import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { MasterBillingService, MasterInvoice, BillingDashboardRow } from './master-billing.service';

interface Club { clubId: number; clubNameEn: string; clubCode: string; }

@Component({
  selector: 'app-master-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './master-invoices.component.html',
  styleUrls: ['./master-billing.shared.scss']
})
export class MasterInvoicesComponent implements OnInit {
  clubs:     Club[]               = [];
  invoices:  MasterInvoice[]      = [];
  dashboard: BillingDashboardRow[] = [];
  selected:  MasterInvoice | null = null;

  loading  = false;
  saving   = false;
  error    = '';

  tab: 'dashboard' | 'invoices' = 'dashboard';

  // Filters
  filterClubId = '';
  filterStatus = '';

  // Generate invoice form
  showGenForm = false;
  genForm: any = {
    clubId: '', periodFrom: '', periodTo: '',
    invoiceType: 'periodic', taxPct: 15,
    dueDate: '', notes: '', includeAdhoc: true
  };

  // Payment form
  showPayForm = false;
  payForm: any = { amount: 0, paymentDate: '', paymentMethod: 'bank_transfer', referenceNumber: '', notes: '' };

  statuses = ['draft','sent','paid','partially_paid','overdue','cancelled'];

  constructor(
    private svc: MasterBillingService,
    private http: HttpClient,
    public router: Router
  ) {}

  ngOnInit() {
    this.http.get<Club[]>(`${environment.apiUrl}/master/clubs`).subscribe(r => this.clubs = r);
    this.loadDashboard();
    this.payForm.paymentDate = new Date().toISOString().split('T')[0];
  }

  loadDashboard() {
    this.svc.getDashboard().subscribe(r => this.dashboard = r);
  }

  loadInvoices() {
    this.loading = true;
    this.svc.getInvoices(
      this.filterClubId ? +this.filterClubId : undefined,
      this.filterStatus || undefined
    ).subscribe({
      next: r  => { this.invoices = r; this.loading = false; },
      error: e => { this.error = e.error?.message || 'Failed'; this.loading = false; }
    });
  }

  viewInvoice(id: number) {
    this.svc.getInvoice(id).subscribe(r => this.selected = r);
  }

  generateInvoice() {
    this.saving = true;
    this.svc.generateInvoice(this.genForm).subscribe({
      next: r => {
        this.saving = false; this.showGenForm = false;
        alert(`Invoice ${r.invoiceNumber} generated!`);
        this.loadDashboard();
        if (this.tab === 'invoices') this.loadInvoices();
      },
      error: e => { this.error = e.error?.message || 'Generate failed'; this.saving = false; }
    });
  }

  openPayment(inv: MasterInvoice) {
    this.selected   = inv;
    this.payForm.amount = inv.amountDue;
    this.showPayForm = true;
  }

  recordPayment() {
    if (!this.selected) return;
    this.saving = true;
    this.svc.recordPayment(this.selected.masterInvoiceId, this.payForm).subscribe({
      next: () => {
        this.saving = false; this.showPayForm = false;
        this.loadDashboard();
        if (this.tab === 'invoices') this.loadInvoices();
      },
      error: e => { this.error = e.error?.message || 'Payment failed'; this.saving = false; }
    });
  }

  updateStatus(inv: MasterInvoice, status: string) {
    this.svc.updateStatus(inv.masterInvoiceId, status).subscribe(() => {
      inv.status = status;
      this.loadDashboard();
    });
  }

  totalOutstanding(): number { return this.dashboard.reduce((s, r) => s + r.totalOutstanding, 0); }
  totalPaid():        number { return this.dashboard.reduce((s, r) => s + r.totalPaid, 0); }
  totalMonthly():     number { return this.dashboard.reduce((s, r) => s + r.estMonthlyValue, 0); }

  clubName(id: number | string): string {
    return this.clubs.find(c => c.clubId === +id)?.clubNameEn ?? '';
  }
}
