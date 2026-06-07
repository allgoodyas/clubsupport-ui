import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface Subscriber {
  subscriptionid: number;
  studentid: number;
  studentname: string;
  startdate: string;
  enddate: string;
  billingcycle: string;
  status: string;
  autorenew: boolean;
  totalamount: number;
  amountpaid: number;
  amountdue: number;
}

@Component({
  selector: 'app-plan-subscribers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="subscribers-container">
      <!-- Header -->
      <div class="page-header">
        <button class="btn-back" (click)="goBack()">
          ← Back to Plans
        </button>
        <!-- spacer so title never pushes the button off -->
        <div class="header-content">
          <h1>📋 {{ planName }}</h1>
          <p class="subtitle">Active Subscribers ({{ subscribers.length }})</p>
        </div>
      </div>

      <!-- Loading -->
      <div class="loading" *ngIf="isLoading">
        <div class="spinner"></div>
        <p>Loading subscribers...</p>
      </div>

      <!-- Filter Bar -->
      <div class="filter-bar" *ngIf="!isLoading && subscribers.length > 0">
        <div class="search-wrap">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            class="search-input"
            placeholder="Search by student name..."
            [(ngModel)]="searchTerm"
            (ngModelChange)="applyFilter()" />
          <button class="btn-clear" *ngIf="searchTerm" (click)="clearFilter()">✕</button>
        </div>
        <span class="result-count">
          {{ filteredSubscribers.length }} of {{ subscribers.length }} subscriber{{ subscribers.length !== 1 ? 's' : '' }}
        </span>
      </div>

      <!-- Subscribers List -->
      <div class="subscribers-list" *ngIf="!isLoading && filteredSubscribers.length > 0">
        <div class="subscriber-card" *ngFor="let sub of filteredSubscribers">
          <div class="subscriber-header">
            <div class="student-info">
              <h3>{{ sub.studentname }}</h3>
              <span class="student-id">ID: #{{ sub.studentid }}</span>
            </div>
            <div class="status-badge" [class]="'status-' + sub.status.toLowerCase()">
              {{ sub.status }}
            </div>
          </div>

          <div class="subscriber-details">
            <div class="detail-row">
              <span class="label">Subscription ID:</span>
              <span class="value">#{{ sub.subscriptionid }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Billing Cycle:</span>
              <span class="value">{{ sub.billingcycle | titlecase }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Period:</span>
              <span class="value">{{ sub.startdate | date:'MMM d, yyyy' }} - {{ sub.enddate | date:'MMM d, yyyy' }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Auto-Renewal:</span>
              <span class="value">{{ sub.autorenew ? '✓ Enabled' : '✗ Disabled' }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Payment:</span>
              <span class="value">{{ sub.amountpaid | number:'1.2-2' }} / {{ sub.totalamount | number:'1.2-2' }} SAR</span>
            </div>
            <div class="detail-row" *ngIf="sub.amountdue > 0">
              <span class="label">Amount Due:</span>
              <span class="value error">{{ sub.amountdue | number:'1.2-2' }} SAR</span>
            </div>
          </div>

          <div class="subscriber-actions">
            <button class="btn-view" (click)="viewSubscription(sub.studentid)">
              View Details
            </button>
          </div>
        </div>
      </div>

      <!-- No filter results -->
      <div class="no-results" *ngIf="!isLoading && subscribers.length > 0 && filteredSubscribers.length === 0">
        <div class="empty-icon">🔍</div>
        <h3>No results for "{{ searchTerm }}"</h3>
        <p>Try a different name</p>
        <button class="btn-primary" (click)="clearFilter()">Clear Search</button>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="!isLoading && subscribers.length === 0">
        <div class="empty-icon">👥</div>
        <h3>No Subscribers Yet</h3>
        <p>This plan doesn't have any active subscribers</p>
        <button class="btn btn-primary" (click)="goBack()">
          Back to Plans
        </button>
      </div>
    </div>
  `,
  styles: [`
    /* ── PAGE ─────────────────────────────────────────────────────────────── */
    .subscribers-container {
      min-height: 100vh;
      background: var(--bg-app, #0A0F1E);
      padding-bottom: 40px;
    }

    /* ── SLIM STICKY HEADER ───────────────────────────────────────────────── */
    .page-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 20px;
      background: var(--gradient-primary,
        linear-gradient(135deg, var(--accent-primary, #00D4FF), var(--accent-info, #A855F7)));
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      position: sticky;
      top: 0;
      z-index: 100;
      margin-bottom: 0;
    }

    .btn-back {
      flex-shrink: 0;
      height: 34px;
      padding: 0 14px;
      min-width: 160px;
      border: 2px solid rgba(255,255,255,0.45);
      background: rgba(255,255,255,0.12);
      border-radius: 8px;
      font-size: 0.82rem;
      font-weight: 600;
      color: #ffffff;
      cursor: pointer;
      font-family: inherit;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
      transition: all 0.2s;
    }
    .btn-back:hover {
      background: rgba(255,255,255,0.24);
      border-color: rgba(255,255,255,0.7);
      transform: translateX(-3px);
    }

    .header-content {
      flex: 1;
      min-width: 0;
      overflow: hidden;
    }
    .header-content h1 {
      margin: 0 0 2px;
      font-size: 1.1rem;
      font-weight: 700;
      color: #ffffff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .header-content .subtitle {
      color: rgba(255,255,255,0.78);
      font-size: 0.75rem;
      margin: 0;
    }

    /* ── FILTER BAR ────────────────────────────────────────────────────────── */
    .filter-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: 900px;
      margin: 16px auto 0;
      padding: 0 16px;
    }

    .search-wrap {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--bg-card, #1A2235);
      border: 1.5px solid var(--bg-border, #1E2D45);
      border-radius: 8px;
      padding: 0 12px;
      transition: border-color 0.2s;
    }
    .search-wrap:focus-within {
      border-color: var(--accent-primary, #00D4FF);
      box-shadow: 0 0 0 3px rgba(0,212,255,0.1);
    }

    .search-icon { font-size: 0.9rem; opacity: 0.6; flex-shrink: 0; }

    .search-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      padding: 9px 0;
      font-size: 0.875rem;
      font-family: inherit;
      color: var(--text-primary, #E2E8F0) !important;
    }
    .search-input::placeholder { color: var(--text-disabled, #4A5568) !important; }

    .btn-clear {
      background: transparent;
      border: none;
      color: var(--text-secondary, #94A3B8);
      cursor: pointer;
      font-size: 0.75rem;
      padding: 2px 4px;
      border-radius: 4px;
      transition: color 0.15s;
      flex-shrink: 0;
    }
    .btn-clear:hover { color: var(--accent-danger, #FF4757); }

    .result-count {
      font-size: 0.78rem;
      color: var(--text-secondary, #94A3B8);
      white-space: nowrap;
      flex-shrink: 0;
    }

    /* ── NO RESULTS ───────────────────────────────────────────────────────── */
    .no-results {
      text-align: center;
      padding: 3rem 2rem;
      max-width: 500px;
      margin: 20px auto;
      background: var(--bg-card, #1A2235);
      border-radius: 12px;
      border: 1px solid var(--bg-border, #1E2D45);
    }
    .no-results .empty-icon { font-size: 2.5rem; opacity: 0.4; margin-bottom: 10px; }
    .no-results h3 { font-size: 1rem; font-weight: 700; color: var(--text-primary, #E2E8F0); margin-bottom: 5px; }
    .no-results p  { color: var(--text-secondary, #94A3B8); font-size: 0.85rem; margin-bottom: 16px; }

    /* ── CONTENT AREA ─────────────────────────────────────────────────────── */
    .subscribers-list {
      display: grid;
      gap: 12px;
      max-width: 900px;
      margin: 20px auto;
      padding: 0 16px;
    }

    /* ── LOADING ──────────────────────────────────────────────────────────── */
    .loading {
      text-align: center;
      padding: 4rem 2rem;
    }
    .loading .spinner {
      border: 3px solid var(--bg-border, #1E2D45);
      border-top-color: var(--accent-primary, #00D4FF);
      border-radius: 50%;
      width: 40px; height: 40px;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1rem;
    }
    .loading p { color: var(--text-secondary, #94A3B8); font-size: 0.9rem; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── SUBSCRIBER CARD ──────────────────────────────────────────────────── */
    .subscriber-card {
      /* ✅ Scope reset: light vars inside white card */
      --text-primary:   #111827;
      --text-secondary: #6b7280;
      --bg-border:      #e5e7eb;

      background: #ffffff;
      border-radius: 10px;
      padding: 16px 18px;
      border: 1px solid #e5e7eb;
      box-shadow: 0 3px 12px rgba(0,0,0,0.18);
      transition: box-shadow 0.2s, transform 0.2s;
      color: #111827;
    }
    .subscriber-card:hover {
      box-shadow: 0 6px 18px rgba(0,212,255,0.15);
      transform: translateY(-2px);
      border-color: var(--accent-primary, #00D4FF);
    }

    .subscriber-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid #f3f4f6;
    }
    .student-info h3 {
      font-size: 1rem;
      font-weight: 700;
      color: #111827;
      margin: 0 0 3px;
    }
    .student-id {
      font-size: 0.78rem;
      color: #6b7280;
    }

    /* ── STATUS BADGES ────────────────────────────────────────────────────── */
    .status-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      flex-shrink: 0;
    }
    .status-active         { background: rgba(0,255,157,0.12);  color: #065f46; border: 1px solid rgba(0,255,157,0.3); }
    .status-pending_payment { background: rgba(255,140,66,0.12); color: #92400e; border: 1px solid rgba(255,140,66,0.3); }
    .status-expired        { background: rgba(255,71,87,0.10);  color: #991b1b; border: 1px solid rgba(255,71,87,0.25); }

    /* ── DETAIL ROWS ──────────────────────────────────────────────────────── */
    .subscriber-details {
      display: grid;
      gap: 7px;
      margin-bottom: 14px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
    }
    .detail-row .label { color: #6b7280; font-weight: 500; }
    .detail-row .value { color: #111827; font-weight: 600; }
    .detail-row .value.error { color: var(--accent-danger, #FF4757); }

    /* ── ACTIONS ──────────────────────────────────────────────────────────── */
    .subscriber-actions { display: flex; gap: 8px; }

    .btn-view {
      padding: 7px 16px;
      background: var(--gradient-primary,
        linear-gradient(135deg, var(--accent-primary, #00D4FF), var(--accent-info, #A855F7)));
      color: white;
      border: none;
      border-radius: 7px;
      font-weight: 600;
      font-size: 0.83rem;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.2s;
    }
    .btn-view:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 10px rgba(0,212,255,0.35);
    }

    /* ── EMPTY STATE ──────────────────────────────────────────────────────── */
    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      max-width: 500px;
      margin: 40px auto;
      background: var(--bg-card, #1A2235);
      border-radius: 12px;
      border: 1px solid var(--bg-border, #1E2D45);
    }
    .empty-icon { font-size: 3rem; opacity: 0.4; margin-bottom: 12px; }
    .empty-state h3 { font-size: 1.1rem; font-weight: 700; color: var(--text-primary, #E2E8F0); margin-bottom: 6px; }
    .empty-state p  { color: var(--text-secondary, #94A3B8); font-size: 0.875rem; margin-bottom: 20px; }

    .btn-primary {
      padding: 9px 22px;
      background: var(--gradient-primary,
        linear-gradient(135deg, var(--accent-primary, #00D4FF), var(--accent-info, #A855F7)));
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.2s;
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 14px rgba(0,212,255,0.4);
    }
  `]
})
export class PlanSubscribersComponent implements OnInit {
  planId: number = 0;
  planName: string = 'Subscription Plan';
  subscribers: Subscriber[] = [];
  filteredSubscribers: Subscriber[] = [];
  searchTerm = '';
  isLoading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      if (params['planId']) {
        this.planId = +params['planId'];
        this.loadSubscribers();
      }
    });
  }

  loadSubscribers() {
    this.isLoading = true;
    
    // Get plan details first
    this.http.get<any>(`${environment.apiUrl}/SubscriptionPlan/${this.planId}`).subscribe({
      next: (plan) => {
        this.planName = plan.planNameEn || 'Subscription Plan';
        
        // Now get subscribers - this endpoint doesn't exist yet, so we'll create a workaround
        // For now, show a message that this feature is coming
        this.loadSubscribersList();
      },
      error: (error) => {
        console.error('Error loading plan:', error);
        this.isLoading = false;
      }
    });
  }

  loadSubscribersList() {
    this.http.get<any[]>(`${environment.apiUrl}/StudentSubscription/plan/${this.planId}/subscribers`).subscribe({
      next: (subscribers) => {
        this.subscribers = subscribers;
        this.filteredSubscribers = [...subscribers];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading subscribers:', error);
        this.subscribers = [];
        this.filteredSubscribers = [];
        this.isLoading = false;
      }
    });
  }

  applyFilter() {
    const term = this.searchTerm.trim().toLowerCase();
    this.filteredSubscribers = term
      ? this.subscribers.filter(s =>
          s.studentname?.toLowerCase().includes(term))
      : [...this.subscribers];
  }

  clearFilter() {
    this.searchTerm = '';
    this.filteredSubscribers = [...this.subscribers];
  }

  viewSubscription(studentId: number) {
    this.router.navigate(['/students', studentId]);
  }

  goBack() {
    this.router.navigate(['/subscriptions/admin']);
  }
}
