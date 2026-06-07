import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WalletService } from '../../core/services/wallet.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { SidebarNavigationComponent } from '../../shared/components/sidebar-navigation/sidebar-navigation.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

interface ParentWallet {
  parentId:      number;
  parentName:    string;
  mobileNumber?: string;
  walletBalance: number;
  lastUpdatedAt: string;
  childCount:    number;
}

@Component({
  selector: 'app-wallet-management',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarNavigationComponent, PageHeaderComponent],
  template: `
<div class="wm-page page-with-sidebar">

  <div class="page-header-row">
    <app-page-header
      pageIcon="ti-wallet"
      pageTitle="Parent Wallets"
      pageSubtitle="Manage wallet balances and top-ups">
    </app-page-header>
  </div>
  <div class="page-body-row">
    <app-sidebar-navigation></app-sidebar-navigation>
    <div class="page-content">
  <!-- ── SEARCH & FILTER ── -->
  <div class="wm-toolbar">
    <div class="wm-search-wrap">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="wm-search-icon">
        <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="1.8"/>
        <path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
      <input class="wm-search" type="text" placeholder="Search parent name or mobile..."
             [(ngModel)]="searchTerm" (ngModelChange)="filterList()" />
    </div>
    <select class="wm-filter-select" [(ngModel)]="filterBalance" (ngModelChange)="filterList()">
      <option value="">All parents</option>
      <option value="with">With balance only</option>
      <option value="zero">Zero balance</option>
    </select>
  </div>

  <!-- ── LOADING ── -->
  <div class="wm-loading" *ngIf="loading">
    <div class="wm-spin"></div> Loading wallets...
  </div>

  <!-- ── PARENT LIST ── -->
  <div class="wm-list" *ngIf="!loading">
    <div class="wm-empty" *ngIf="filtered.length === 0">No parents found</div>

    <div class="wm-card" *ngFor="let p of filtered">
      <div class="wm-card-header">
        <div class="wm-av">{{ initials(p.parentName) }}</div>
        <div class="wm-parent-info">
          <span class="wm-parent-name">{{ p.parentName }}</span>
          <span class="wm-parent-meta">
            {{ p.childCount }} child{{ p.childCount !== 1 ? 'ren' : '' }}
            <ng-container *ngIf="p.mobileNumber"> &middot; {{ p.mobileNumber }}</ng-container>
          </span>
        </div>
        <div class="wm-balance-pill" [class.wm-balance-pill--positive]="p.walletBalance > 0">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="6" width="20" height="14" rx="2" stroke="currentColor" stroke-width="1.8"/>
            <path d="M2 10h20" stroke="currentColor" stroke-width="1.8"/>
            <circle cx="17" cy="15" r="1.5" fill="currentColor"/>
          </svg>
          {{ p.walletBalance | number:'1.2-2' }} SAR
        </div>
        <button class="wm-topup-btn" (click)="openTopUp(p, $event)">+ Top Up</button>
        <button class="wm-history-btn" (click)="openHistory(p, $event)">History</button>
      </div>
    </div>
  </div>
    </div><!-- /.page-content -->
  </div><!-- /.page-body-row -->
</div><!-- /.wm-page -->

<!-- ── TOP-UP MODAL ── -->
<div class="wm-overlay" *ngIf="topUpModal" (click)="closeTopUp()">
  <div class="wm-modal" (click)="$event.stopPropagation()">
    <div class="wm-modal-header">
      <span class="wm-modal-title">&#128176; Top Up Wallet</span>
      <button class="wm-modal-close" (click)="closeTopUp()">&#10005;</button>
    </div>
    <div class="wm-modal-body">
      <div class="wm-modal-parent">
        <div class="wm-av wm-av-sm">{{ initials(topUpModal.parentName) }}</div>
        <div>
          <div class="wm-modal-parent-name">{{ topUpModal.parentName }}</div>
          <div class="wm-modal-balance">
            Current balance:
            <strong [class.positive]="topUpModal.walletBalance > 0">
              {{ topUpModal.walletBalance | number:'1.2-2' }} SAR
            </strong>
          </div>
        </div>
      </div>

      <div class="wm-field">
        <label class="wm-label">Amount (SAR) <span class="req">*</span></label>
        <input class="wm-input" type="number" min="0.01" step="0.01"
               [(ngModel)]="topUpAmount" placeholder="0.00" />
      </div>
      <div class="wm-field">
        <label class="wm-label">Payment Method</label>
        <select class="wm-input" [(ngModel)]="topUpMethod">
          <option value="Cash">Cash</option>
          <option value="BankTransfer">Bank Transfer</option>
          <option value="Card">Card</option>
          <option value="Online">Online</option>
          <option value="STCPay">STC Pay</option>
          <option value="Mada">Mada</option>
        </select>
      </div>
      <div class="wm-field">
        <label class="wm-label">Reference <span class="opt">(optional)</span></label>
        <input class="wm-input" type="text" [(ngModel)]="topUpRef" placeholder="Receipt / transaction number" />
      </div>
      <div class="wm-field">
        <label class="wm-label">Notes <span class="opt">(optional)</span></label>
        <textarea class="wm-input wm-textarea" rows="2" [(ngModel)]="topUpNotes" placeholder="Reason for top-up..."></textarea>
      </div>

      <!-- Quick amounts -->
      <div class="wm-quick-amounts">
        <span class="wm-quick-lbl">Quick:</span>
        <button *ngFor="let q of quickAmounts" class="wm-quick-btn"
                [class.active]="topUpAmount === q" (click)="topUpAmount = q">{{ q }} SAR</button>
      </div>

      <!-- Preview -->
      <div class="wm-topup-preview" *ngIf="topUpAmount > 0">
        <div class="wm-preview-row"><span>Current balance</span><span>{{ topUpModal.walletBalance | number:'1.2-2' }} SAR</span></div>
        <div class="wm-preview-row wm-preview-row--add"><span>+ Top-up</span><span class="add-amt">+ {{ topUpAmount | number:'1.2-2' }} SAR</span></div>
        <div class="wm-preview-row wm-preview-row--new">
          <strong>New balance</strong>
          <strong class="new-bal">{{ (topUpModal.walletBalance + topUpAmount) | number:'1.2-2' }} SAR</strong>
        </div>
      </div>
    </div>
    <div class="wm-modal-footer">
      <button class="wm-btn-cancel" (click)="closeTopUp()">Cancel</button>
      <button class="wm-btn-confirm" (click)="confirmTopUp()" [disabled]="topUpSaving || topUpAmount <= 0">
        <span *ngIf="!topUpSaving">&#10003; Add {{ topUpAmount | number:'1.2-2' }} SAR</span>
        <span *ngIf="topUpSaving">Processing...</span>
      </button>
    </div>
  </div>
</div>

<!-- ── HISTORY MODAL ── -->
<div class="wm-overlay" *ngIf="historyModal" (click)="closeHistory()">
  <div class="wm-modal wm-modal-wide" (click)="$event.stopPropagation()">
    <div class="wm-modal-header">
      <span class="wm-modal-title">Wallet History &mdash; {{ historyModal.parentName }}</span>
      <button class="wm-modal-close" (click)="closeHistory()">&#10005;</button>
    </div>
    <div class="wm-modal-body">
      <div class="wm-loading" *ngIf="historyLoading"><div class="wm-spin"></div> Loading...</div>
      <div class="wm-history-list" *ngIf="!historyLoading">
        <div class="wm-history-empty" *ngIf="historyTxns.length === 0">No transactions yet</div>
        <div class="wm-txn" *ngFor="let t of historyTxns"
             [class.wm-txn--credit]="t.txnType === 'credit'"
             [class.wm-txn--debit]="t.txnType === 'debit'">
          <div class="wm-txn-icon">{{ t.txnType === 'credit' ? '&#8593;' : '&#8595;' }}</div>
          <div class="wm-txn-info">
            <span class="wm-txn-source">{{ sourceLabel(t.source) }}</span>
            <span class="wm-txn-desc" *ngIf="t.description">{{ t.description }}</span>
            <span class="wm-txn-date">{{ formatDate(t.createdAt) }}<ng-container *ngIf="t.createdByName"> &middot; {{ t.createdByName }}</ng-container></span>
          </div>
          <div class="wm-txn-amt">
            <span [class.credit-amt]="t.txnType === 'credit'" [class.debit-amt]="t.txnType === 'debit'">
              {{ t.txnType === 'credit' ? '+' : '-' }}{{ t.amount | number:'1.2-2' }} SAR
            </span>
            <span class="wm-txn-bal">Balance: {{ t.balanceAfter | number:'1.2-2' }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
  `,
  styles: [`
    .wm-page { min-height:100vh; background:var(--bg-app,#0A0F1E); color:var(--text-primary,#E2E8F0); }
    .wm-header { background:var(--gradient-primary,linear-gradient(135deg,#1a3a5c,#0d7377)); padding:12px 20px; display:flex; align-items:center; gap:14px; position:sticky; top:0; z-index:10; box-shadow:0 3px 12px rgba(0,0,0,.35); }
    .wm-back { background:rgba(255,255,255,.15); color:#fff; border:1px solid rgba(255,255,255,.3); padding:6px 12px; border-radius:7px; cursor:pointer; font-size:.8rem; flex-shrink:0; }
    .wm-back:hover { background:rgba(255,255,255,.25); }
    .wm-header-icon { color:white; display:flex; }
    .wm-header-info { display:flex; align-items:center; gap:10px; flex:1; }
    .wm-header-info h1 { margin:0; font-size:1rem; color:#fff; font-weight:700; }
    .wm-header-info p  { margin:0; font-size:.68rem; color:rgba(255,255,255,.65); }
    .wm-header-stats { display:flex; gap:20px; margin-left:auto; }
    .wm-stat { text-align:right; }
    .wm-stat-val { display:block; font-size:1.1rem; font-weight:700; color:#FACC15; }
    .wm-stat-lbl { font-size:.65rem; color:rgba(255,255,255,.6); text-transform:uppercase; }
    .wm-toolbar { display:flex; align-items:center; gap:10px; padding:14px 20px 8px; }
    .wm-search-wrap { position:relative; flex:1; }
    .wm-search-icon { position:absolute; left:10px; top:50%; transform:translateY(-50%); color:var(--text-secondary,#94A3B8); pointer-events:none; }
    .wm-search { width:100%; padding:8px 12px 8px 32px; background:var(--bg-card,#1A2235); border:1px solid var(--bg-border,#1E2D45); border-radius:8px; color:var(--text-primary,#E2E8F0); font-size:.82rem; outline:none; box-sizing:border-box; }
    .wm-search:focus { border-color:#FACC15; }
    .wm-filter-select { padding:8px 12px; background:var(--bg-card,#1A2235); border:1px solid var(--bg-border,#1E2D45); border-radius:8px; color:var(--text-primary,#E2E8F0); font-size:.82rem; outline:none; cursor:pointer; }
    .wm-loading { display:flex; align-items:center; gap:10px; justify-content:center; padding:40px; color:var(--text-secondary,#94A3B8); font-size:.85rem; }
    .wm-spin { width:20px; height:20px; border:2px solid rgba(255,255,255,.1); border-top-color:#FACC15; border-radius:50%; animation:spin .8s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }
    .wm-list { padding:8px 20px 40px; display:flex; flex-direction:column; gap:8px; }
    .wm-empty { text-align:center; padding:40px; color:var(--text-secondary,#94A3B8); font-size:.85rem; }
    .wm-card { background:var(--bg-card,#1A2235); border:1px solid var(--bg-border,#1E2D45); border-radius:10px; overflow:hidden; transition:border-color .15s; }
    .wm-card:hover { border-color:rgba(250,204,21,.2); }
    .wm-card-header { display:flex; align-items:center; gap:12px; padding:12px 16px; }
    .wm-av { width:38px; height:38px; border-radius:50%; background:linear-gradient(135deg,#0d7377,#14a085); display:flex; align-items:center; justify-content:center; font-size:.78rem; font-weight:700; color:#fff; flex-shrink:0; }
    .wm-av-sm { width:32px; height:32px; font-size:.7rem; }
    .wm-parent-info { flex:1; min-width:0; }
    .wm-parent-name { display:block; font-size:.88rem; font-weight:600; color:var(--text-primary,#E2E8F0); }
    .wm-parent-meta { font-size:.7rem; color:var(--text-secondary,#94A3B8); }
    .wm-balance-pill { display:flex; align-items:center; gap:5px; padding:4px 12px; border-radius:99px; background:rgba(100,116,139,.12); border:1px solid rgba(100,116,139,.2); font-size:.78rem; font-weight:700; color:var(--text-secondary,#94A3B8); flex-shrink:0; }
    .wm-balance-pill--positive { background:rgba(250,204,21,.1); border-color:rgba(250,204,21,.25); color:#FACC15; }
    .wm-topup-btn { padding:5px 14px; border-radius:6px; flex-shrink:0; background:rgba(250,204,21,.12); border:1px solid rgba(250,204,21,.3); color:#FACC15; cursor:pointer; font-size:.78rem; font-weight:700; }
    .wm-topup-btn:hover { background:rgba(250,204,21,.2); }
    .wm-history-btn { padding:5px 12px; border-radius:6px; flex-shrink:0; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1); color:var(--text-secondary,#94A3B8); cursor:pointer; font-size:.75rem; }
    .wm-history-btn:hover { background:rgba(255,255,255,.1); }
    .wm-overlay { position:fixed; inset:0; z-index:100; background:rgba(0,0,0,.6); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; padding:20px; }
    .wm-modal { background:var(--bg-panel,#111827); border:1px solid var(--bg-border,#1E2D45); border-radius:14px; width:100%; max-width:440px; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,.5); }
    .wm-modal-wide { max-width:560px; }
    .wm-modal-header { display:flex; align-items:center; justify-content:space-between; padding:14px 18px; background:rgba(250,204,21,.06); border-bottom:1px solid rgba(250,204,21,.15); }
    .wm-modal-title { font-size:.9rem; font-weight:700; color:var(--text-primary,#E2E8F0); }
    .wm-modal-close { background:none; border:none; color:var(--text-secondary,#94A3B8); font-size:1rem; cursor:pointer; padding:2px 6px; border-radius:4px; }
    .wm-modal-close:hover { background:rgba(255,255,255,.08); }
    .wm-modal-body { padding:18px; max-height:70vh; overflow-y:auto; }
    .wm-modal-parent { display:flex; align-items:center; gap:10px; margin-bottom:18px; padding:10px 12px; background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.06); border-radius:8px; }
    .wm-modal-parent-name { font-size:.88rem; font-weight:700; color:var(--text-primary,#E2E8F0); }
    .wm-modal-balance { font-size:.75rem; color:var(--text-secondary,#94A3B8); }
    .wm-modal-balance .positive { color:#FACC15; }
    .wm-field { margin-bottom:14px; }
    .wm-label { display:block; font-size:.78rem; font-weight:600; color:var(--text-secondary,#94A3B8); margin-bottom:5px; }
    .req { color:#FF4757; }
    .opt { font-weight:400; color:#64748B; }
    .wm-input { width:100%; padding:9px 12px; box-sizing:border-box; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); border-radius:8px; font-size:.85rem; color:var(--text-primary,#E2E8F0); outline:none; }
    .wm-input:focus { border-color:#FACC15; }
    .wm-textarea { resize:vertical; min-height:56px; }
    .wm-quick-amounts { display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-bottom:14px; }
    .wm-quick-lbl { font-size:.72rem; color:#64748B; flex-shrink:0; }
    .wm-quick-btn { padding:4px 12px; border-radius:99px; font-size:.75rem; font-weight:600; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1); color:var(--text-secondary,#94A3B8); cursor:pointer; }
    .wm-quick-btn.active, .wm-quick-btn:hover { background:rgba(250,204,21,.12); border-color:rgba(250,204,21,.3); color:#FACC15; }
    .wm-topup-preview { background:rgba(250,204,21,.05); border:1px solid rgba(250,204,21,.15); border-radius:8px; padding:12px 14px; margin-top:4px; }
    .wm-preview-row { display:flex; justify-content:space-between; align-items:center; font-size:.8rem; color:var(--text-secondary,#94A3B8); padding:3px 0; }
    .add-amt { color:#4ADE80; font-weight:700; }
    .wm-preview-row--new { border-top:1px solid rgba(250,204,21,.15); margin-top:6px; padding-top:8px; font-size:.88rem; color:var(--text-primary,#E2E8F0); }
    .new-bal { color:#FACC15; font-size:1rem; }
    .wm-modal-footer { display:flex; gap:10px; padding:14px 18px; border-top:1px solid var(--bg-border,#1E2D45); }
    .wm-btn-cancel { flex:1; padding:9px; border-radius:8px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1); color:var(--text-secondary,#94A3B8); cursor:pointer; font-size:.82rem; }
    .wm-btn-confirm { flex:2; padding:9px; border-radius:8px; background:#FACC15; border:none; color:#000; font-weight:700; cursor:pointer; font-size:.85rem; transition:opacity .15s; }
    .wm-btn-confirm:disabled { opacity:.4; cursor:not-allowed; }
    .wm-btn-confirm:not(:disabled):hover { opacity:.85; }
    .wm-history-list { display:flex; flex-direction:column; gap:6px; }
    .wm-history-empty { text-align:center; padding:24px; color:#64748B; font-size:.82rem; }
    .wm-txn { display:flex; align-items:flex-start; gap:10px; padding:10px 12px; border-radius:8px; background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.05); }
    .wm-txn-icon { width:28px; height:28px; border-radius:50%; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:.9rem; font-weight:700; }
    .wm-txn--credit .wm-txn-icon { background:rgba(74,222,128,.12); color:#4ADE80; }
    .wm-txn--debit  .wm-txn-icon { background:rgba(255,71,87,.12);  color:#FF4757; }
    .wm-txn-info { flex:1; min-width:0; }
    .wm-txn-source { display:block; font-size:.82rem; font-weight:600; color:var(--text-primary,#E2E8F0); }
    .wm-txn-desc   { display:block; font-size:.72rem; color:var(--text-secondary,#94A3B8); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .wm-txn-date   { display:block; font-size:.68rem; color:#475569; margin-top:2px; }
    .wm-txn-amt    { text-align:right; flex-shrink:0; }
    .credit-amt { color:#4ADE80; font-weight:700; font-size:.85rem; display:block; }
    .debit-amt  { color:#FF4757; font-weight:700; font-size:.85rem; display:block; }
    .wm-txn-bal { font-size:.68rem; color:#64748B; }
  `]
})
export class WalletManagementComponent implements OnInit {

  loading = true;
  parents: ParentWallet[] = [];
  filtered: ParentWallet[] = [];
  searchTerm    = '';
  filterBalance = '';

  topUpModal:  ParentWallet | null = null;
  topUpAmount  = 0;
  topUpMethod  = 'Cash';
  topUpRef     = '';
  topUpNotes   = '';
  topUpSaving  = false;
  quickAmounts = [50, 100, 200, 500, 1000];

  historyModal:   ParentWallet | null = null;
  historyTxns:    any[] = [];
  historyLoading  = false;

  get totalWalletBalance(): number { return this.parents.reduce((s, p) => s + p.walletBalance, 0); }
  get parentsWithBalance():  number { return this.parents.filter(p => p.walletBalance > 0).length; }

  constructor(
    private router:    Router,
    private walletSvc: WalletService,
    private toastSvc:  ToastService,
    private authSvc:   AuthService,
    private themeSvc:  ThemeService
  ) {}

  ngOnInit() {
    const user = this.authSvc.currentUserValue;
    if (user?.clubId) {
      this.themeSvc.loadAndApplyClubTheme(user.clubId).subscribe({
        error: () => this.themeSvc.loadThemeFromStorage()
      });
    } else {
      this.themeSvc.loadThemeFromStorage();
    }
    this.load();
  }

  load() {
    this.loading = true;
    this.walletSvc.getParentList().subscribe({
      next: r => {
        this.parents  = r.success ? (r.parents || []) : [];
        this.filtered = [...this.parents];
        this.loading  = false;
      },
      error: () => { this.toastSvc.showError('Could not load wallet data'); this.loading = false; }
    });
  }

  filterList() {
    let list = [...this.parents];
    const q  = this.searchTerm.toLowerCase().trim();
    if (q) list = list.filter(p => p.parentName.toLowerCase().includes(q) || p.mobileNumber?.includes(q));
    if (this.filterBalance === 'with') list = list.filter(p => p.walletBalance > 0);
    if (this.filterBalance === 'zero') list = list.filter(p => p.walletBalance <= 0);
    this.filtered = list;
  }

  openTopUp(p: ParentWallet, e: MouseEvent) {
    e.stopPropagation();
    this.topUpModal = p; this.topUpAmount = 0;
    this.topUpMethod = 'Cash'; this.topUpRef = ''; this.topUpNotes = '';
  }
  closeTopUp() { this.topUpModal = null; }

  confirmTopUp() {
    if (!this.topUpModal || this.topUpAmount <= 0) return;
    this.topUpSaving = true;
    this.walletSvc.topUp(this.topUpModal.parentId, {
      amount: this.topUpAmount, paymentMethod: this.topUpMethod,
      reference: this.topUpRef || undefined,
      description: this.topUpNotes || undefined,
      recordAsPayment: true
    }).subscribe({
      next: r => {
        this.topUpSaving = false;
        if (r.success) {
          this.toastSvc.showSuccess(`Wallet topped up! New balance: ${r.newBalance.toFixed(2)} SAR`);
          const p = this.parents.find(x => x.parentId === this.topUpModal!.parentId);
          if (p) p.walletBalance = r.newBalance;
          this.filterList();
          this.closeTopUp();
        } else { this.toastSvc.showError(r.message || 'Top-up failed'); }
      },
      error: err => { this.topUpSaving = false; this.toastSvc.showError(err?.error?.message || 'Could not top up wallet'); }
    });
  }

  openHistory(p: ParentWallet, e: MouseEvent) {
    e.stopPropagation();
    this.historyModal = p; this.historyTxns = []; this.historyLoading = true;
    this.walletSvc.getTransactions(p.parentId).subscribe({
      next: r => { this.historyTxns = r.transactions || []; this.historyLoading = false; },
      error: () => { this.historyLoading = false; }
    });
  }
  closeHistory() { this.historyModal = null; }

  initials(name: string): string {
    const p = name.trim().split(' ');
    return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('en-SA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  sourceLabel(s: string): string {
    const map: Record<string, string> = {
      admin_topup: 'Admin Top-up', overpayment: 'Overpayment Credit',
      refund: 'Refund', invoice_pay: 'Invoice Payment', adjustment: 'Adjustment'
    };
    return map[s] ?? s;
  }

  goBack() { this.router.navigate(['/dashboard']); }
}
