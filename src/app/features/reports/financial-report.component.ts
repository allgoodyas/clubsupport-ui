import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { SidebarNavigationComponent } from '../../shared/components/sidebar-navigation/sidebar-navigation.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';
import { SidebarStateService } from '../../core/services/sidebar-state.service';
import type * as ExcelJS from 'exceljs';

// ── Interfaces ───────────────────────────────────────────────────────────────

interface FinancialReport {
  totalEventIncome:   number;
  totalAdhocIncome:   number;
  totalIncome:        number;
  totalExpenses:      number;
  netBalance:         number;
  totalOutstanding:   number;
  incomeTransactions: number;
  expenseCount:       number;
  periodRows:         PeriodRow[];
  incomeDetails:      IncomeRow[];
  expenseDetails:     ExpenseRow[];
  outstanding:        OutstandingRow[];
}

interface PeriodRow {
  periodKey:   string;
  periodLabel: string;
  eventIncome: number;
  adhocIncome: number;
  totalIncome: number;
  expenses:    number;
  net:         number;
  outstanding: number;
}

interface IncomeRow {
  date:          string;
  type:          string;
  description:   string;
  studentName:   string;
  paymentMethod: string;
  collectedBy:   string;
  amountPaid:    number;
  amountDue:     number;
  status:        string;
  invoiceRef:    string;
}

interface ExpenseRow {
  date:          string;
  category:      string;
  description:   string;
  amount:        number;
  paymentMethod: string;
  team:          string;
  addedBy:       string;
}

interface OutstandingRow {
  invoiceRef:  string;
  studentName: string;
  description: string;
  type:        string;
  dueDate:     string;
  amountDue:   number;
  amountPaid:  number;
  status:      string;
}

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-financial-report',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, SidebarNavigationComponent, PageHeaderComponent],
  template: `
<div class="fr-container page-with-sidebar">

  <!-- Sidebar -->
  <div class="page-header-row">
    <app-page-header
      pageIcon="ti-chart-line"
      pageTitle="Financial Report"
      pageSubtitle="Income · Expenses · Net Balance"
      backRoute="/reports"
      backLabel="Back to Report Summary">
    </app-page-header>
  </div>
  <div class="page-body-row">
    <app-sidebar-navigation></app-sidebar-navigation>
    <div class="page-content">

  <!-- ── Body ── -->
  <div class="fr-page">

  <!-- ── Filters ── -->
  <div class="fr-filters">
    <!-- All in one row -->
    <button class="fr-preset" [class.active]="activePreset === 'today'"      (click)="setPreset('today')">Today</button>
    <button class="fr-preset" [class.active]="activePreset === 'thisMonth'"   (click)="setPreset('thisMonth')">This Month</button>
    <button class="fr-preset" [class.active]="activePreset === 'lastMonth'"   (click)="setPreset('lastMonth')">Last Month</button>
    <button class="fr-preset" [class.active]="activePreset === 'thisYear'"    (click)="setPreset('thisYear')">This Year</button>
    <button class="fr-preset" [class.active]="activePreset === 'lastYear'"    (click)="setPreset('lastYear')">Last Year</button>
    <button class="fr-preset" [class.active]="activePreset === 'custom'"      (click)="activePreset = 'custom'">Custom</button>

    <div class="fr-divider"></div>

    <div class="fr-inline-field">
      <label>From</label>
      <input type="date" [(ngModel)]="fromDate" (change)="activePreset='custom'" />
    </div>
    <div class="fr-inline-field">
      <label>To</label>
      <input type="date" [(ngModel)]="toDate" (change)="activePreset='custom'" />
    </div>
    <div class="fr-inline-field">
      <label>Group</label>
      <select [(ngModel)]="groupBy">
        <option value="month">Month</option>
        <option value="year">Year</option>
      </select>
    </div>

    <button class="fr-apply-btn" (click)="load()" [disabled]="loading">
      {{ loading ? '...' : 'Apply' }}
    </button>

    <!-- Print & Export — far right -->
    <button class="fr-icon-btn fr-icon-btn--print" (click)="printReport()" [disabled]="!report" title="Print report"
            style="margin-left:auto">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M7 17H5a2 2 0 01-2-2V9a2 2 0 012-2h14a2 2 0 012 2v6a2 2 0 01-2 2h-2"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="7" y="13" width="10" height="8" rx="1" stroke="currentColor" stroke-width="2"/>
        <path d="M7 7V3h10v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="18" cy="11" r="1" fill="currentColor"/>
      </svg>
    </button>
    <button class="fr-icon-btn fr-icon-btn--excel" (click)="exportExcel()" [disabled]="exporting || !report"
            [title]="exporting ? 'Generating...' : 'Export to Excel'">
      <svg *ngIf="!exporting" width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 4v11m0 0l-4-4m4 4l4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <svg *ngIf="exporting" width="16" height="16" viewBox="0 0 24 24" fill="none" style="animation:spin 0.8s linear infinite">
        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5"
                stroke-dasharray="28" stroke-dashoffset="10" stroke-linecap="round"/>
      </svg>
    </button>
  </div>

  <!-- ── Loading ── -->
  <div class="fr-loading" *ngIf="loading">
    <div class="fr-spinner"></div>
    <span>Loading financial data...</span>
  </div>

  <!-- ── Error ── -->
  <div class="fr-error" *ngIf="error && !loading">
    ⚠️ {{ error }}
    <button (click)="load()">Retry</button>
  </div>

  <ng-container *ngIf="report && !loading">

    <!-- ── KPI Summary ── -->
    <div class="fr-kpi-grid">
      <div class="fr-kpi income">
        <div class="fr-kpi-label">Total Income</div>
        <div class="fr-kpi-value">{{ report.totalIncome | number:'1.2-2' }} SAR</div>
        <div class="fr-kpi-sub">
          <span class="fr-tag teal">Events {{ report.totalEventIncome | number:'1.2-2' }}</span>
          <span class="fr-tag teal-light">Adhoc {{ report.totalAdhocIncome | number:'1.2-2' }}</span>
        </div>
        <div class="fr-kpi-count">{{ report.incomeTransactions }} transactions</div>
      </div>

      <div class="fr-kpi expense">
        <div class="fr-kpi-label">Total Expenses</div>
        <div class="fr-kpi-value">{{ report.totalExpenses | number:'1.2-2' }} SAR</div>
        <div class="fr-kpi-sub">
          <span class="fr-tag coral">{{ report.expenseCount }} records</span>
        </div>
      </div>

      <div class="fr-kpi" [class.net-pos]="report.netBalance >= 0" [class.net-neg]="report.netBalance < 0">
        <div class="fr-kpi-label">Net Balance</div>
        <div class="fr-kpi-value">{{ report.netBalance | number:'1.2-2' }} SAR</div>
        <div class="fr-kpi-sub">
          <span class="fr-tag" [class.purple]="report.netBalance >= 0" [class.coral]="report.netBalance < 0">
            Income − Expenses
          </span>
        </div>
      </div>

      <div class="fr-kpi outstanding">
        <div class="fr-kpi-label">Outstanding</div>
        <div class="fr-kpi-value">{{ report.totalOutstanding | number:'1.2-2' }} SAR</div>
        <div class="fr-kpi-sub">
          <span class="fr-tag amber">{{ report.outstanding.length }} unpaid invoices</span>
        </div>
      </div>
    </div>

    <!-- ── Period Breakdown Table ── -->
    <div class="fr-section">
      <div class="fr-section-title">
        <span class="fr-section-dot purple"></span>
        Period Breakdown
        <span class="fr-group-badge">by {{ groupBy }}</span>
      </div>

      <div class="fr-table-wrap">
        <table class="fr-table">
          <thead>
            <tr>
              <th>Period</th>
              <th class="num">Event Income</th>
              <th class="num">Adhoc Income</th>
              <th class="num">Total Income</th>
              <th class="num">Expenses</th>
              <th class="num">Net</th>
              <th class="num">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of report.periodRows">
              <td class="period-label">{{ r.periodLabel }}</td>
              <td class="num income-val">{{ r.eventIncome | number:'1.2-2' }}</td>
              <td class="num income-val">{{ r.adhocIncome | number:'1.2-2' }}</td>
              <td class="num total-val">{{ r.totalIncome | number:'1.2-2' }}</td>
              <td class="num expense-val">{{ r.expenses | number:'1.2-2' }}</td>
              <td class="num" [class.net-pos-cell]="r.net >= 0" [class.net-neg-cell]="r.net < 0">
                {{ r.net | number:'1.2-2' }}
              </td>
              <td class="num outstanding-val">{{ r.outstanding | number:'1.2-2' }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="totals-row">
              <td>Total</td>
              <td class="num">{{ report.totalEventIncome | number:'1.2-2' }}</td>
              <td class="num">{{ report.totalAdhocIncome | number:'1.2-2' }}</td>
              <td class="num">{{ report.totalIncome | number:'1.2-2' }}</td>
              <td class="num">{{ report.totalExpenses | number:'1.2-2' }}</td>
              <td class="num" [class.net-pos-cell]="report.netBalance >= 0" [class.net-neg-cell]="report.netBalance < 0">
                {{ report.netBalance | number:'1.2-2' }}
              </td>
              <td class="num">{{ report.totalOutstanding | number:'1.2-2' }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- ── Income Details ── -->
    <div class="fr-section" *ngIf="report.incomeDetails.length > 0">
      <div class="fr-section-title">
        <span class="fr-section-dot teal"></span>
        Income Detail
        <span class="fr-count-badge">{{ report.incomeDetails.length }} records</span>
        <button class="fr-toggle-btn" (click)="showIncomeDetail = !showIncomeDetail">
          {{ showIncomeDetail ? 'Hide' : 'Show' }}
        </button>
      </div>

      <div class="fr-table-wrap" *ngIf="showIncomeDetail">
        <table class="fr-table">
          <thead>
            <tr>
              <th>Ref</th>
              <th>Date</th>
              <th>Type</th>
              <th>Description</th>
              <th>Student</th>
              <th>Method</th>
              <th>Collected by</th>
              <th class="num">Paid</th>
              <th class="num">Due</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of report.incomeDetails">
              <td class="ref-cell">{{ r.invoiceRef }}</td>
              <td class="date-cell">{{ r.date }}</td>
              <td><span class="fr-type-badge" [class.event]="r.type==='Event'" [class.adhoc]="r.type==='Adhoc'">{{ r.type }}</span></td>
              <td class="desc-cell" [title]="r.description">{{ r.description }}</td>
              <td>{{ r.studentName }}</td>
              <td>{{ r.paymentMethod }}</td>
              <td>{{ r.collectedBy || '—' }}</td>
              <td class="num income-val">{{ r.amountPaid | number:'1.2-2' }}</td>
              <td class="num outstanding-val">{{ r.amountDue | number:'1.2-2' }}</td>
              <td><span class="fr-status" [class]="'status-' + r.status.toLowerCase()">{{ r.status }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── Expense Details ── -->
    <div class="fr-section" *ngIf="report.expenseDetails.length > 0">
      <div class="fr-section-title">
        <span class="fr-section-dot coral"></span>
        Expense Detail
        <span class="fr-count-badge">{{ report.expenseDetails.length }} records</span>
        <button class="fr-toggle-btn" (click)="showExpenseDetail = !showExpenseDetail">
          {{ showExpenseDetail ? 'Hide' : 'Show' }}
        </button>
      </div>

      <div class="fr-table-wrap" *ngIf="showExpenseDetail">
        <table class="fr-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th>Team</th>
              <th>Method</th>
              <th>Added by</th>
              <th class="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of report.expenseDetails">
              <td class="date-cell">{{ r.date }}</td>
              <td>{{ r.category }}</td>
              <td class="desc-cell" [title]="r.description">{{ r.description }}</td>
              <td>{{ r.team || '—' }}</td>
              <td>{{ r.paymentMethod }}</td>
              <td>{{ r.addedBy || '—' }}</td>
              <td class="num expense-val">{{ r.amount | number:'1.2-2' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── Outstanding ── -->
    <div class="fr-section" *ngIf="report.outstanding.length > 0">
      <div class="fr-section-title">
        <span class="fr-section-dot amber"></span>
        Outstanding Invoices
        <span class="fr-count-badge amber-badge">{{ report.outstanding.length }}</span>
        <button class="fr-toggle-btn" (click)="showOutstanding = !showOutstanding">
          {{ showOutstanding ? 'Hide' : 'Show' }}
        </button>
      </div>

      <div class="fr-table-wrap" *ngIf="showOutstanding">
        <table class="fr-table">
          <thead>
            <tr>
              <th>Ref</th>
              <th>Student</th>
              <th>Description</th>
              <th>Type</th>
              <th>Due Date</th>
              <th class="num">Amount Due</th>
              <th class="num">Paid</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of report.outstanding">
              <td class="ref-cell">{{ r.invoiceRef }}</td>
              <td>{{ r.studentName }}</td>
              <td class="desc-cell" [title]="r.description">{{ r.description }}</td>
              <td><span class="fr-type-badge" [class.event]="r.type==='Event'" [class.adhoc]="r.type==='Adhoc'">{{ r.type }}</span></td>
              <td class="date-cell">{{ r.dueDate || '—' }}</td>
              <td class="num outstanding-val">{{ r.amountDue | number:'1.2-2' }}</td>
              <td class="num income-val">{{ r.amountPaid | number:'1.2-2' }}</td>
              <td><span class="fr-status" [class]="'status-' + r.status.toLowerCase()">{{ r.status }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </ng-container>
</div><!-- fr-page -->
  </div><!-- /.page-content -->
</div><!-- fr-container -->
  `,
  styles: [`
    :host { display: block; background: var(--bg-app, #0A0F1E); min-height: 100vh; }

    /* Container */
    .fr-container { background: var(--bg-app, #0A0F1E); min-height: 100vh; }

    /* Page header — gradient, same as all other pages */
    .fr-page-header {
      background: var(--gradient-primary, linear-gradient(135deg, #00D4FF, #A855F7));
      border-bottom: none;
      padding: 10px 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      position: sticky; top: 0; z-index: 50;
    }
    .fr-header-left { display: flex; align-items: center; gap: 8px; }
    .fr-hamburger {
      width: 34px; height: 34px;
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 7px;
      color: #ffffff; font-size: 1rem;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: border-color 0.2s, background 0.2s; flex-shrink: 0;
      &:hover { border-color: rgba(255,255,255,0.6); background: rgba(255,255,255,0.25); }
    }
    .fr-back-btn {
      height: 32px; padding: 0 12px;
      background: rgba(255,255,255,0.15);
      border: 1px solid rgba(255,255,255,0.3);
      border-radius: 7px;
      color: #ffffff; font-size: 0.78rem; font-weight: 600;
      cursor: pointer; transition: all 0.2s; flex-shrink: 0;
      display: flex; align-items: center; gap: 4px;
      &:hover { background: rgba(255,255,255,0.25); border-color: rgba(255,255,255,0.5); }
    }
    .fr-title-block { display: flex; flex-direction: column; gap: 1px; }
    .fr-title    { font-size: 1.1rem; font-weight: 700; color: #ffffff; margin: 0; white-space: nowrap; }
    .fr-subtitle { font-size: 0.72rem; color: rgba(255,255,255,0.75); margin: 0; }

    /* Export button */
    .fr-action-group {
      display: flex; gap: 8px; align-items: center; flex-shrink: 0;
    }

    /* Icon-only buttons — same design language as ID card */
    .fr-icon-btn {
      width: 36px; height: 36px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.05);
      color: #94A3B8;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.15s, border-color 0.15s, color 0.15s;
      flex-shrink: 0;

      &:hover:not(:disabled) {
        background: rgba(255,255,255,0.12);
        border-color: rgba(255,255,255,0.25);
        color: #E2E8F0;
      }
      &:disabled { opacity: 0.3; cursor: not-allowed; }

      /* Print — cyan accent matching the app */
      &--print {
        color: #00D4FF;
        border-color: rgba(0,212,255,0.25);
        background: rgba(0,212,255,0.07);
        &:hover:not(:disabled) {
          background: rgba(0,212,255,0.18);
          border-color: #00D4FF;
        }
      }

      /* Excel — green accent */
      &--excel {
        color: #1D9E75;
        border-color: rgba(29,158,117,0.25);
        background: rgba(29,158,117,0.07);
        &:hover:not(:disabled) {
          background: rgba(29,158,117,0.18);
          border-color: #1D9E75;
        }
      }
    }

    /* Sub-bar — sits just below the header, contains back icon */
    .fr-sub-bar {
      padding: 6px 1.25rem;
      background: var(--bg-card, #1A2235);
      border-bottom: 1px solid var(--bg-border, #1E2D45);
      display: flex;
      align-items: center;
    }
    .fr-back-icon-btn {
      width: 34px; height: 34px;
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 7px;
      color: #ffffff;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
      position: relative;
      flex-shrink: 0;

      &:hover {
        background: rgba(255, 255, 255, 0.25);
        border-color: rgba(255, 255, 255, 0.6);
      }

      /* Tooltip — appears below the button */
      &::after {
        content: attr(title);
        position: absolute;
        top: calc(100% + 6px);
        right: 0;
        background: var(--bg-panel, #111827);
        color: var(--text-primary, #E2E8F0);
        border: 1px solid var(--bg-border, #1E2D45);
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 0.72rem;
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.15s;
        z-index: 100;
      }
      &:hover::after { opacity: 1; }
    }

    /* Body */
    .fr-page { padding: 1.25rem 1rem 3rem; max-width: 1400px; margin: 0 auto; }

    /* Filters */
    .fr-filters {
      background: var(--bg-card, #1A2235);
      border: 1px solid var(--bg-border, #1E2D45);
      border-radius: 10px; padding: 8px 14px;
      margin-bottom: 1.25rem;
      display: flex; align-items: center; gap: 6px;
      flex-wrap: nowrap; overflow: hidden;
    }
    .fr-preset {
      padding: 0 10px; height: 28px; flex-shrink: 0;
      border: 1px solid var(--bg-border, #1E2D45);
      border-radius: 99px; background: var(--bg-panel, #111827);
      color: var(--text-secondary, #94A3B8); font-size: 0.73rem; font-weight: 600;
      cursor: pointer; white-space: nowrap; transition: all 0.2s;
      &.active { background: var(--accent-primary, #00D4FF); border-color: var(--accent-primary, #00D4FF); color: var(--bg-app, #0A0F1E); font-weight: 700; }
      &:hover:not(.active) { border-color: var(--accent-primary, #00D4FF); color: var(--text-primary, #E2E8F0); }
    }
    .fr-divider {
      width: 1px; height: 22px; background: var(--bg-border, #1E2D45);
      flex-shrink: 0; margin: 0 4px;
    }
    .fr-inline-field {
      display: flex; align-items: center; gap: 5px; flex-shrink: 0;
      label { font-size: 0.68rem; font-weight: 700; color: var(--text-secondary, #94A3B8); text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }
      input, select {
        height: 28px; padding: 0 7px; font-size: 0.75rem;
        border: 1px solid var(--bg-border, #1E2D45); border-radius: 6px;
        background: var(--bg-panel, #111827);
        color: var(--text-primary, #E2E8F0) !important;
        outline: none; cursor: pointer;
        &:focus { border-color: var(--accent-primary, #00D4FF); }
        option { background: var(--bg-card, #1A2235); color: var(--text-primary, #E2E8F0); }
      }
      input[type="date"] {
        width: 126px;
        &::-webkit-calendar-picker-indicator { filter: invert(0.6); cursor: pointer; }
      }
      select { width: 90px; }
    }
    .fr-apply-btn {
      height: 28px; padding: 0 14px; border: none; border-radius: 6px; flex-shrink: 0;
      background: var(--accent-primary, #00D4FF); color: var(--bg-app, #0A0F1E);
      font-size: 0.78rem; font-weight: 800; cursor: pointer;
      &:hover:not(:disabled) { opacity: 0.88; }
      &:disabled { opacity: 0.5; }
    }

    /* Loading / error */
    .fr-loading { display: flex; align-items: center; gap: 12px; padding: 60px; justify-content: center; color: var(--text-secondary, #94A3B8); font-size: 0.9rem; }
    .fr-spinner { width: 26px; height: 26px; border: 3px solid var(--bg-border, #1E2D45); border-top-color: var(--accent-primary, #00D4FF); border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .fr-error {
      background: rgba(255,71,87,0.1); border: 1px solid rgba(255,71,87,0.3);
      border-radius: 8px; padding: 12px 16px; color: #FF6B7A;
      display: flex; align-items: center; gap: 12px; margin-bottom: 1.25rem; font-size: 0.875rem;
      button { background: #FF4757; color: #fff; border: none; padding: 4px 12px; border-radius: 5px; cursor: pointer; font-size: 0.8rem; }
    }

    /* KPI grid */
    .fr-kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 1.5rem; }
    .fr-kpi {
      background: var(--bg-card, #1A2235); border: 1px solid var(--bg-border, #1E2D45);
      border-radius: 10px; padding: 14px 16px; border-left: 4px solid transparent;
      &.income     { border-left-color: #1D9E75; }
      &.expense    { border-left-color: var(--accent-warning, #FF8C42); }
      &.net-pos    { border-left-color: var(--accent-info, #A855F7); }
      &.net-neg    { border-left-color: var(--accent-danger, #FF4757); }
      &.outstanding { border-left-color: var(--accent-warning, #FF8C42); }
    }
    .fr-kpi-label { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-secondary, #94A3B8); margin-bottom: 6px; }
    .fr-kpi-value { font-size: 1.25rem; font-weight: 700; color: var(--text-primary, #E2E8F0); margin-bottom: 6px; line-height: 1.2; }
    .fr-kpi-sub { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 4px; }
    .fr-kpi-count { font-size: 0.7rem; color: var(--text-disabled, #4A5568); }

    /* Tags */
    .fr-tag { font-size: 0.67rem; font-weight: 700; padding: 2px 7px; border-radius: 99px; }
    .teal       { background: rgba(29,158,117,0.15);  color: var(--accent-success, #00FF9D); }
    .teal-light { background: rgba(29,158,117,0.08);  color: var(--accent-success, #00FF9D); opacity: 0.8; }
    .coral      { background: rgba(255,71,87,0.12);   color: var(--accent-danger, #FF4757); }
    .purple     { background: rgba(168,85,247,0.12);  color: var(--accent-info, #A855F7); }
    .amber      { background: rgba(255,140,66,0.12);  color: var(--accent-warning, #FF8C42); }

    /* Sections */
    .fr-section { margin-bottom: 1.5rem; }
    .fr-section-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 0.875rem; font-weight: 700; color: var(--text-primary, #E2E8F0);
      margin-bottom: 10px;
    }
    .fr-section-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0;
      &.purple { background: var(--accent-info, #A855F7); }
      &.teal   { background: var(--accent-success, #00FF9D); }
      &.coral  { background: var(--accent-danger, #FF4757); }
      &.amber  { background: var(--accent-warning, #FF8C42); }
    }
    .fr-group-badge { font-size: 0.67rem; font-weight: 700; padding: 2px 8px; border-radius: 99px; background: rgba(168,85,247,0.12); color: var(--accent-info, #A855F7); text-transform: capitalize; }
    .fr-count-badge { font-size: 0.67rem; font-weight: 700; padding: 2px 8px; border-radius: 99px; background: var(--bg-panel, #111827); color: var(--text-secondary, #94A3B8); }
    .fr-count-badge.amber-badge { background: rgba(255,140,66,0.12); color: var(--accent-warning, #FF8C42); }
    .fr-toggle-btn {
      margin-left: auto; font-size: 0.73rem; padding: 3px 10px;
      border: 1px solid var(--bg-border, #1E2D45); border-radius: 5px;
      background: transparent; color: var(--text-secondary, #94A3B8); cursor: pointer;
      &:hover { color: var(--text-primary, #E2E8F0); border-color: var(--accent-primary, #00D4FF); }
    }

    /* Tables */
    .fr-table-wrap { overflow-x: auto; border: 1px solid var(--bg-border, #1E2D45); border-radius: 10px; }
    .fr-table {
      width: 100%; border-collapse: collapse; font-size: 0.82rem;
      thead tr { background: linear-gradient(135deg, rgba(var(--accent-primary-rgb, 0,212,255), 0.07), rgba(168,85,247,0.07)); }
      th {
        padding: 10px 12px; text-align: left;
        font-size: 0.67rem; font-weight: 700; text-transform: uppercase;
        letter-spacing: 0.06em; color: var(--text-secondary, #94A3B8);
        border-bottom: 1px solid var(--bg-border, #1E2D45); white-space: nowrap;
        &.num { text-align: right; }
      }
      td {
        padding: 9px 12px; color: var(--text-primary, #E2E8F0);
        border-bottom: 1px solid var(--bg-border, #1E2D45);
        &.num { text-align: right; font-variant-numeric: tabular-nums; }
      }
      tbody tr:last-child td { border-bottom: none; }
      tbody tr:hover td { background: rgba(255,255,255,0.02); }
    }
    .totals-row {
      td { background: var(--bg-panel, #111827) !important; font-weight: 700 !important; color: var(--text-primary, #E2E8F0) !important; border-top: 1px solid var(--bg-border, #1E2D45) !important; }
    }
    .income-val      { color: var(--accent-success, #00FF9D) !important; font-weight: 600; }
    .expense-val     { color: var(--accent-warning, #FF8C42) !important; font-weight: 600; }
    .outstanding-val { color: var(--accent-warning, #FF8C42) !important; font-weight: 600; opacity: 0.8; }
    .total-val       { color: var(--text-primary, #E2E8F0) !important; font-weight: 700; }
    .net-pos-cell    { color: var(--accent-info, #A855F7) !important; font-weight: 700; }
    .net-neg-cell    { color: var(--accent-danger, #FF4757) !important; font-weight: 700; }
    .period-label    { font-weight: 600; color: var(--text-primary, #E2E8F0); }
    .date-cell       { color: var(--text-secondary, #94A3B8); white-space: nowrap; }
    .ref-cell        { font-family: 'Courier New', monospace; font-size: 0.73rem; color: var(--text-disabled, #4A5568); }
    .desc-cell       { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-secondary, #94A3B8); }

    /* Type badges */
    .fr-type-badge {
      font-size: 0.67rem; font-weight: 700; padding: 2px 7px; border-radius: 4px;
      &.event { background: rgba(var(--accent-primary-rgb, 0,212,255), 0.12); color: var(--accent-primary, #00D4FF); }
      &.adhoc { background: rgba(168,85,247,0.12); color: var(--accent-info, #A855F7); }
    }

    /* Status badges */
    .fr-status {
      font-size: 0.67rem; font-weight: 700; padding: 2px 7px; border-radius: 4px;
      &.status-paid     { background: rgba(0,255,157,0.12);  color: var(--accent-success, #00FF9D); }
      &.status-partial  { background: rgba(255,140,66,0.12); color: var(--accent-warning, #FF8C42); }
      &.status-pending  { background: rgba(168,85,247,0.12); color: var(--accent-info, #A855F7); }
      &.status-sent     { background: rgba(0,212,255,0.12);  color: var(--accent-primary, #00D4FF); }
      &.status-overdue  { background: rgba(255,71,87,0.12);  color: var(--accent-danger, #FF4757); }
    }

    /* Responsive */
    @media (max-width: 900px)  { .fr-kpi-grid { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 560px)  { .fr-kpi-grid { grid-template-columns: 1fr; } .fr-date-row { flex-direction: column; } }

    /* Print styles */
    @media print {
      app-sidebar-navigation { display: none !important; }
      .fr-hamburger, .fr-back-btn, .fr-action-group,
      .fr-filters, .fr-toggle-btn { display: none !important; }
      .fr-page-header { position: static; box-shadow: none; }
      .fr-page { padding: 0; }
      .fr-kpi-grid { grid-template-columns: repeat(4, 1fr); }
      .fr-table-wrap { overflow: visible; }
      .fr-section { page-break-inside: avoid; }
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  `]
})
export class FinancialReportComponent implements OnInit {
  private readonly api = environment.apiUrl;

  // Filter state
  fromDate     = this.isoDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  toDate       = this.isoDate(new Date());
  groupBy      = 'month';
  activePreset = 'thisMonth';

  // Data / UI state
  report:  FinancialReport | null = null;
  loading  = false;
  error    = '';
  exporting = false;

  // Detail panel toggles
  showIncomeDetail  = true;
  showExpenseDetail = true;
  showOutstanding   = true;

  constructor(
    private http:        HttpClient,
    private router:      Router,
    private themeSvc:    ThemeService,
    private authSvc:     AuthService,
    public  sidebarState: SidebarStateService
  ) {}

  // Sidebar
  isSidebarOpen = false;

  goBack() { this.router.navigate(['/reports']); }

  ngOnInit() {
    // Apply club dynamic theme — same as all other pages
    const user = this.authSvc.currentUserValue;
    if (user?.clubId) {
      this.themeSvc.loadAndApplyClubTheme(user.clubId)
        .subscribe({ error: () => this.themeSvc.loadThemeFromStorage() });
    } else {
      this.themeSvc.loadThemeFromStorage();
    }
    this.load();
  }

  // ── Preset periods ────────────────────────────────────────────────────────

  setPreset(p: string) {
    this.activePreset = p;
    const now = new Date();
    switch (p) {
      case 'today':
        this.fromDate = this.isoDate(now);
        this.toDate   = this.isoDate(now);
        this.groupBy  = 'month';
        break;
      case 'thisMonth':
        this.fromDate = this.isoDate(new Date(now.getFullYear(), now.getMonth(), 1));
        this.toDate   = this.isoDate(now);
        this.groupBy  = 'month';
        break;
      case 'lastMonth': {
        const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        this.fromDate = this.isoDate(lm);
        this.toDate   = this.isoDate(new Date(now.getFullYear(), now.getMonth(), 0));
        this.groupBy  = 'month';
        break;
      }
      case 'thisYear':
        this.fromDate = this.isoDate(new Date(now.getFullYear(), 0, 1));
        this.toDate   = this.isoDate(now);
        this.groupBy  = 'month';
        break;
      case 'lastYear':
        this.fromDate = this.isoDate(new Date(now.getFullYear() - 1, 0, 1));
        this.toDate   = this.isoDate(new Date(now.getFullYear() - 1, 11, 31));
        this.groupBy  = 'month';
        break;
    }
    this.load();
  }

  // ── Load data ─────────────────────────────────────────────────────────────

  load() {
    this.loading = true;
    this.error   = '';
    const qs = `fromDate=${this.fromDate}&toDate=${this.toDate}&groupBy=${this.groupBy}`;
    this.http.get<FinancialReport>(`${this.api}/Reports/financial-report?${qs}`).subscribe({
      next: r  => { this.report = r; this.loading = false; },
      error: e => { this.error = e.error?.message || 'Failed to load report'; this.loading = false; }
    });
  }

  // ── Print Report — Printer-friendly white page via iframe ────────────────

  printReport() {
    if (!this.report) return;
    const r = this.report;
    const period = `${this.fromDate}  →  ${this.toDate}`;

    const fmt = (n: number) =>
      new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' SAR';

    const statusColour = (s: string) => ({
      Paid: '#166534', Partial: '#854D0E', Pending: '#1E3A5F',
      Overdue: '#991B1B', Sent: '#1E40AF'
    } as any)[s] ?? '#374151';

    const statusBg = (s: string) => ({
      Paid: '#DCFCE7', Partial: '#FEF3C7', Pending: '#DBEAFE',
      Overdue: '#FEE2E2', Sent: '#DBEAFE'
    } as any)[s] ?? '#F3F4F6';

    const kpiCard = (label: string, value: string, accent: string, sub = '') => `
      <div style="background:#fff;border:1px solid #E2E8F0;border-radius:8px;padding:14px 16px;border-left:4px solid ${accent}">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748B;margin-bottom:5px">${label}</div>
        <div style="font-size:17px;font-weight:700;color:#0F172A;margin-bottom:4px">${value}</div>
        ${sub ? `<div style="font-size:9px;color:#64748B">${sub}</div>` : ''}
      </div>`;

    const th = (cols: string[]) =>
      `<tr style="background:#1E3A5F">${cols.map(c =>
        `<th style="padding:7px 10px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#fff;white-space:nowrap">${c}</th>`
      ).join('')}</tr>`;

    const sectionTitle = (dot: string, text: string) =>
      `<div style="display:flex;align-items:center;gap:8px;margin:24px 0 8px;font-size:12px;font-weight:700;color:#1E3A5F">
        <span style="width:9px;height:9px;border-radius:50%;background:${dot};display:inline-block"></span>
        ${text}
      </div>`;

    const periodRows = r.periodRows.map(p => `
      <tr style="border-bottom:1px solid #F1F5F9">
        <td style="padding:7px 10px;font-weight:600;color:#0F172A;font-size:10px">${p.periodLabel}</td>
        <td style="padding:7px 10px;text-align:right;font-size:10px;color:#166534">${fmt(p.eventIncome)}</td>
        <td style="padding:7px 10px;text-align:right;font-size:10px;color:#166534">${fmt(p.adhocIncome)}</td>
        <td style="padding:7px 10px;text-align:right;font-size:10px;font-weight:700;color:#0F172A">${fmt(p.totalIncome)}</td>
        <td style="padding:7px 10px;text-align:right;font-size:10px;color:#9A3412">${fmt(p.expenses)}</td>
        <td style="padding:7px 10px;text-align:right;font-size:10px;font-weight:700;color:${p.net >= 0 ? '#1E3A5F' : '#991B1B'}">${fmt(p.net)}</td>
        <td style="padding:7px 10px;text-align:right;font-size:10px;color:#854D0E">${fmt(p.outstanding)}</td>
      </tr>`).join('');

    const periodTotals = `
      <tr style="background:#F8FAFC;border-top:2px solid #CBD5E1">
        <td style="padding:8px 10px;font-size:10px;font-weight:700;color:#0F172A">TOTAL</td>
        <td style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;color:#166534">${fmt(r.totalEventIncome)}</td>
        <td style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;color:#166534">${fmt(r.totalAdhocIncome)}</td>
        <td style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;color:#0F172A">${fmt(r.totalIncome)}</td>
        <td style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;color:#9A3412">${fmt(r.totalExpenses)}</td>
        <td style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;color:${r.netBalance >= 0 ? '#1E3A5F' : '#991B1B'}">${fmt(r.netBalance)}</td>
        <td style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;color:#854D0E">${fmt(r.totalOutstanding)}</td>
      </tr>`;

    const incomeRows = r.incomeDetails.map((row, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#F8FAFC'};border-bottom:1px solid #F1F5F9">
        <td style="padding:6px 8px;font-size:9px;color:#64748B;font-family:monospace">${row.invoiceRef}</td>
        <td style="padding:6px 8px;font-size:9px;color:#64748B;white-space:nowrap">${row.date}</td>
        <td style="padding:6px 8px"><span style="font-size:8px;font-weight:700;padding:2px 6px;border-radius:3px;background:${row.type === 'Event' ? '#DBEAFE' : '#EDE9FE'};color:${row.type === 'Event' ? '#1E40AF' : '#5B21B6'}">${row.type}</span></td>
        <td style="padding:6px 8px;font-size:9px;color:#374151;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${row.description}</td>
        <td style="padding:6px 8px;font-size:9px;color:#0F172A">${row.studentName}</td>
        <td style="padding:6px 8px;font-size:9px;color:#64748B">${row.paymentMethod}</td>
        <td style="padding:6px 8px;text-align:right;font-size:9px;font-weight:600;color:#166534">${fmt(row.amountPaid)}</td>
        <td style="padding:6px 8px;text-align:right;font-size:9px;color:#854D0E">${fmt(row.amountDue)}</td>
        <td style="padding:6px 8px"><span style="font-size:8px;font-weight:700;padding:2px 6px;border-radius:3px;background:${statusBg(row.status)};color:${statusColour(row.status)}">${row.status}</span></td>
      </tr>`).join('');

    const expenseRows = r.expenseDetails.map((row, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#F8FAFC'};border-bottom:1px solid #F1F5F9">
        <td style="padding:6px 8px;font-size:9px;color:#64748B;white-space:nowrap">${row.date}</td>
        <td style="padding:6px 8px;font-size:9px;color:#374151">${row.category}</td>
        <td style="padding:6px 8px;font-size:9px;color:#374151;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${row.description}</td>
        <td style="padding:6px 8px;font-size:9px;color:#64748B">${row.team || '—'}</td>
        <td style="padding:6px 8px;font-size:9px;color:#64748B">${row.paymentMethod}</td>
        <td style="padding:6px 8px;font-size:9px;color:#64748B">${row.addedBy || '—'}</td>
        <td style="padding:6px 8px;text-align:right;font-size:9px;font-weight:600;color:#9A3412">${fmt(row.amount)}</td>
      </tr>`).join('');

    const outstandingRows = r.outstanding.map((row, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#FFFBEB'};border-bottom:1px solid #F1F5F9">
        <td style="padding:6px 8px;font-size:9px;color:#64748B;font-family:monospace">${row.invoiceRef}</td>
        <td style="padding:6px 8px;font-size:9px;color:#0F172A">${row.studentName}</td>
        <td style="padding:6px 8px;font-size:9px;color:#374151;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${row.description}</td>
        <td style="padding:6px 8px"><span style="font-size:8px;font-weight:700;padding:2px 6px;border-radius:3px;background:${row.type === 'Event' ? '#DBEAFE' : '#EDE9FE'};color:${row.type === 'Event' ? '#1E40AF' : '#5B21B6'}">${row.type}</span></td>
        <td style="padding:6px 8px;font-size:9px;color:#64748B;white-space:nowrap">${row.dueDate || '—'}</td>
        <td style="padding:6px 8px;text-align:right;font-size:9px;font-weight:700;color:#9A3412">${fmt(row.amountDue)}</td>
        <td style="padding:6px 8px;text-align:right;font-size:9px;color:#166534">${fmt(row.amountPaid)}</td>
        <td style="padding:6px 8px"><span style="font-size:8px;font-weight:700;padding:2px 6px;border-radius:3px;background:${statusBg(row.status)};color:${statusColour(row.status)}">${row.status}</span></td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Financial Report — ${period}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; background: #fff; color: #0F172A;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { padding: 20mm 14mm 16mm; }
  table { width: 100%; border-collapse: collapse; }
  .no-break { page-break-inside: avoid; }
  @page { size: A4 landscape; margin: 0; }
  @media print { .page { padding: 10mm 8mm; } }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #1E3A5F;padding-bottom:10px;margin-bottom:18px">
    <div>
      <div style="font-size:9px;color:#64748B;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">Club Management</div>
      <h1 style="font-size:20px;font-weight:700;color:#1E3A5F;margin-bottom:3px">Financial Report</h1>
      <p style="font-size:10px;color:#64748B">Period: <strong>${period}</strong> &nbsp;·&nbsp; Grouped by: <strong>${this.groupBy}</strong></p>
    </div>
    <div style="text-align:right">
      <div style="font-size:9px;color:#94A3B8">Printed on</div>
      <div style="font-size:10px;font-weight:600;color:#374151">${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
    </div>
  </div>

  <!-- KPI cards -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">
    ${kpiCard('Total Income',   fmt(r.totalIncome),   '#1D9E75', `Events ${fmt(r.totalEventIncome)} · Adhoc ${fmt(r.totalAdhocIncome)}`)}
    ${kpiCard('Total Expenses', fmt(r.totalExpenses), '#D97706', `${r.expenseCount} records`)}
    ${kpiCard('Net Balance',    fmt(r.netBalance),    r.netBalance >= 0 ? '#1E3A5F' : '#DC2626', 'Income − Expenses')}
    ${kpiCard('Outstanding',    fmt(r.totalOutstanding), '#D97706', `${r.outstanding.length} unpaid invoices`)}
  </div>

  <!-- Period Breakdown -->
  <div class="no-break">
    ${sectionTitle('#7C3AED', 'Period Breakdown')}
    <table style="border:1px solid #E2E8F0;border-radius:6px;overflow:hidden">
      <thead>${th(['Period','Event Income','Adhoc Income','Total Income','Expenses','Net','Outstanding'])}</thead>
      <tbody>${periodRows}${periodTotals}</tbody>
    </table>
  </div>

  ${r.incomeDetails.length > 0 ? `
  <div class="no-break" style="margin-top:20px">
    ${sectionTitle('#1D9E75', `Income Detail — ${r.incomeDetails.length} records`)}
    <table style="border:1px solid #E2E8F0;border-radius:6px;overflow:hidden">
      <thead>${th(['Ref','Date','Type','Description','Student','Method','Paid','Due','Status'])}</thead>
      <tbody>${incomeRows}</tbody>
    </table>
  </div>` : ''}

  ${r.expenseDetails.length > 0 ? `
  <div class="no-break" style="margin-top:20px">
    ${sectionTitle('#D97706', `Expense Detail — ${r.expenseDetails.length} records`)}
    <table style="border:1px solid #E2E8F0;border-radius:6px;overflow:hidden">
      <thead>${th(['Date','Category','Description','Team','Method','Added By','Amount'])}</thead>
      <tbody>${expenseRows}</tbody>
    </table>
  </div>` : ''}

  ${r.outstanding.length > 0 ? `
  <div class="no-break" style="margin-top:20px">
    ${sectionTitle('#D97706', `Outstanding Invoices — ${r.outstanding.length}`)}
    <table style="border:1px solid #E2E8F0;border-radius:6px;overflow:hidden">
      <thead>${th(['Ref','Student','Description','Type','Due Date','Amount Due','Paid','Status'])}</thead>
      <tbody>${outstandingRows}</tbody>
    </table>
  </div>` : ''}

  <!-- Footer -->
  <div style="margin-top:24px;padding-top:8px;border-top:1px solid #E2E8F0;display:flex;justify-content:space-between;font-size:8px;color:#94A3B8">
    <span>Club Management — Financial Report — ${period}</span>
    <span>Generated ${new Date().toLocaleString()}</span>
  </div>

</div>
<script>
  window.onload = function() {
    window.focus();
    window.print();
    setTimeout(function(){ window.close(); }, 1500);
  };
<\/script>
</body>
</html>`;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) { document.body.removeChild(iframe); return; }
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 8000);
  }

  // ── Excel Export ──────────────────────────────────────────────────────────

  async exportExcel() {
    if (!this.report) return;
    this.exporting = true;
    try {
      const ExcelJS = await import('exceljs');
      const { saveAs } = await import('file-saver');
      const wb = new ExcelJS.Workbook();
      wb.creator = 'Club Management';
      wb.created = new Date();

      // ── Shared style helpers ─────────────────────────────────────
      const headerFill = (color: string): ExcelJS.Fill => ({
        type: 'pattern', pattern: 'solid',
        fgColor: { argb: color }
      });
      const border: Partial<ExcelJS.Borders> = {
        top:    { style: 'thin', color: { argb: 'FFD3D1C7' } },
        bottom: { style: 'thin', color: { argb: 'FFD3D1C7' } },
        left:   { style: 'thin', color: { argb: 'FFD3D1C7' } },
        right:  { style: 'thin', color: { argb: 'FFD3D1C7' } },
      };
      const currency = '#,##0.00" SAR"';
      const applyHeader = (row: ExcelJS.Row, fill: string) => {
        row.eachCell((c: ExcelJS.Cell) => {
          c.fill = headerFill(fill);
          c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
          c.alignment = { horizontal: 'center', vertical: 'middle' };
          c.border = border;
        });
        row.height = 22;
      };
      const applyTotals = (row: ExcelJS.Row) => {
        row.eachCell((c: ExcelJS.Cell) => {
          c.fill = headerFill('FF1A2235');
          c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
          c.border = border;
        });
        row.height = 20;
      };

      // ══════════════════════════════════════════════════════════════
      // SHEET 1: Summary
      // ══════════════════════════════════════════════════════════════
      const s1 = wb.addWorksheet('Summary', { properties: { tabColor: { argb: 'FF1D9E75' } } });
      s1.columns = [
        { width: 22 }, { width: 18 }, { width: 18 }, { width: 18 },
        { width: 18 }, { width: 18 }, { width: 18 }
      ];

      // Report title
      s1.mergeCells('A1:G1');
      const titleCell = s1.getCell('A1');
      titleCell.value = `Financial Report — ${this.fromDate} to ${this.toDate}`;
      titleCell.font = { bold: true, size: 14, color: { argb: 'FF0A0F1E' } };
      titleCell.fill = headerFill('FF00D4FF');
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      s1.getRow(1).height = 30;

      // KPI block
      s1.addRow([]);
      const kpiTitleRow = s1.addRow(['Key Performance Indicators']);
      kpiTitleRow.getCell(1).font = { bold: true, size: 11, color: { argb: 'FF0A0F1E' } };
      kpiTitleRow.getCell(1).fill = headerFill('FF5DCAA5');
      s1.mergeCells(`A${kpiTitleRow.number}:G${kpiTitleRow.number}`);

      const kpiData = [
        ['Total Event Income',   this.report.totalEventIncome],
        ['Total Adhoc Income',   this.report.totalAdhocIncome],
        ['Total Income',         this.report.totalIncome],
        ['Total Expenses',       this.report.totalExpenses],
        ['Net Balance',          this.report.netBalance],
        ['Total Outstanding',    this.report.totalOutstanding],
        ['Income Transactions',  this.report.incomeTransactions],
        ['Expense Records',      this.report.expenseCount],
      ];
      kpiData.forEach(([label, val]) => {
        const row = s1.addRow([label, val]);
        row.getCell(1).font = { bold: false, size: 10 };
        row.getCell(2).numFmt = typeof val === 'number' && label !== 'Income Transactions' && label !== 'Expense Records' ? currency : '0';
        row.getCell(2).alignment = { horizontal: 'right' };
        row.eachCell((c: ExcelJS.Cell) => { c.border = border; });
      });

      // Period breakdown
      s1.addRow([]);
      const periodHdrRow = s1.addRow(['Period', 'Event Income', 'Adhoc Income', 'Total Income', 'Expenses', 'Net', 'Outstanding']);
      applyHeader(periodHdrRow, 'FF0B5345');

      this.report.periodRows.forEach(r => {
        const row = s1.addRow([r.periodLabel, r.eventIncome, r.adhocIncome, r.totalIncome, r.expenses, r.net, r.outstanding]);
        [2,3,4,5,6,7].forEach(i => { row.getCell(i).numFmt = currency; row.getCell(i).alignment = { horizontal: 'right' }; });
        row.getCell(6).font = { color: { argb: r.net >= 0 ? 'FF534AB7' : 'FFD85A30' } };
        row.eachCell((c: ExcelJS.Cell) => { c.border = border; });
      });

      // Totals row
      const totalRow = s1.addRow([
        'TOTAL',
        this.report.totalEventIncome, this.report.totalAdhocIncome,
        this.report.totalIncome, this.report.totalExpenses,
        this.report.netBalance, this.report.totalOutstanding
      ]);
      applyTotals(totalRow);
      [2,3,4,5,6,7].forEach(i => { totalRow.getCell(i).numFmt = currency; totalRow.getCell(i).alignment = { horizontal: 'right' }; });

      // ══════════════════════════════════════════════════════════════
      // SHEET 2: Income Detail
      // ══════════════════════════════════════════════════════════════
      const s2 = wb.addWorksheet('Income Detail', { properties: { tabColor: { argb: 'FF1D9E75' } } });
      s2.columns = [
        { header: 'Ref',          key: 'invoiceRef',    width: 12 },
        { header: 'Date',         key: 'date',          width: 14 },
        { header: 'Type',         key: 'type',          width: 10 },
        { header: 'Description',  key: 'description',   width: 30 },
        { header: 'Student',      key: 'studentName',   width: 22 },
        { header: 'Method',       key: 'paymentMethod', width: 14 },
        { header: 'Collected by', key: 'collectedBy',   width: 20 },
        { header: 'Amount Paid',  key: 'amountPaid',    width: 16 },
        { header: 'Amount Due',   key: 'amountDue',     width: 16 },
        { header: 'Status',       key: 'status',        width: 12 },
      ];
      applyHeader(s2.getRow(1), 'FF0B5345');
      this.report.incomeDetails.forEach(r => {
        const row = s2.addRow(r);
        row.getCell(8).numFmt = currency;
        row.getCell(9).numFmt = currency;
        row.eachCell((c: ExcelJS.Cell) => { c.border = border; c.font = { size: 10 }; });
      });
      // Total row
      const i2Total = s2.addRow({ amountPaid: this.report.totalIncome, amountDue: this.report.totalOutstanding });
      i2Total.getCell(1).value = 'TOTAL';
      i2Total.getCell(7).numFmt = currency;
      i2Total.getCell(8).numFmt = currency;
      applyTotals(i2Total);

      // ══════════════════════════════════════════════════════════════
      // SHEET 3: Expense Detail
      // ══════════════════════════════════════════════════════════════
      const s3 = wb.addWorksheet('Expense Detail', { properties: { tabColor: { argb: 'FFD85A30' } } });
      s3.columns = [
        { header: 'Date',        key: 'date',          width: 14 },
        { header: 'Category',    key: 'category',      width: 16 },
        { header: 'Description', key: 'description',   width: 34 },
        { header: 'Amount',      key: 'amount',        width: 16 },
        { header: 'Method',      key: 'paymentMethod', width: 14 },
        { header: 'Team',        key: 'team',          width: 18 },
        { header: 'Added By',    key: 'addedBy',       width: 20 },
      ];
      applyHeader(s3.getRow(1), 'FF993C1D');
      this.report.expenseDetails.forEach(r => {
        const row = s3.addRow(r);
        row.getCell(4).numFmt = currency;
        row.eachCell((c: ExcelJS.Cell) => { c.border = border; c.font = { size: 10 }; });
      });
      const e3Total = s3.addRow({ amount: this.report.totalExpenses });
      e3Total.getCell(1).value = 'TOTAL';
      e3Total.getCell(4).numFmt = currency;
      applyTotals(e3Total);

      // ══════════════════════════════════════════════════════════════
      // SHEET 4: Outstanding
      // ══════════════════════════════════════════════════════════════
      const s4 = wb.addWorksheet('Outstanding', { properties: { tabColor: { argb: 'FFBA7517' } } });
      s4.columns = [
        { header: 'Invoice Ref', key: 'invoiceRef',  width: 12 },
        { header: 'Student',     key: 'studentName', width: 22 },
        { header: 'Description', key: 'description', width: 30 },
        { header: 'Type',        key: 'type',        width: 10 },
        { header: 'Due Date',    key: 'dueDate',     width: 14 },
        { header: 'Amount Due',  key: 'amountDue',   width: 16 },
        { header: 'Amount Paid', key: 'amountPaid',  width: 16 },
        { header: 'Status',      key: 'status',      width: 12 },
      ];
      applyHeader(s4.getRow(1), 'FF854F0B');
      this.report.outstanding.forEach(r => {
        const row = s4.addRow(r);
        row.getCell(6).numFmt = currency;
        row.getCell(7).numFmt = currency;
        row.eachCell((c: ExcelJS.Cell) => { c.border = border; c.font = { size: 10 }; });
      });
      const o4Total = s4.addRow({ amountDue: this.report.totalOutstanding });
      o4Total.getCell(1).value = 'TOTAL';
      o4Total.getCell(6).numFmt = currency;
      applyTotals(o4Total);

      // ── Save ──────────────────────────────────────────────────────
      const buffer = await wb.xlsx.writeBuffer();
      const fileName = `Financial-Report_${this.fromDate}_to_${this.toDate}.xlsx`;
      saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName);
    } catch (err) {
      console.error('Excel export error:', err);
      alert('Export failed. Make sure exceljs and file-saver are installed.');
    } finally {
      this.exporting = false;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private isoDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }
}
