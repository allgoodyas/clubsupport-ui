import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SidebarNavigationComponent } from '../../shared/components/sidebar-navigation/sidebar-navigation.component';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';
import { SidebarStateService } from '../../core/services/sidebar-state.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { environment } from '../../../environments/environment';

declare const Chart: any;

interface CashBalance {
  totalIncome: number; totalIncomeCount: number;
  totalExpenses: number; totalExpenseCount: number;
  netBalance: number;
  thisMonthIncome: number; thisMonthExpenses: number; thisMonthNet: number;
  lastMonthIncome: number; lastMonthExpenses: number; lastMonthNet: number;
  incomeChangePercent: number; expenseChangePercent: number;
}

interface MonthlyAmount { month: string; label: string; income: number; expense: number; net: number; }
interface AmountByLabel { label: string; amount: number; count: number; }

interface RevenueReport {
  totalRevenue: number; totalPayments: number; totalOutstanding: number;
  byMonth: MonthlyAmount[]; byType: AmountByLabel[];
  byTeam: AmountByLabel[]; byMethod: AmountByLabel[];
}

interface ExpenseReport {
  totalExpenses: number; totalCount: number;
  byMonth: MonthlyAmount[]; byCategory: AmountByLabel[];
  byTeam: AmountByLabel[]; byMethod: AmountByLabel[];
}

interface Team { teamId: number; nameEn: string; }

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, SidebarNavigationComponent, PageHeaderComponent],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly api = environment.apiUrl;

  @ViewChild('revenueBarCanvas')  revenueBarCanvas!:  ElementRef<HTMLCanvasElement>;
  @ViewChild('expenseBarCanvas')  expenseBarCanvas!:  ElementRef<HTMLCanvasElement>;
  @ViewChild('typeDonutCanvas')   typeDonutCanvas!:   ElementRef<HTMLCanvasElement>;
  @ViewChild('catDonutCanvas')    catDonutCanvas!:    ElementRef<HTMLCanvasElement>;
  @ViewChild('methodBarCanvas')   methodBarCanvas!:   ElementRef<HTMLCanvasElement>;
  @ViewChild('expMethodCanvas')   expMethodCanvas!:   ElementRef<HTMLCanvasElement>;

  isSidebarOpen = false;
  activeTab: 'balance' | 'revenue' | 'expenses' = 'balance';

  // Filters — default to last 7 days
  filterFromDate = this.daysAgo(7);
  filterToDate   = this.daysAgo(0);
  filterTeamId   = 0;
  teams: Team[]  = [];

  // Data
  balance:  CashBalance | null  = null;
  revenue:  RevenueReport | null = null;
  expenses: ExpenseReport | null = null;

  loadingBalance  = false;
  loadingRevenue  = false;
  loadingExpenses = false;

  // Charts
  private charts: any[] = [];
  private chartJsLoaded = false;

  constructor(
    private http:      HttpClient,
    private router:    Router,
    private translate: TranslateService,
    private themeSvc:  ThemeService,
    private authSvc:   AuthService,
    private sidebarState: SidebarStateService
  ) {}

  ngOnInit() {
    // Apply club dynamic theme — same as all other pages
    const user = this.authSvc.currentUserValue;
    if (user?.clubId) {
      this.themeSvc.loadAndApplyClubTheme(user.clubId)
        .subscribe({ error: () => this.themeSvc.loadThemeFromStorage() });
    } else {
      this.themeSvc.loadThemeFromStorage();
    }
    this.loadTeams();
    this.loadChartJs().then(() => {
      this.loadBalance();
    });
  }

  ngAfterViewInit() {}

  ngOnDestroy() {
    this.charts.forEach(c => { try { c.destroy(); } catch {} });
  }

  // ── Chart.js loading ─────────────────────────────────────────

  private loadChartJs(): Promise<void> {
    if (this.chartJsLoaded || typeof Chart !== 'undefined') {
      this.chartJsLoaded = true;
      return Promise.resolve();
    }
    return new Promise(resolve => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
      s.onload = () => { this.chartJsLoaded = true; resolve(); };
      document.head.appendChild(s);
    });
  }

  private destroyChart(ref: ElementRef<HTMLCanvasElement> | undefined) {
    if (!ref) return;
    const existing = Chart.getChart(ref.nativeElement);
    if (existing) existing.destroy();
  }

  // ── Loaders ───────────────────────────────────────────────────

  loadTeams() {
    this.http.get<Team[]>(`${this.api}/teams`).subscribe({
      next: t => this.teams = t, error: () => {}
    });
  }

  loadBalance() {
    this.loadingBalance = true;
    this.http.get<CashBalance>(`${this.api}/Reports/cash-balance${this.qs()}`).subscribe({
      next: b => { this.balance = b; this.loadingBalance = false; },
      error: () => { this.loadingBalance = false; }
    });
  }

  loadRevenue() {
    this.loadingRevenue = true;
    this.http.get<RevenueReport>(`${this.api}/Reports/revenue${this.qs()}`).subscribe({
      next: r => {
        this.revenue = r;
        this.loadingRevenue = false;
        setTimeout(() => this.drawRevenueCharts(), 100);
      },
      error: () => { this.loadingRevenue = false; }
    });
  }

  loadExpenses() {
    this.loadingExpenses = true;
    this.http.get<ExpenseReport>(`${this.api}/Reports/expenses${this.qs()}`).subscribe({
      next: e => {
        this.expenses = e;
        this.loadingExpenses = false;
        setTimeout(() => this.drawExpenseCharts(), 100);
      },
      error: () => { this.loadingExpenses = false; }
    });
  }

  // ── Tab switching ─────────────────────────────────────────────

  switchTab(tab: 'balance' | 'revenue' | 'expenses') {
    this.activeTab = tab;
    if (tab === 'balance'  && !this.balance)  this.loadBalance();
    if (tab === 'revenue'  && !this.revenue)  this.loadRevenue();
    if (tab === 'expenses' && !this.expenses) this.loadExpenses();
  }

  applyFilters() {
    this.balance = null; this.revenue = null; this.expenses = null;
    if (this.activeTab === 'balance')  this.loadBalance();
    if (this.activeTab === 'revenue')  this.loadRevenue();
    if (this.activeTab === 'expenses') this.loadExpenses();
  }

  clearFilters() {
    this.filterFromDate = this.daysAgo(7);
    this.filterToDate   = this.daysAgo(0);
    this.filterTeamId   = 0;
    this.applyFilters();
  }

  get hasFilters() {
    return this.filterFromDate !== this.daysAgo(7)
        || this.filterToDate   !== this.daysAgo(0)
        || this.filterTeamId   >   0;
  }

  private qs(): string {
    const p: string[] = [];
    if (this.filterFromDate)      p.push(`fromDate=${this.filterFromDate}`);
    if (this.filterToDate)        p.push(`toDate=${this.filterToDate}`);
    if (this.filterTeamId > 0)    p.push(`teamId=${this.filterTeamId}`);
    return p.length ? '?' + p.join('&') : '';
  }

  // ── Charts ────────────────────────────────────────────────────

  private readonly COLORS = [
    '#00D4FF','#A855F7','#10B981','#F59E0B','#EF4444',
    '#3B82F6','#EC4899','#8B5CF6','#14B8A6','#F97316'
  ];

  private chartDefaults() {
    return {
      plugins: { legend: { labels: { color: '#94A3B8', font: { size: 12 } } } },
      scales: {
        x: { ticks: { color: '#94A3B8', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#94A3B8', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.07)' } }
      }
    };
  }

  private drawRevenueCharts() {
    if (!this.revenue || typeof Chart === 'undefined') return;

    // Monthly bar
    if (this.revenueBarCanvas) {
      this.destroyChart(this.revenueBarCanvas);
      new Chart(this.revenueBarCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: this.revenue.byMonth.map(m => m.label),
          datasets: [{ label: this.translate.instant('REPORTS.CHART_REVENUE_SAR'), data: this.revenue.byMonth.map(m => m.income),
            backgroundColor: 'rgba(0,212,255,0.7)', borderRadius: 6 }]
        },
        options: { ...this.chartDefaults(), responsive: true, plugins: { legend: { display: false } } }
      });
    }

    // Type donut
    if (this.typeDonutCanvas && this.revenue.byType.length) {
      this.destroyChart(this.typeDonutCanvas);
      new Chart(this.typeDonutCanvas.nativeElement, {
        type: 'doughnut',
        data: {
          labels: this.revenue.byType.map(t => t.label),
          datasets: [{ data: this.revenue.byType.map(t => t.amount),
            backgroundColor: this.COLORS.slice(0, this.revenue.byType.length),
            borderWidth: 2, borderColor: '#111827' }]
        },
        options: { responsive: true, cutout: '65%',
          plugins: { legend: { position: 'right', labels: { color: '#94A3B8', font: { size: 12 } } } } }
      });
    }

    // Method bar
    if (this.methodBarCanvas && this.revenue.byMethod.length) {
      this.destroyChart(this.methodBarCanvas);
      new Chart(this.methodBarCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: this.revenue.byMethod.map(m => m.label),
          datasets: [{ label: 'SAR', data: this.revenue.byMethod.map(m => m.amount),
            backgroundColor: this.COLORS.slice(0, this.revenue.byMethod.length), borderRadius: 6 }]
        },
        options: { indexAxis: 'y', responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#94A3B8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { ticks: { color: '#94A3B8' }, grid: { display: false } }
          }
        }
      });
    }
  }

  private drawExpenseCharts() {
    if (!this.expenses || typeof Chart === 'undefined') return;

    // Monthly bar
    if (this.expenseBarCanvas) {
      this.destroyChart(this.expenseBarCanvas);
      new Chart(this.expenseBarCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: this.expenses.byMonth.map(m => m.label),
          datasets: [{ label: this.translate.instant('REPORTS.CHART_EXPENSES_SAR'), data: this.expenses.byMonth.map(m => m.expense),
            backgroundColor: 'rgba(168,85,247,0.7)', borderRadius: 6 }]
        },
        options: { ...this.chartDefaults(), responsive: true, plugins: { legend: { display: false } } }
      });
    }

    // Category donut
    if (this.catDonutCanvas && this.expenses.byCategory.length) {
      this.destroyChart(this.catDonutCanvas);
      new Chart(this.catDonutCanvas.nativeElement, {
        type: 'doughnut',
        data: {
          labels: this.expenses.byCategory.map(c => c.label),
          datasets: [{ data: this.expenses.byCategory.map(c => c.amount),
            backgroundColor: this.COLORS.slice(0, this.expenses.byCategory.length),
            borderWidth: 2, borderColor: '#111827' }]
        },
        options: { responsive: true, cutout: '65%',
          plugins: { legend: { position: 'right', labels: { color: '#94A3B8', font: { size: 12 } } } } }
      });
    }

    // Method bar
    if (this.expMethodCanvas && this.expenses.byMethod.length) {
      this.destroyChart(this.expMethodCanvas);
      new Chart(this.expMethodCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: this.expenses.byMethod.map(m => m.label),
          datasets: [{ label: 'SAR', data: this.expenses.byMethod.map(m => m.amount),
            backgroundColor: this.COLORS.slice(0, this.expenses.byMethod.length), borderRadius: 6 }]
        },
        options: { indexAxis: 'y', responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#94A3B8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { ticks: { color: '#94A3B8' }, grid: { display: false } }
          }
        }
      });
    }
  }

  // ── Helpers ───────────────────────────────────────────────────

  trendIcon(pct: number)  { return pct > 0 ? '↑' : pct < 0 ? '↓' : '→'; }
  trendClass(pct: number) { return pct > 0 ? 'trend-up' : pct < 0 ? 'trend-down' : 'trend-flat'; }
  absPercent(pct: number) { return Math.abs(pct); }

  catIcon(cat: string): string {
    const m: Record<string,string> = { Staff:'👤', Equipment:'🏋️', Rent:'🏠',
      Transport:'🚌', Tournament:'🏆', Utilities:'⚡', Marketing:'📢', Other:'📦' };
    return m[cat] || '📦';
  }

  typeIcon(t: string): string {
    const m: Record<string,string> = { Event:'📅', Adhoc:'💸', Subscription:'🔄', Manual:'📝', Other:'📄' };
    return m[t] || '📄';
  }

  methodIcon(m: string): string {
    const map: Record<string,string> = { Cash:'💵', Card:'💳', BankTransfer:'🏦',
      Cheque:'📝', Online:'🌐', STCPay:'📱', Mada:'💳', Other:'🔄' };
    return map[m] || '💳';
  }

  barWidth(amount: number, max: number): string {
    if (!max) return '0%';
    return Math.round((amount / max) * 100) + '%';
  }

  get maxRevByTeam()  { return Math.max(...(this.revenue?.byTeam?.map(t => t.amount)  || [1])); }
  get maxExpByTeam()  { return Math.max(...(this.expenses?.byTeam?.map(t => t.amount) || [1])); }

  private daysAgo(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];   // 'YYYY-MM-DD'
  }

  toggleSidebar() { this.sidebarState.toggle(); }
  closeSidebar()  { this.sidebarState.close();  }
  goToExpenses()  { this.router.navigate(['/expenses']); }
  goToFinancialReport() { this.router.navigate(['/reports/financial']); }
}
