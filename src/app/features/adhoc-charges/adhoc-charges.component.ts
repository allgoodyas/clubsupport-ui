import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { SidebarNavigationComponent } from '../../shared/components/sidebar-navigation/sidebar-navigation.component';
import { PaymentPanelComponent } from '../../shared/components/payment-panel/payment-panel.component';
import { ToastService } from '../../core/services/toast.service';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';
import { SidebarStateService } from '../../core/services/sidebar-state.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { environment } from '../../../environments/environment';

interface Template { templateId: number; nameEn: string; nameAr?: string; description?: string; defaultAmount: number; category?: string; }
interface Team     { teamId: number; nameEn: string; nameAr?: string; ageGroup?: string; color?: string; }
interface Student  { studentId: number; fullName: string; age: number; gender: string; teamName?: string; ageGroup?: string; teamColor?: string; }
interface Charge   { chargeId: number; studentId: number; studentName: string; templateName?: string; title: string; amount: number; status: string; invoiceId?: number; invoiceNumber?: string; invoiceStatus?: string; amountPaid: number; amountDue: number; createdAt: string; }

@Component({
  selector: 'app-adhoc-charges',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarNavigationComponent, PaymentPanelComponent, PageHeaderComponent],
  templateUrl: './adhoc-charges.component.html',
  styleUrls: ['./adhoc-charges.component.scss']
})
export class AdhocChargesComponent implements OnInit {
  private readonly api = environment.apiUrl;

  isSidebarOpen = false;

  // ── Wizard state ──────────────────────────────────────────────
  step = 1;   // 1 = template, 2 = amount, 3 = students, 4 = confirm

  // Step 1
  templates: Template[] = [];
  loadingTemplates = false;
  selectedTemplate: Template | null = null;
  showCustom = false;

  // Step 2
  chargeTitle = '';
  chargeAmount = 0;
  chargeNotes = '';

  // Step 3
  teams: Team[] = [];
  selectedTeamId = 0;
  studentSearch = '';
  students: Student[] = [];
  loadingStudents = false;
  selectedIds: Set<number> = new Set();
  searchTimer: any;

  // Step 4 / submit
  submitting = false;
  result: any = null;

  // ── History tab ───────────────────────────────────────────────
  activeTab: 'wizard' | 'history' = 'wizard';
  charges:      Charge[] = [];
  loadingCharges = false;
  historySearch  = '';
  historyStatus  = 'pending';   // default: Sent + Partial
  dateFrom       = '';
  dateTo         = '';
  private historySearchTimer: any;

  // Pagination
  pageSize    = 15;
  currentPage = 1;
  totalCount  = 0;
  get totalPages(): number { return Math.max(1, Math.ceil(this.totalCount / this.pageSize)); }
  get pageNums():   number[] { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }
  get pageEnd():    number   { return Math.min(this.currentPage * this.pageSize, this.totalCount); }
  goToPage(p: number): void  { if (p >= 1 && p <= this.totalPages) { this.currentPage = p; this.loadCharges(); } }

  // ── Payment panel ─────────────────────────────────────────────
  showPayPanel = false;
  payData: any = null;

  // ── Template management ───────────────────────────────────────
  showTemplateForm = false;
  editingTemplate: Template | null = null;
  tplForm = { nameEn: '', nameAr: '', description: '', defaultAmount: 0, category: '' };
  savingTemplate = false;

  categories = ['Kit', 'Transport', 'Tournament', 'Training', 'Other'];

  constructor(
    private http:     HttpClient,
    private router:   Router,
    private toast:    ToastService,
    private themeSvc: ThemeService,
    private authSvc:  AuthService,
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
    this.loadTemplates();
    this.loadTeams();
  }

  // ── Loaders ───────────────────────────────────────────────────

  loadTemplates() {
    this.loadingTemplates = true;
    this.http.get<Template[]>(`${this.api}/AdhocCharges/templates`).subscribe({
      next: t => { this.templates = t; this.loadingTemplates = false; },
      error: () => { this.loadingTemplates = false; }
    });
  }

  loadTeams() {
    this.http.get<Team[]>(`${this.api}/teams`).subscribe({
      next: t => this.teams = t, error: () => {}
    });
  }

  loadStudents() {
    this.loadingStudents = true;
    const params: string[] = [];
    if (this.selectedTeamId > 0)        params.push(`teamId=${this.selectedTeamId}`);
    if (this.studentSearch.trim())      params.push(`search=${encodeURIComponent(this.studentSearch.trim())}`);
    const qs = params.length ? '?' + params.join('&') : '';
    this.http.get<Student[]>(`${this.api}/AdhocCharges/students${qs}`).subscribe({
      next: s => { this.students = s; this.loadingStudents = false; },
      error: () => { this.loadingStudents = false; }
    });
  }

  loadCharges(resetPage = false) {
    if (resetPage) this.currentPage = 1;
    this.loadingCharges = true;
    const params: string[] = [
      `page=${this.currentPage}`,
      `pageSize=${this.pageSize}`
    ];
    if (this.historyStatus !== 'all') params.push(`status=${this.historyStatus}`);
    if (this.historySearch.trim())    params.push(`search=${encodeURIComponent(this.historySearch.trim())}`);
    if (this.dateFrom)                params.push(`dateFrom=${this.dateFrom}`);
    if (this.dateTo)                  params.push(`dateTo=${this.dateTo}`);
    const qs = '?' + params.join('&');
    this.http.get<any>(`${this.api}/AdhocCharges${qs}`).subscribe({
      next: r => {
        // Support both paged response {items, totalCount} and plain array
        if (r && r.items !== undefined) {
          this.charges    = r.items;
          this.totalCount = r.totalCount;
        } else {
          this.charges    = Array.isArray(r) ? r : [];
          this.totalCount = this.charges.length;
        }
        this.loadingCharges = false;
      },
      error: () => { this.loadingCharges = false; }
    });
  }

  onHistorySearch() {
    clearTimeout(this.historySearchTimer);
    this.historySearchTimer = setTimeout(() => this.loadCharges(true), 350);
  }

  setHistoryStatus(s: string) { this.historyStatus = s; this.loadCharges(true); }

  clearDateFilter() {
    this.dateFrom = '';
    this.dateTo   = '';
    this.loadCharges(true);
  }

  // ── Wizard navigation ─────────────────────────────────────────

  pickTemplate(t: Template | null) {
    if (t === null) {
      // Custom charge
      this.selectedTemplate = null;
      this.showCustom = true;
      this.chargeTitle = '';
      this.chargeAmount = 0;
    } else {
      this.selectedTemplate = t;
      this.showCustom = false;
      this.chargeTitle = t.nameEn;
      this.chargeAmount = t.defaultAmount;
    }
  }

  goStep2() {
    if (!this.selectedTemplate && !this.showCustom) return;
    this.step = 2;
  }

  goStep3() {
    if (!this.chargeTitle.trim() || this.chargeAmount <= 0) return;
    this.step = 3;
    this.loadStudents();
  }

  goStep4() {
    if (this.selectedIds.size === 0) return;
    this.step = 4;
  }

  goBack() { if (this.step > 1) this.step--; }

  resetWizard() {
    this.step = 1;
    this.selectedTemplate = null;
    this.showCustom = false;
    this.chargeTitle = '';
    this.chargeAmount = 0;
    this.chargeNotes = '';
    this.selectedIds = new Set();
    this.studentSearch = '';
    this.selectedTeamId = 0;
    this.result = null;
  }

  // ── Student selection ─────────────────────────────────────────

  onTeamFilter() { this.selectedIds = new Set(); this.loadStudents(); }

  onSearchChange() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.loadStudents(), 300);
  }

  toggleStudent(id: number) {
    const s = new Set(this.selectedIds);
    s.has(id) ? s.delete(id) : s.add(id);
    this.selectedIds = s;
  }

  selectAll() {
    this.selectedIds = new Set(this.students.map(s => s.studentId));
  }

  clearSelection() { this.selectedIds = new Set(); }

  get selectedStudents(): Student[] {
    return this.students.filter(s => this.selectedIds.has(s.studentId));
  }

  // ── Submit ────────────────────────────────────────────────────

  submit() {
    if (this.submitting || this.selectedIds.size === 0) return;
    this.submitting = true;

    this.http.post<any>(`${this.api}/AdhocCharges/create-bulk`, {
      templateId:  this.selectedTemplate?.templateId ?? null,
      title:       this.chargeTitle.trim(),
      amount:      this.chargeAmount,
      notes:       this.chargeNotes || null,
      studentIds:  Array.from(this.selectedIds)
    }).subscribe({
      next: res => {
        this.submitting = false;
        this.result = res;
        this.step = 5; // success screen
        this.loadCharges(); // pre-load history
      },
      error: err => {
        this.submitting = false;
        alert(err.error?.message || 'Failed to create charges');
      }
    });
  }

  // ── Template management ───────────────────────────────────────

  openCreateTemplate() {
    this.editingTemplate = null;
    this.tplForm = { nameEn: '', nameAr: '', description: '', defaultAmount: 0, category: 'Other' };
    this.showTemplateForm = true;
  }

  openEditTemplate(t: Template, e: Event) {
    e.stopPropagation();
    this.editingTemplate = t;
    this.tplForm = { nameEn: t.nameEn, nameAr: t.nameAr || '', description: t.description || '', defaultAmount: t.defaultAmount, category: t.category || 'Other' };
    this.showTemplateForm = true;
  }

  closeTemplateForm() { this.showTemplateForm = false; }

  saveTemplate() {
    if (!this.tplForm.nameEn.trim()) return;
    this.savingTemplate = true;
    const body = { nameEn: this.tplForm.nameEn.trim(), nameAr: this.tplForm.nameAr?.trim() || null, description: this.tplForm.description?.trim() || null, defaultAmount: this.tplForm.defaultAmount, category: this.tplForm.category };
    const req = this.editingTemplate
      ? this.http.put(`${this.api}/AdhocCharges/templates/${this.editingTemplate.templateId}`, body)
      : this.http.post(`${this.api}/AdhocCharges/templates`, body);

    req.subscribe({
      next: () => { this.savingTemplate = false; this.showTemplateForm = false; this.loadTemplates(); },
      error: err => { this.savingTemplate = false; alert(err.error?.message || 'Failed to save template'); }
    });
  }

  deleteTemplate(t: Template, e: Event) {
    e.stopPropagation();
    if (!confirm(`Remove template "${t.nameEn}"?`)) return;
    this.http.delete(`${this.api}/AdhocCharges/templates/${t.templateId}`).subscribe({ next: () => this.loadTemplates() });
  }

  // ── Tab switching ─────────────────────────────────────────────

  switchTab(tab: 'wizard' | 'history') {
    this.activeTab = tab;
    if (tab === 'history') this.loadCharges(true);
    else { this.resetWizard(); this.loadTemplates(); }
  }

  // ── Helpers ───────────────────────────────────────────────────

  getInitials(name: string) { return name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase(); }
  getBadgeStyle(color?: string) { const c = color || '#3B82F6'; return { 'background-color': c+'22', color: c, border: '1px solid '+c+'55' }; }
  getStatusClass(s: string) { return { 'status-paid': s==='Paid', 'status-pending': s==='Sent'||s==='Partial', 'status-overdue': s==='Overdue' }; }

  // ── Payment panel ─────────────────────────────────────────────

  openPayment(c: Charge): void {
    this.payData = {
      studentId:     c.studentId,
      eventId:       0,
      invoiceId:     c.invoiceId ?? null,
      studentName:   c.studentName,
      eventName:     c.title,          // charge title shown in payment panel header
      totalAmount:   c.amount,
      amountPaid:    c.amountPaid,
      amountDue:     c.amountDue,
      invoiceNumber: c.invoiceNumber
    };
    this.showPayPanel = true;
  }

  closePayment(): void {
    this.showPayPanel = false;
    this.payData = null;
  }

  onPaymentRecorded(): void {
    this.closePayment();
    this.toast.showSuccess('✅ Payment recorded successfully');
    this.loadCharges();   // refresh history table
  }

  toggleSidebar() { this.sidebarState.toggle(); }
  closeSidebar()  { this.sidebarState.close();  }
}
