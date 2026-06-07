import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { SidebarNavigationComponent } from '../../shared/components/sidebar-navigation/sidebar-navigation.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SidebarStateService } from '../../core/services/sidebar-state.service';
import { ToastService } from '../../core/services/toast.service';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';

interface ActiveChannel {
  channelId: number;
  channelCode: string;
  channelName: string;
  isActive: boolean;
  whatsAppProvider?: string | null;
  saving?: boolean;
}

interface NotificationSetting {
  typeId: number;
  typeCode: string;
  typeName: string;
  description: string;
  channelId: number;
  channelCode: string;
  channelName: string;
  isEnabled: boolean;
  saving?: boolean;
}

interface NotificationType {
  typeId: number;
  typeCode: string;
  typeName: string;
  description: string;
  channels: NotificationSetting[];
}

@Component({
  selector: 'app-club-notification-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarNavigationComponent, PageHeaderComponent],
  template: `
    <div class="np page-with-sidebar">

      <div class="page-header-row">
        <app-page-header
          pageIcon="ti-bell"
          pageTitle="Notification Settings"
          pageSubtitle="Configure which notifications your club sends">
        </app-page-header>
      </div>
      <div class="page-body-row">
        <app-sidebar-navigation></app-sidebar-navigation>
        <div class="page-content">

      <!-- Loading -->
      <div class="np-loading" *ngIf="loading">
        <div class="np-spinner"></div>
        <span>Loading...</span>
      </div>

      <div class="np-body" *ngIf="!loading">

        <!-- ── SECTION 1: CHANNELS (read-only) ─────────────────── -->
        <div class="np-card">
          <div class="np-card-head">
            <span class="np-card-icon">📡</span>
            <div>
              <span class="np-card-title">Active Channels</span>
              <span class="np-card-sub">Managed by your master admin</span>
            </div>
          </div>

          <div class="np-rows">
            <div class="np-row" *ngFor="let ch of activeChannels"
                 [class.np-row-on]="ch.isActive"
                 [class.np-row-off]="!ch.isActive">

              <!-- Icon + Name + Desc -->
              <span class="np-row-icon">{{ getChannelIcon(ch.channelCode) }}</span>
              <div class="np-row-info">
                <span class="np-row-name">{{ ch.channelName }}</span>
                <span class="np-row-desc">{{ getChannelDesc(ch.channelCode) }}</span>
              </div>

              <!-- WhatsApp provider badge -->
              <span class="np-wa-badge"
                    *ngIf="ch.channelCode === 'whatsapp' && ch.whatsAppProvider">
                {{ ch.whatsAppProvider === 'twilio' ? '📡 Twilio' : '💬 Direct' }}
              </span>

              <!-- WhatsApp: read-only status + hint -->
              <ng-container *ngIf="ch.channelCode === 'whatsapp'">
                <span class="np-status" [class.np-status-on]="ch.isActive" [class.np-status-off]="!ch.isActive">
                  {{ ch.isActive ? '✓ Active' : '✕ Off' }}
                </span>
                <span class="np-wa-admin-note" *ngIf="!ch.isActive">Contact master admin to enable</span>
              </ng-container>

              <!-- Other channels: toggleable by club admin -->
              <ng-container *ngIf="ch.channelCode !== 'whatsapp'">
                <div class="np-mini-spin" *ngIf="ch.saving"></div>
                <button class="np-toggle"
                        *ngIf="!ch.saving"
                        [class.np-tog-on]="ch.isActive"
                        [class.np-tog-off]="!ch.isActive"
                        (click)="toggleChannel(ch)">
                  {{ ch.isActive ? 'ON' : 'OFF' }}
                </button>
              </ng-container>

            </div>
          </div>
        </div>

        <!-- ── SECTION 2: NOTIFICATION TYPES ──────────────────── -->
        <div class="np-card">
          <div class="np-card-head">
            <span class="np-card-icon">🎛️</span>
            <div>
              <span class="np-card-title">Notification Types</span>
              <span class="np-card-sub">Toggle which events send notifications per channel</span>
            </div>
          </div>

          <div *ngFor="let type of types" class="np-type-group">

            <!-- Type heading row -->
            <div class="np-type-head">
              <span class="np-type-icon">{{ getTypeIcon(type.typeCode) }}</span>
              <div class="np-type-info">
                <span class="np-type-name">{{ type.typeName }}</span>
                <span class="np-type-desc">{{ type.description }}</span>
              </div>
            </div>

            <!-- One row per channel -->
            <div class="np-row np-ch-row"
                 *ngFor="let ch of type.channels"
                 [class.np-row-on]="ch.isEnabled && isChannelActive(ch.channelCode)"
                 [class.np-row-off]="!ch.isEnabled || !isChannelActive(ch.channelCode)"
                 [class.np-ch-disabled]="!isChannelActive(ch.channelCode)">

              <span class="np-row-icon np-row-icon-sm">{{ getChannelIcon(ch.channelCode) }}</span>
              <div class="np-row-info">
                <span class="np-row-name">{{ ch.channelName }}</span>
                <span class="np-ch-off-label" *ngIf="!isChannelActive(ch.channelCode)">Channel inactive</span>
              </div>

              <!-- Spinner while saving -->
              <div class="np-mini-spin" *ngIf="ch.saving"></div>

              <!-- Toggle -->
              <button class="np-toggle"
                      *ngIf="!ch.saving"
                      [class.np-tog-on]="ch.isEnabled && isChannelActive(ch.channelCode)"
                      [class.np-tog-off]="!ch.isEnabled || !isChannelActive(ch.channelCode)"
                      [disabled]="!isChannelActive(ch.channelCode) || isComingSoon(ch.channelCode)"
                      (click)="toggleType(ch)">
                {{ ch.isEnabled && isChannelActive(ch.channelCode) ? 'ON' : 'OFF' }}
              </button>

            </div>
          </div>

          <div class="np-empty" *ngIf="types.length === 0">
            No notification types found.
          </div>
        </div>

      </div><!-- /.np-body -->
        </div><!-- /.page-content -->
      </div><!-- /.page-body-row -->
    </div><!-- /.np -->
  `,
  styles: [`
    /* ── Page ─────────────────────────────────────────────────── */
    .np {
      min-height: 100vh;
      background: var(--bg-app, #0A0F1E);
      color: var(--text-primary, #E2E8F0);
    }

    /* ── Header ───────────────────────────────────────────────── */
    .np-header {
      background: var(--gradient-primary, linear-gradient(135deg, #0B5345, #17A589));
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      position: sticky;
      top: 0;
      z-index: 10;
      box-shadow: 0 3px 10px rgba(0,0,0,0.3);
    }
    .np-back {
      background: rgba(255,255,255,0.15);
      color: white;
      border: 1px solid rgba(255,255,255,0.3);
      padding: 6px 12px;
      border-radius: 7px;
      cursor: pointer;
      font-size: 0.8rem;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .np-back:hover { background: rgba(255,255,255,0.25); }
    .np-header-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1.2rem;
      h1 { margin: 0; font-size: 1rem; color: white; font-weight: 700; }
      p  { margin: 0; font-size: 0.68rem; color: rgba(255,255,255,0.7); }
    }
    .np-user-pref-btn {
      margin-left: auto;
      background: rgba(255,255,255,0.15);
      color: white;
      border: 1px solid rgba(255,255,255,0.3);
      padding: 6px 14px;
      border-radius: 7px;
      cursor: pointer;
      font-size: 0.78rem;
      font-weight: 600;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .np-user-pref-btn:hover { background: rgba(255,255,255,0.25); }

    /* ── Loading ──────────────────────────────────────────────── */
    .np-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 48px;
      color: var(--text-secondary, #94A3B8);
      font-size: 0.875rem;
    }
    .np-spinner {
      width: 24px; height: 24px;
      border: 2px solid rgba(255,255,255,0.1);
      border-top-color: var(--accent-primary, #00D4FF);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Body ─────────────────────────────────────────────────── */
    .np-body {
      max-width: 680px;
      margin: 0 auto;
      padding: 16px 12px 40px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* ── Cards ─────────────────────────────────────────────────── */
    .np-card {
      background: var(--bg-card, #1A2235);
      border: 1px solid var(--bg-border, #1E2D45);
      border-radius: 12px;
      overflow: hidden;
    }

    .np-card-head {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background: var(--bg-panel, #111827);
      border-bottom: 1px solid var(--bg-border, #1E2D45);
    }
    .np-card-icon { font-size: 1.2rem; }
    .np-card-title {
      display: block;
      font-size: 0.88rem;
      font-weight: 700;
      color: var(--text-primary, #E2E8F0);
    }
    .np-card-sub {
      display: block;
      font-size: 0.7rem;
      color: var(--text-secondary, #94A3B8);
      margin-top: 1px;
    }

    /* ── Rows (single-line) ────────────────────────────────────── */
    .np-rows { display: flex; flex-direction: column; }

    .np-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.04);
      transition: background 0.15s;
      min-height: 44px;
    }
    .np-row:last-child { border-bottom: none; }
    .np-row:hover { background: rgba(255,255,255,0.02); }

    .np-row-on  { /* subtle green left accent */ border-left: 2px solid rgba(74,222,128,0.3); }
    .np-row-off { border-left: 2px solid transparent; }

    .np-row-icon    { font-size: 1.1rem; flex-shrink: 0; }
    .np-row-icon-sm { font-size: 0.95rem; flex-shrink: 0; }

    .np-row-info {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: baseline;
      gap: 8px;
      flex-wrap: wrap;
    }
    .np-row-name {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-primary, #E2E8F0);
      white-space: nowrap;
    }
    .np-row-desc {
      font-size: 0.7rem;
      color: var(--text-secondary, #94A3B8);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* WhatsApp provider badge */
    .np-wa-badge {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 99px;
      background: rgba(74,222,128,0.1);
      color: #4ADE80;
      border: 1px solid rgba(74,222,128,0.25);
      white-space: nowrap;
      flex-shrink: 0;
    }

    /* Status badge (channels — read-only) */
    .np-status {
      font-size: 0.68rem;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 99px;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .np-status-on  { background: rgba(74,222,128,0.12); color: #4ADE80; }
    .np-status-off { background: rgba(148,163,184,0.1); color: #94A3B8; }

    .np-wa-admin-note {
      font-size: 0.62rem; color: #64748B; font-style: italic;
      white-space: nowrap; flex-shrink: 0;
    }

    /* ── Type groups ───────────────────────────────────────────── */
    .np-type-group {
      border-bottom: 1px solid var(--bg-border, #1E2D45);
    }
    .np-type-group:last-child { border-bottom: none; }

    .np-type-head {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px 6px;
      background: rgba(255,255,255,0.012);
    }
    .np-type-icon { font-size: 1rem; flex-shrink: 0; }
    .np-type-info { display: flex; flex-direction: column; }
    .np-type-name {
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--text-primary, #E2E8F0);
    }
    .np-type-desc {
      font-size: 0.68rem;
      color: var(--text-secondary, #94A3B8);
    }

    /* Channel rows inside type group */
    .np-ch-row {
      padding-left: 36px; /* indent under type heading */
    }
    .np-ch-disabled { opacity: 0.4; }

    .np-ch-off-label {
      font-size: 0.62rem;
      font-weight: 600;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    /* ── Toggle button ─────────────────────────────────────────── */
    .np-toggle {
      flex-shrink: 0;
      padding: 4px 12px;
      border-radius: 99px;
      border: 1.5px solid transparent;
      cursor: pointer;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      transition: all 0.18s;
    }
    .np-toggle:disabled { opacity: 0.3; cursor: not-allowed; }
    .np-tog-on  { background: rgba(74,222,128,0.12); border-color: rgba(74,222,128,0.4); color: #4ADE80; }
    .np-tog-off { background: rgba(148,163,184,0.07); border-color: rgba(148,163,184,0.2); color: #64748B; }
    .np-tog-on:hover:not(:disabled)  { background: rgba(74,222,128,0.22); }
    .np-tog-off:hover:not(:disabled) { background: rgba(148,163,184,0.15); }

    /* ── Mini spinner ──────────────────────────────────────────── */
    .np-mini-spin {
      width: 16px; height: 16px;
      border: 2px solid rgba(255,255,255,0.1);
      border-top-color: var(--accent-primary, #00D4FF);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      flex-shrink: 0;
    }

    /* ── Empty state ───────────────────────────────────────────── */
    .np-empty {
      padding: 24px;
      text-align: center;
      color: var(--text-secondary, #94A3B8);
      font-size: 0.82rem;
    }
  `]
})
export class ClubNotificationSettingsComponent implements OnInit {

  loading = true;
  isSidebarOpen = false;
  activeChannels: ActiveChannel[] = [];
  types: NotificationType[] = [];

  private readonly api = environment.apiUrl;
  private readonly comingSoon = ['sms', 'email'];

  constructor(
    private http: HttpClient,
    private router: Router,
    private toast: ToastService,
    private themeService: ThemeService,
    private authService: AuthService,
    public  sidebarState: SidebarStateService
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
    this.loadAll();
  }

  loadAll() {
    this.loading = true;
    let done = 0;
    const check = () => { if (++done === 2) this.loading = false; };

    this.http.get<any>(`${this.api}/ClubActiveChannels`).subscribe({
      next: (res) => {
        this.activeChannels = (res.channels || []).map((c: ActiveChannel) => ({ ...c, saving: false }));
        check();
      },
      error: () => check()
    });

    this.http.get<any>(`${this.api}/ClubNotificationSettings`).subscribe({
      next: (res) => {
        this.types = res.success ? this.groupByType(res.settings) : [];
        check();
      },
      error: () => check()
    });
  }

  private groupByType(rows: NotificationSetting[]): NotificationType[] {
    const map = new Map<number, NotificationType>();
    for (const row of rows) {
      if (!map.has(row.typeId)) {
        map.set(row.typeId, {
          typeId: row.typeId, typeCode: row.typeCode,
          typeName: row.typeName, description: row.description, channels: []
        });
      }
      map.get(row.typeId)!.channels.push({ ...row, saving: false });
    }
    return Array.from(map.values());
  }

  toggleChannel(ch: ActiveChannel) {
    if (ch.saving) return;
    const newVal = !ch.isActive;
    ch.saving = true;
    const myClubId = this.authService.currentUserValue?.clubId;
    this.http.put<any>(`${this.api}/ClubActiveChannels`, {
      clubId: myClubId, channelId: ch.channelId, isActive: newVal
    }).subscribe({
      next: res => {
        ch.saving = false;
        if (res.success) {
          ch.isActive = newVal;
          this.toast.showSuccess(`${ch.channelName} ${newVal ? 'enabled' : 'disabled'}`);
        } else {
          this.toast.showError(res.message || 'Failed to update channel');
        }
      },
      error: err => {
        ch.saving = false;
        this.toast.showError(err?.error?.message || 'Could not update channel');
      }
    });
  }

  toggleType(ch: NotificationSetting) {
    if (ch.saving || !this.isChannelActive(ch.channelCode) || this.isComingSoon(ch.channelCode)) return;
    const newVal = !ch.isEnabled;
    ch.saving = true;
    this.http.put<any>(`${this.api}/ClubNotificationSettings`, {
      typeId: ch.typeId, channelId: ch.channelId, isEnabled: newVal
    }).subscribe({
      next: (res) => {
        ch.saving = false;
        if (res.success) {
          ch.isEnabled = newVal;
          this.toast.showSuccess(`${ch.channelName} ${newVal ? 'enabled' : 'disabled'} for ${ch.typeName}`);
        } else {
          this.toast.showError('Failed to save');
        }
      },
      error: () => { ch.saving = false; this.toast.showError('Could not save'); }
    });
  }

  isChannelActive(code: string) {
    return this.activeChannels.find(c => c.channelCode === code)?.isActive ?? false;
  }

  isComingSoon(code: string) { return this.comingSoon.includes(code); }

  goBack() { this.router.navigate(['/dashboard']); }
  goToUserPreferences() { this.router.navigate(['/club/notifications/user-preferences']); }

  getChannelIcon(code: string): string {
    return ({ push: '📱', whatsapp: '💬', sms: '✉️', email: '📧' } as any)[code] ?? '📡';
  }

  getChannelDesc(code: string): string {
    return ({
      push:     'Browser & mobile push',
      whatsapp: 'WhatsApp messages',
      sms:      'SMS text messages',
      email:    'Email notifications'
    } as any)[code] ?? '';
  }

  getTypeIcon(code: string): string {
    return ({
      attendance_marked: '✅', invoice_created: '🧾',
      payment_received: '💳', club_announcement: '📢', event_reminder: '⏰'
    } as any)[code] ?? '🔔';
  }
}
