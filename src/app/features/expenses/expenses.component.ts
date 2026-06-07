import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SidebarNavigationComponent } from '../../shared/components/sidebar-navigation/sidebar-navigation.component';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher.component';
import { ToastService } from '../../core/services/toast.service';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';
import { SidebarStateService } from '../../core/services/sidebar-state.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { environment } from '../../../environments/environment';

interface Expense {
  expenseId: number;
  category: string;
  title: string;
  amount: number;
  expenseDate: string;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
  teamId?: number;
  teamName?: string;
  eventId?: number;
  eventName?: string;
  createdByName?: string;
  createdAt: string;
}

interface Summary {
  totalAmount: number;
  totalCount: number;
  thisMonthAmount: number;
  thisMonthCount: number;
  byCategory: { category: string; amount: number; count: number }[];
}

interface Team  { teamId: number;  nameEn: string; }
interface Event { eventId: number; eventNameEn: string; }

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, SidebarNavigationComponent, LanguageSwitcherComponent, PageHeaderComponent],
  templateUrl: './expenses.component.html',
  styleUrls: ['./expenses.component.scss']
})
export class ExpensesComponent implements OnInit {
  private readonly api = environment.apiUrl;

  isSidebarOpen = false;

  // ── Data ──────────────────────────────────────────────────────
  expenses: Expense[] = [];
  summary: Summary | null = null;
  teams: Team[]   = [];
  events: Event[] = [];

  loading  = false;
  saving   = false;
  deleting = 0;   // expenseId being deleted

  // ── Filters ───────────────────────────────────────────────────
  filterCategory = 'all';
  filterTeamId   = 0;
  filterFromDate = '';
  filterToDate   = '';
  filterSearch   = '';
  searchTimer: any;

  // ── Form (create / edit) ──────────────────────────────────────
  showForm    = false;
  editingId   = 0;     // 0 = new
  form = this.emptyForm();

  categories = [
    { value: 'Staff',       label: '👤 Staff' },
    { value: 'Equipment',   label: '🏋️ Equipment' },
    { value: 'Rent',        label: '🏠 Rent' },
    { value: 'Transport',   label: '🚌 Transport' },
    { value: 'Tournament',  label: '🏆 Tournament' },
    { value: 'Utilities',   label: '⚡ Utilities' },
    { value: 'Marketing',   label: '📢 Marketing' },
    { value: 'Other',       label: '📦 Other' },
  ];

  methods = [
    { value: 'Cash',        label: '💵 Cash' },
    { value: 'Card',        label: '💳 Card' },
    { value: 'BankTransfer',label: '🏦 Bank Transfer' },
    { value: 'Cheque',      label: '📝 Cheque' },
    { value: 'Online',      label: '🌐 Online' },
    { value: 'Other',       label: '🔄 Other' },
  ];

  constructor(
    private http: HttpClient,
    private toast: ToastService,
    private translate: TranslateService,
    private themeService: ThemeService,
    private authService: AuthService,
    private sidebarState: SidebarStateService
  ) {}

  ngOnInit() {
    // Apply club dynamic theme — same as events/students/teams pages
    const user = this.authService.currentUserValue;
    if (user?.clubId) {
      this.themeService.loadAndApplyClubTheme(user.clubId)
        .subscribe({ error: () => this.themeService.loadThemeFromStorage() });
    } else {
      this.themeService.loadThemeFromStorage();
    }
    this.loadExpenses();
    this.loadSummary();
    this.loadTeams();
  }

  // ── Loaders ───────────────────────────────────────────────────

  loadExpenses() {
    this.loading = true;
    const p: string[] = [];
    if (this.filterCategory !== 'all') p.push(`category=${this.filterCategory}`);
    if (this.filterTeamId > 0)         p.push(`teamId=${this.filterTeamId}`);
    if (this.filterFromDate)           p.push(`fromDate=${this.filterFromDate}`);
    if (this.filterToDate)             p.push(`toDate=${this.filterToDate}`);
    if (this.filterSearch.trim())      p.push(`search=${encodeURIComponent(this.filterSearch.trim())}`);
    const qs = p.length ? '?' + p.join('&') : '';

    this.http.get<Expense[]>(`${this.api}/Expenses${qs}`).subscribe({
      next: e => { this.expenses = e; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  loadSummary() {
    const p: string[] = [];
    if (this.filterFromDate) p.push(`fromDate=${this.filterFromDate}`);
    if (this.filterToDate)   p.push(`toDate=${this.filterToDate}`);
    const qs = p.length ? '?' + p.join('&') : '';
    this.http.get<Summary>(`${this.api}/Expenses/summary${qs}`).subscribe({
      next: s => this.summary = s, error: () => {}
    });
  }

  loadTeams() {
    this.http.get<Team[]>(`${this.api}/teams`).subscribe({
      next: t => this.teams = t, error: () => {}
    });
  }

  // ── Filters ───────────────────────────────────────────────────

  applyFilters() { this.loadExpenses(); this.loadSummary(); }

  onSearchChange() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.loadExpenses(), 300);
  }

  clearFilters() {
    this.filterCategory = 'all';
    this.filterTeamId   = 0;
    this.filterFromDate = '';
    this.filterToDate   = '';
    this.filterSearch   = '';
    this.applyFilters();
  }

  get hasActiveFilters(): boolean {
    return this.filterCategory !== 'all' || this.filterTeamId > 0
        || !!this.filterFromDate || !!this.filterToDate || !!this.filterSearch.trim();
  }

  // ── Form ──────────────────────────────────────────────────────

  emptyForm() {
    return {
      category: 'Other', title: '', amount: 0,
      expenseDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'Cash', referenceNumber: '', notes: '',
      teamId: 0, eventId: 0
    };
  }

  openCreate() {
    this.editingId = 0;
    this.form = this.emptyForm();
    this.showForm = true;
  }

  openEdit(e: Expense) {
    this.editingId = e.expenseId;
    this.form = {
      category:        e.category,
      title:           e.title,
      amount:          e.amount,
      expenseDate:     e.expenseDate.split('T')[0],
      paymentMethod:   e.paymentMethod,
      referenceNumber: e.referenceNumber || '',
      notes:           e.notes || '',
      teamId:          e.teamId || 0,
      eventId:         e.eventId || 0,
    };
    this.showForm = true;
  }

  closeForm() { this.showForm = false; }

  save() {
    if (!this.form.title.trim() || this.form.amount <= 0) return;
    this.saving = true;

    const body = {
      ...this.form,
      teamId:  this.form.teamId  > 0 ? this.form.teamId  : null,
      eventId: this.form.eventId > 0 ? this.form.eventId : null,
      referenceNumber: this.form.referenceNumber || null,
      notes:           this.form.notes           || null,
    };

    const req = this.editingId > 0
      ? this.http.put(`${this.api}/Expenses/${this.editingId}`, body)
      : this.http.post(`${this.api}/Expenses`, body);

    req.subscribe({
      next: () => {
        this.saving = false;
        this.showForm = false;
        this.toast.showSuccess(this.editingId > 0
          ? this.translate.instant('EXPENSES.TOAST_UPDATED')
          : this.translate.instant('EXPENSES.TOAST_ADDED'));
        this.loadExpenses();
        this.loadSummary();
      },
      error: err => {
        this.saving = false;
        this.toast.showError(err.error?.message || this.translate.instant('EXPENSES.FAILED_SAVE'));
      }
    });
  }

  deleteExpense(e: Expense) {
    if (!confirm(`Delete "${e.title}" — ${e.amount.toFixed(2)} SAR?`)) return;
    this.deleting = e.expenseId;
    this.http.delete(`${this.api}/Expenses/${e.expenseId}`).subscribe({
      next: () => {
        this.deleting = 0;
        this.toast.showSuccess(this.translate.instant('EXPENSES.TOAST_DELETED'));
        this.loadExpenses();
        this.loadSummary();
      },
      error: () => { this.deleting = 0; }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────

  get totalFiltered(): number {
    return this.expenses.reduce((s, e) => s + e.amount, 0);
  }

  getCategoryIcon(cat: string): string {
    const map: Record<string, string> = {
      Staff: '👤', Equipment: '🏋️', Rent: '🏠', Transport: '🚌',
      Tournament: '🏆', Utilities: '⚡', Marketing: '📢', Other: '📦'
    };
    return map[cat] || '📦';
  }

  getCategoryColor(cat: string): string {
    const map: Record<string, string> = {
      Staff: '#A855F7', Equipment: '#3B82F6', Rent: '#F59E0B',
      Transport: '#10B981', Tournament: '#EF4444', Utilities: '#F97316',
      Marketing: '#EC4899', Other: '#6B7280'
    };
    return map[cat] || '#6B7280';
  }

  getBadgeStyle(cat: string) {
    const c = this.getCategoryColor(cat);
    return { 'background-color': c + '22', color: c, border: '1px solid ' + c + '55' };
  }

  toggleSidebar() { this.sidebarState.toggle(); }
  closeSidebar()  { this.sidebarState.close();  }
}
