import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../shared/services/toast.service';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';

// ── Interfaces ────────────────────────────────────────────────────────────────

interface ParentUser {
  userId: number;
  fullName: string;
  email?: string;
  phoneNumber?: string;
  childCount: number;
}

interface PrefRow {
  typeId: number;
  typeCode: string;
  typeName: string;
  description: string;
  parentCanOptOut: boolean;
  channelId: number;
  channelCode: string;
  channelName: string;
  isEnabled: boolean;
  saving?: boolean;
}

interface PrefType {
  typeId: number;
  typeCode: string;
  typeName: string;
  description: string;
  parentCanOptOut: boolean;
  channels: PrefRow[];
}

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-user-notification-preferences',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="unp">

  <!-- ── HEADER ── -->
  <div class="unp-header">
    <button class="unp-back" (click)="goBack()">← Back</button>
    <div class="unp-header-title">
      <span class="unp-header-icon">🔔</span>
      <div>
        <h1>User Notification Preferences</h1>
        <p>Manage notification settings per parent / user</p>
      </div>
    </div>
  </div>

  <div class="unp-body">

    <!-- ── LEFT PANEL: USER LIST ── -->
    <div class="unp-sidebar">
      <div class="unp-sidebar-head">
        <span class="unp-sidebar-title">Parents / Users</span>
        <span class="unp-count-badge" *ngIf="!usersLoading">{{ users.length }}</span>
      </div>

      <!-- Search -->
      <div class="unp-search-wrap">
        <input class="unp-search" type="text" placeholder="Search name or email..."
               [(ngModel)]="userSearch" (ngModelChange)="filterUsers()" />
      </div>

      <!-- Loading -->
      <div class="unp-list-loading" *ngIf="usersLoading">
        <div class="unp-spin"></div> Loading...
      </div>

      <!-- User list -->
      <div class="unp-user-list" *ngIf="!usersLoading">
        <button class="unp-user-item"
                *ngFor="let u of filteredUsers"
                [class.unp-user-selected]="selectedUser?.userId === u.userId"
                (click)="selectUser(u)">
          <div class="unp-user-av">{{ initials(u.fullName) }}</div>
          <div class="unp-user-info">
            <span class="unp-user-name">{{ u.fullName }}</span>
            <span class="unp-user-meta">
              {{ u.childCount }} child{{ u.childCount !== 1 ? 'ren' : '' }}
              <ng-container *ngIf="u.email"> · {{ u.email }}</ng-container>
            </span>
          </div>
          <span class="unp-user-arrow">›</span>
        </button>

        <div class="unp-list-empty" *ngIf="filteredUsers.length === 0 && !usersLoading">
          No parents found
        </div>
      </div>
    </div>

    <!-- ── RIGHT PANEL: PREFERENCE MATRIX ── -->
    <div class="unp-main">

      <!-- No selection -->
      <div class="unp-empty-state" *ngIf="!selectedUser">
        <div class="unp-empty-icon">👈</div>
        <p>Select a parent from the left to manage their notification preferences</p>
      </div>

      <!-- Selected user header -->
      <ng-container *ngIf="selectedUser">
        <div class="unp-user-header">
          <div class="unp-user-av unp-user-av-lg">{{ initials(selectedUser.fullName) }}</div>
          <div>
            <div class="unp-sel-name">{{ selectedUser.fullName }}</div>
            <div class="unp-sel-meta">
              <span *ngIf="selectedUser.email">{{ selectedUser.email }}</span>
              <span *ngIf="selectedUser.phoneNumber"> · {{ selectedUser.phoneNumber }}</span>
              <span> · {{ selectedUser.childCount }} child{{ selectedUser.childCount !== 1 ? 'ren' : '' }}</span>
            </div>
          </div>
          <button class="unp-save-all" (click)="saveAll()" [disabled]="prefLoading || saving">
            {{ saving ? 'Saving...' : 'Save All' }}
          </button>
        </div>

        <!-- Loading prefs -->
        <div class="unp-pref-loading" *ngIf="prefLoading">
          <div class="unp-spin"></div> Loading preferences...
        </div>

        <!-- No channels available -->
        <div class="unp-no-channels" *ngIf="!prefLoading && types.length === 0">
          <div class="unp-empty-icon">📡</div>
          <p>No notification channels are active for your club.</p>
          <p style="font-size:0.75rem; color:#64748B;">
            Enable channels in
            <button class="unp-link" (click)="goToClubNotifications()">Club Notification Settings</button>
            first.
          </p>
        </div>

        <!-- Preference matrix -->
        <div class="unp-matrix" *ngIf="!prefLoading && types.length > 0">

          <!-- Legend -->
          <div class="unp-legend">
            <span class="unp-legend-item">
              <span class="unp-dot unp-dot-on"></span> Enabled
            </span>
            <span class="unp-legend-item">
              <span class="unp-dot unp-dot-off"></span> Disabled
            </span>
            <span class="unp-legend-item unp-legend-note">
              ⓘ Only club-active channels are shown
            </span>
          </div>

          <!-- One card per notification type -->
          <div class="unp-type-card" *ngFor="let type of types">
            <div class="unp-type-head">
              <span class="unp-type-icon">{{ getTypeIcon(type.typeCode) }}</span>
              <div class="unp-type-info">
                <span class="unp-type-name">{{ type.typeName }}</span>
                <span class="unp-type-desc">{{ type.description }}</span>
              </div>
              <span class="unp-opt-out-badge" *ngIf="type.parentCanOptOut" title="Parent can toggle this themselves">
                User-controlled
              </span>
            </div>

            <!-- Channel rows -->
            <div class="unp-ch-rows">
              <div class="unp-ch-row"
                   *ngFor="let ch of type.channels"
                   [class.unp-ch-on]="ch.isEnabled"
                   [class.unp-ch-off]="!ch.isEnabled">

                <span class="unp-ch-icon">{{ getChannelIcon(ch.channelCode) }}</span>
                <span class="unp-ch-name">{{ ch.channelName }}</span>

                <div class="unp-spin-sm" *ngIf="ch.saving"></div>

                <!-- Toggle -->
                <label class="unp-toggle-wrap" *ngIf="!ch.saving">
                  <input type="checkbox"
                         class="unp-toggle-input"
                         [checked]="ch.isEnabled"
                         (change)="togglePref(ch, $event)" />
                  <span class="unp-toggle-slider"></span>
                  <span class="unp-toggle-label">{{ ch.isEnabled ? 'On' : 'Off' }}</span>
                </label>

              </div>
            </div>
          </div>

        </div>
      </ng-container>

    </div><!-- /unp-main -->
  </div><!-- /unp-body -->
</div>
  `,
  styles: [`
    /* ── Page ─────────────────────────────────────────────────────────── */
    .unp {
      min-height: 100vh;
      background: var(--bg-app, #0A0F1E);
      color: var(--text-primary, #E2E8F0);
      display: flex;
      flex-direction: column;
    }

    /* ── Header ───────────────────────────────────────────────────────── */
    .unp-header {
      background: var(--gradient-primary, linear-gradient(135deg, #1a3a5c, #0d7377));
      padding: 12px 20px;
      display: flex;
      align-items: center;
      gap: 14px;
      position: sticky;
      top: 0;
      z-index: 10;
      box-shadow: 0 3px 12px rgba(0,0,0,0.35);
    }
    .unp-back {
      background: rgba(255,255,255,0.15);
      color: #fff;
      border: 1px solid rgba(255,255,255,0.3);
      padding: 6px 12px;
      border-radius: 7px;
      cursor: pointer;
      font-size: 0.8rem;
      flex-shrink: 0;
    }
    .unp-back:hover { background: rgba(255,255,255,0.25); }
    .unp-header-title {
      display: flex; align-items: center; gap: 10px;
      h1 { margin: 0; font-size: 1rem; color: #fff; font-weight: 700; }
      p  { margin: 0; font-size: 0.68rem; color: rgba(255,255,255,0.65); }
    }
    .unp-header-icon { font-size: 1.3rem; }

    /* ── Body layout ──────────────────────────────────────────────────── */
    .unp-body {
      flex: 1;
      display: flex;
      height: calc(100vh - 58px);
      overflow: hidden;
    }

    /* ── Sidebar ──────────────────────────────────────────────────────── */
    .unp-sidebar {
      width: 300px;
      min-width: 260px;
      flex-shrink: 0;
      background: var(--bg-panel, #111827);
      border-right: 1px solid var(--bg-border, #1E2D45);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .unp-sidebar-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 16px 8px;
    }
    .unp-sidebar-title { font-size: 0.8rem; font-weight: 700; color: var(--text-secondary, #94A3B8); text-transform: uppercase; letter-spacing: 0.05em; }
    .unp-count-badge {
      background: rgba(0,212,255,0.12); color: var(--accent-primary, #00D4FF);
      padding: 1px 8px; border-radius: 99px; font-size: 0.68rem; font-weight: 700;
    }
    .unp-search-wrap { padding: 0 10px 8px; }
    .unp-search {
      width: 100%; padding: 7px 12px; border-radius: 7px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      color: var(--text-primary, #E2E8F0); font-size: 0.78rem;
      outline: none; box-sizing: border-box;
    }
    .unp-search:focus { border-color: var(--accent-primary, #00D4FF); }
    .unp-user-list { flex: 1; overflow-y: auto; }

    .unp-user-item {
      display: flex; align-items: center; gap: 10px;
      width: 100%; padding: 10px 14px;
      background: transparent; border: none; border-bottom: 1px solid rgba(255,255,255,0.04);
      cursor: pointer; text-align: left; transition: background 0.15s;
    }
    .unp-user-item:hover { background: rgba(255,255,255,0.04); }
    .unp-user-selected { background: rgba(0,212,255,0.08) !important; border-left: 2px solid var(--accent-primary, #00D4FF); }

    .unp-user-av {
      width: 34px; height: 34px; border-radius: 50%;
      background: linear-gradient(135deg, #0d7377, #14a085);
      display: flex; align-items: center; justify-content: center;
      font-size: 0.72rem; font-weight: 700; color: #fff; flex-shrink: 0;
    }
    .unp-user-av-lg { width: 44px; height: 44px; font-size: 0.88rem; }
    .unp-user-info { flex: 1; min-width: 0; }
    .unp-user-name { display: block; font-size: 0.82rem; font-weight: 600; color: var(--text-primary, #E2E8F0); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .unp-user-meta { display: block; font-size: 0.68rem; color: var(--text-secondary, #94A3B8); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .unp-user-arrow { color: #475569; font-size: 1rem; }

    .unp-list-loading, .unp-pref-loading {
      display: flex; align-items: center; gap: 8px; justify-content: center;
      padding: 24px; font-size: 0.78rem; color: var(--text-secondary, #94A3B8);
    }
    .unp-list-empty { padding: 24px; text-align: center; font-size: 0.78rem; color: #475569; }

    /* ── Main ─────────────────────────────────────────────────────────── */
    .unp-main {
      flex: 1; overflow-y: auto;
      padding: 20px 24px 40px;
    }

    /* Empty state */
    .unp-empty-state {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      height: 100%; gap: 12px; color: var(--text-secondary, #94A3B8); text-align: center;
    }
    .unp-empty-icon { font-size: 2.5rem; }
    .unp-no-channels {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 40px; text-align: center; color: var(--text-secondary, #94A3B8);
    }

    /* Selected user header */
    .unp-user-header {
      display: flex; align-items: center; gap: 14px;
      padding: 16px 0 14px;
      border-bottom: 1px solid var(--bg-border, #1E2D45);
      margin-bottom: 20px;
    }
    .unp-sel-name { font-size: 1rem; font-weight: 700; color: var(--text-primary, #E2E8F0); }
    .unp-sel-meta { font-size: 0.72rem; color: var(--text-secondary, #94A3B8); margin-top: 2px; }
    .unp-save-all {
      margin-left: auto; padding: 7px 18px; border-radius: 8px;
      background: var(--accent-primary, #00D4FF); color: #000;
      border: none; cursor: pointer; font-size: 0.78rem; font-weight: 700;
      transition: opacity 0.15s;
    }
    .unp-save-all:disabled { opacity: 0.45; cursor: not-allowed; }
    .unp-save-all:not(:disabled):hover { opacity: 0.85; }

    /* Legend */
    .unp-legend {
      display: flex; align-items: center; gap: 16px;
      margin-bottom: 16px; font-size: 0.72rem; color: var(--text-secondary, #94A3B8);
    }
    .unp-legend-item { display: flex; align-items: center; gap: 5px; }
    .unp-legend-note { margin-left: auto; font-style: italic; }
    .unp-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .unp-dot-on  { background: #4ADE80; }
    .unp-dot-off { background: #475569; }

    /* Matrix */
    .unp-matrix { display: flex; flex-direction: column; gap: 12px; }

    .unp-type-card {
      background: var(--bg-card, #1A2235);
      border: 1px solid var(--bg-border, #1E2D45);
      border-radius: 10px; overflow: hidden;
    }

    .unp-type-head {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px;
      background: rgba(255,255,255,0.025);
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .unp-type-icon { font-size: 1rem; flex-shrink: 0; }
    .unp-type-info { flex: 1; min-width: 0; }
    .unp-type-name { display: block; font-size: 0.84rem; font-weight: 700; color: var(--text-primary, #E2E8F0); }
    .unp-type-desc { display: block; font-size: 0.68rem; color: var(--text-secondary, #94A3B8); }
    .unp-opt-out-badge {
      padding: 2px 8px; border-radius: 99px; font-size: 0.62rem; font-weight: 700;
      background: rgba(168,85,247,0.12); color: #A855F7; border: 1px solid rgba(168,85,247,0.25);
      white-space: nowrap; flex-shrink: 0;
    }

    /* Channel rows */
    .unp-ch-rows { display: flex; flex-direction: column; }
    .unp-ch-row {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 14px 9px 24px;
      border-bottom: 1px solid rgba(255,255,255,0.04);
      transition: background 0.12s;
    }
    .unp-ch-row:last-child { border-bottom: none; }
    .unp-ch-row:hover { background: rgba(255,255,255,0.02); }
    .unp-ch-on  { border-left: 3px solid rgba(74,222,128,0.35); }
    .unp-ch-off { border-left: 3px solid transparent; }

    .unp-ch-icon { font-size: 0.9rem; flex-shrink: 0; }
    .unp-ch-name { flex: 1; font-size: 0.82rem; font-weight: 500; color: var(--text-primary, #E2E8F0); }

    /* Toggle switch */
    .unp-toggle-wrap {
      display: flex; align-items: center; gap: 7px; cursor: pointer; flex-shrink: 0;
    }
    .unp-toggle-input { display: none; }
    .unp-toggle-slider {
      width: 34px; height: 18px; border-radius: 99px;
      background: rgba(255,255,255,0.12);
      position: relative; transition: background 0.2s; flex-shrink: 0;
    }
    .unp-toggle-slider::after {
      content: '';
      position: absolute; top: 2px; left: 2px;
      width: 14px; height: 14px; border-radius: 50%;
      background: #fff; transition: transform 0.2s;
    }
    .unp-toggle-input:checked + .unp-toggle-slider {
      background: rgba(74,222,128,0.6);
    }
    .unp-toggle-input:checked + .unp-toggle-slider::after {
      transform: translateX(16px);
    }
    .unp-toggle-label { font-size: 0.7rem; font-weight: 600; color: var(--text-secondary, #94A3B8); min-width: 20px; }
    .unp-ch-on .unp-toggle-label { color: #4ADE80; }

    /* Spinners */
    .unp-spin, .unp-spin-sm {
      border: 2px solid rgba(255,255,255,0.1);
      border-top-color: var(--accent-primary, #00D4FF);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      flex-shrink: 0;
    }
    .unp-spin    { width: 18px; height: 18px; }
    .unp-spin-sm { width: 14px; height: 14px; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Link button */
    .unp-link {
      background: none; border: none; color: var(--accent-primary, #00D4FF);
      cursor: pointer; font-size: inherit; padding: 0; text-decoration: underline;
    }

    /* Responsive */
    @media (max-width: 700px) {
      .unp-sidebar { width: 220px; min-width: 180px; }
      .unp-main { padding: 14px; }
    }
  `]
})
export class UserNotificationPreferencesComponent implements OnInit {

  // State
  usersLoading = true;
  prefLoading  = false;
  saving       = false;

  users:         ParentUser[] = [];
  filteredUsers: ParentUser[] = [];
  userSearch = '';

  selectedUser: ParentUser | null = null;
  types: PrefType[] = [];

  private readonly api = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private router: Router,
    private toast: ToastService,
    private themeService: ThemeService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    const user = this.authService.currentUserValue;
    if (user?.clubId) {
      this.themeService.loadAndApplyClubTheme(user.clubId).subscribe({
        error: () => this.themeService.loadThemeFromStorage()
      });
    } else {
      this.themeService.loadThemeFromStorage();
    }
    this.loadUsers();
  }

  // ── Load parent users ──────────────────────────────────────────────────────

  loadUsers() {
    this.usersLoading = true;
    this.http.get<any>(`${this.api}/UserNotificationPreferences/users`).subscribe({
      next: (res) => {
        this.users         = res.success ? (res.users || []) : [];
        this.filteredUsers = [...this.users];
        this.usersLoading  = false;
      },
      error: () => {
        this.toast.showError('Could not load users');
        this.usersLoading = false;
      }
    });
  }

  filterUsers() {
    const q = this.userSearch.toLowerCase().trim();
    this.filteredUsers = q
      ? this.users.filter(u =>
          u.fullName.toLowerCase().includes(q) ||
          (u.email?.toLowerCase().includes(q))
        )
      : [...this.users];
  }

  // ── Select user → load prefs ───────────────────────────────────────────────

  selectUser(u: ParentUser) {
    this.selectedUser = u;
    this.loadPreferences(u.userId);
  }

  loadPreferences(userId: number) {
    this.prefLoading = true;
    this.types = [];
    this.http.get<any>(`${this.api}/UserNotificationPreferences?userId=${userId}`).subscribe({
      next: (res) => {
        this.types = res.success ? this.groupByType(res.preferences || []) : [];
        this.prefLoading = false;
      },
      error: () => {
        this.toast.showError('Could not load preferences');
        this.prefLoading = false;
      }
    });
  }

  private groupByType(rows: PrefRow[]): PrefType[] {
    const map = new Map<number, PrefType>();
    for (const row of rows) {
      if (!map.has(row.typeId)) {
        map.set(row.typeId, {
          typeId: row.typeId, typeCode: row.typeCode,
          typeName: row.typeName, description: row.description,
          parentCanOptOut: row.parentCanOptOut, channels: []
        });
      }
      map.get(row.typeId)!.channels.push({ ...row, saving: false });
    }
    return Array.from(map.values());
  }

  // ── Toggle a single pref (auto-save) ──────────────────────────────────────

  togglePref(ch: PrefRow, event: Event) {
    if (!this.selectedUser) return;
    const newVal = (event.target as HTMLInputElement).checked;
    ch.isEnabled = newVal;
    ch.saving    = true;

    this.http.put<any>(`${this.api}/UserNotificationPreferences`, {
      userId:    this.selectedUser.userId,
      typeId:    ch.typeId,
      channelId: ch.channelId,
      isEnabled: newVal
    }).subscribe({
      next: (res) => {
        ch.saving = false;
        if (!res.success) {
          ch.isEnabled = !newVal;  // revert
          this.toast.showError('Failed to save');
        }
      },
      error: () => {
        ch.saving    = false;
        ch.isEnabled = !newVal;  // revert
        this.toast.showError('Could not save preference');
      }
    });
  }

  // ── Save all (bulk) ────────────────────────────────────────────────────────

  saveAll() {
    if (!this.selectedUser) return;
    this.saving = true;

    const prefs = this.types.flatMap(t =>
      t.channels.map(ch => ({
        typeId:    ch.typeId,
        channelId: ch.channelId,
        isEnabled: ch.isEnabled
      }))
    );

    this.http.put<any>(`${this.api}/UserNotificationPreferences/bulk`, {
      userId: this.selectedUser.userId,
      preferences: prefs
    }).subscribe({
      next: (res) => {
        this.saving = false;
        if (res.success) {
          this.toast.showSuccess(`Preferences saved for ${this.selectedUser!.fullName}`);
        } else {
          this.toast.showError('Save failed');
        }
      },
      error: () => {
        this.saving = false;
        this.toast.showError('Could not save preferences');
      }
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  initials(name: string): string {
    return name.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
  }

  getTypeIcon(code: string): string {
    return ({
      attendance_marked: '✅', invoice_created: '🧾',
      payment_received: '💳', club_announcement: '📢', event_reminder: '⏰'
    } as any)[code] ?? '🔔';
  }

  getChannelIcon(code: string): string {
    return ({ push: '📱', whatsapp: '💬', sms: '✉️', email: '📧' } as any)[code] ?? '📡';
  }

  goBack()               { this.router.navigate(['/dashboard']); }
  goToClubNotifications(){ this.router.navigate(['/club/notifications']); }
}
