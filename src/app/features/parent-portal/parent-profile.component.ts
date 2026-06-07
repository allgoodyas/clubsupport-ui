import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { ToastService } from '../../shared/services/toast.service';
import { environment } from '../../../environments/environment';

interface ParentProfile {
  userId: number;
  fullName: string;
  mobileNumber: string;
  email?: string;
}

interface ChildName {
  studentId: number;
  studentName: string;
  editingName: string;
  saving: boolean;
  editing: boolean;
}

type ActiveTab = 'profile' | 'password' | 'children';

@Component({
  selector: 'app-parent-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="pp-page">

  <!-- ── HEADER ── -->
  <div class="pp-header">
    <button class="pp-back" (click)="goBack()">← Back</button>
    <div class="pp-header-title">
      <div class="pp-header-av">{{ initials(profile?.fullName) }}</div>
      <div>
        <h1>My Profile</h1>
        <p>{{ profile?.mobileNumber }}</p>
      </div>
    </div>
  </div>

  <!-- ── Loading ── -->
  <div class="pp-loading" *ngIf="loading">
    <div class="pp-spin"></div> Loading...
  </div>

  <!-- ── CONTENT ── -->
  <div class="pp-body" *ngIf="!loading && profile">

    <!-- ── TAB BAR ── -->
    <div class="pp-tabs">
      <button class="pp-tab" [class.active]="tab === 'profile'"  (click)="tab='profile'">
        👤 Profile
      </button>
      <button class="pp-tab" [class.active]="tab === 'password'" (click)="tab='password'">
        🔒 Password
      </button>
      <button class="pp-tab" [class.active]="tab === 'children'" (click)="tab='children'">
        👨‍👩‍👧‍👦 Children
      </button>
    </div>

    <!-- ══════════════════════════════════════
         TAB 1 — Profile (name + email)
    ══════════════════════════════════════ -->
    <div class="pp-card" *ngIf="tab === 'profile'">
      <div class="pp-card-head">
        <span class="pp-card-icon">👤</span>
        <span class="pp-card-title">Personal Information</span>
      </div>

      <div class="pp-fields">

        <!-- Mobile — read-only -->
        <div class="pp-field">
          <label class="pp-label">Mobile Number</label>
          <div class="pp-readonly">{{ profile.mobileNumber }}</div>
          <p class="pp-hint">Contact your club admin to change your mobile number.</p>
        </div>

        <!-- Full Name -->
        <div class="pp-field">
          <label class="pp-label">Full Name <span class="pp-req">*</span></label>
          <input class="pp-input" type="text" [(ngModel)]="editName"
                 placeholder="Your full name" maxlength="100" />
        </div>

        <!-- Email -->
        <div class="pp-field">
          <label class="pp-label">Email <span class="pp-opt">(optional)</span></label>
          <input class="pp-input" type="email" [(ngModel)]="editEmail"
                 placeholder="your@email.com" maxlength="150" />
        </div>

      </div>

      <button class="pp-btn-save" (click)="saveProfile()" [disabled]="savingProfile">
        {{ savingProfile ? 'Saving...' : 'Save Changes' }}
      </button>
    </div>

    <!-- ══════════════════════════════════════
         TAB 2 — Change Password
    ══════════════════════════════════════ -->
    <div class="pp-card" *ngIf="tab === 'password'">
      <div class="pp-card-head">
        <span class="pp-card-icon">🔒</span>
        <span class="pp-card-title">Change Password</span>
      </div>

      <div class="pp-fields">

        <div class="pp-field">
          <label class="pp-label">Current Password <span class="pp-req">*</span></label>
          <div class="pp-pw-wrap">
            <input class="pp-input" [type]="showCurrent ? 'text' : 'password'"
                   [(ngModel)]="currentPassword" placeholder="Enter current password" />
            <button class="pp-eye" type="button" (click)="showCurrent = !showCurrent">
              {{ showCurrent ? '🙈' : '👁️' }}
            </button>
          </div>
        </div>

        <div class="pp-field">
          <label class="pp-label">New Password <span class="pp-req">*</span></label>
          <div class="pp-pw-wrap">
            <input class="pp-input" [type]="showNew ? 'text' : 'password'"
                   [(ngModel)]="newPassword" placeholder="At least 6 characters" />
            <button class="pp-eye" type="button" (click)="showNew = !showNew">
              {{ showNew ? '🙈' : '👁️' }}
            </button>
          </div>
          <!-- Strength bar -->
          <div class="pp-strength-bar" *ngIf="newPassword">
            <div class="pp-strength-fill"
                 [style.width.%]="passwordStrength * 25"
                 [class]="'str-' + passwordStrength"></div>
          </div>
          <p class="pp-strength-label" *ngIf="newPassword">
            Strength: {{ ['', 'Weak', 'Fair', 'Good', 'Strong'][passwordStrength] }}
          </p>
        </div>

        <div class="pp-field">
          <label class="pp-label">Confirm New Password <span class="pp-req">*</span></label>
          <div class="pp-pw-wrap">
            <input class="pp-input" [type]="showConfirm ? 'text' : 'password'"
                   [(ngModel)]="confirmPassword" placeholder="Repeat new password" />
            <button class="pp-eye" type="button" (click)="showConfirm = !showConfirm">
              {{ showConfirm ? '🙈' : '👁️' }}
            </button>
          </div>
          <p class="pp-match-err" *ngIf="confirmPassword && newPassword !== confirmPassword">
            ⚠️ Passwords do not match
          </p>
          <p class="pp-match-ok"  *ngIf="confirmPassword && newPassword === confirmPassword && confirmPassword.length > 0">
            ✅ Passwords match
          </p>
        </div>

      </div>

      <button class="pp-btn-save" (click)="changePassword()"
              [disabled]="savingPassword || !canChangePassword">
        {{ savingPassword ? 'Changing...' : 'Change Password' }}
      </button>
    </div>

    <!-- ══════════════════════════════════════
         TAB 3 — Children Names
    ══════════════════════════════════════ -->
    <div class="pp-card" *ngIf="tab === 'children'">
      <div class="pp-card-head">
        <span class="pp-card-icon">👨‍👩‍👧‍👦</span>
        <span class="pp-card-title">Children Names</span>
      </div>

      <div class="pp-children-loading" *ngIf="childrenLoading">
        <div class="pp-spin"></div> Loading children...
      </div>

      <div class="pp-children-list" *ngIf="!childrenLoading">

        <div class="pp-child-row" *ngFor="let child of children">

          <!-- View mode -->
          <ng-container *ngIf="!child.editing">
            <div class="pp-child-av">{{ initials(child.studentName) }}</div>
            <span class="pp-child-name">{{ child.studentName }}</span>
            <button class="pp-btn-edit" (click)="startEditChild(child)">✏️ Edit</button>
          </ng-container>

          <!-- Edit mode -->
          <ng-container *ngIf="child.editing">
            <div class="pp-child-av editing">{{ initials(child.editingName) }}</div>
            <input class="pp-input pp-child-input" type="text"
                   [(ngModel)]="child.editingName"
                   maxlength="100"
                   (keydown.enter)="saveChildName(child)"
                   (keydown.escape)="cancelEditChild(child)" />
            <button class="pp-btn-save-sm" (click)="saveChildName(child)"
                    [disabled]="child.saving || !child.editingName.trim()">
              {{ child.saving ? '...' : '✔' }}
            </button>
            <button class="pp-btn-cancel-sm" (click)="cancelEditChild(child)"
                    [disabled]="child.saving">
              ✕
            </button>
          </ng-container>

        </div>

        <div class="pp-no-children" *ngIf="children.length === 0">
          No children found.
        </div>

      </div>
    </div>

  </div><!-- /pp-body -->
</div>
  `,
  styles: [`
    /* ── Page ─────────────────────────────────────────────────── */
    .pp-page {
      min-height: 100vh;
      background: var(--bg-app, #0A0F1E);
      color: var(--text-primary, #E2E8F0);
    }

    /* ── Header ───────────────────────────────────────────────── */
    .pp-header {
      background: var(--gradient-primary, linear-gradient(135deg, #0B5345, #17A589));
      padding: 12px 16px;
      display: flex; align-items: center; gap: 12px;
      position: sticky; top: 0; z-index: 10;
      box-shadow: 0 3px 10px rgba(0,0,0,0.3);
    }
    .pp-back {
      background: rgba(255,255,255,0.15); color: #fff;
      border: 1px solid rgba(255,255,255,0.3);
      padding: 6px 12px; border-radius: 7px;
      cursor: pointer; font-size: 0.8rem; flex-shrink: 0;
    }
    .pp-back:hover { background: rgba(255,255,255,0.25); }
    .pp-header-title {
      display: flex; align-items: center; gap: 10px;
      h1 { margin: 0; font-size: 1rem; color: #fff; font-weight: 700; }
      p  { margin: 0; font-size: 0.7rem; color: rgba(255,255,255,0.7); }
    }
    .pp-header-av {
      width: 38px; height: 38px; border-radius: 50%;
      background: rgba(255,255,255,0.25);
      display: flex; align-items: center; justify-content: center;
      font-size: 0.85rem; font-weight: 700; color: #fff; flex-shrink: 0;
    }

    /* ── Loading ──────────────────────────────────────────────── */
    .pp-loading, .pp-children-loading {
      display: flex; align-items: center; justify-content: center;
      gap: 10px; padding: 48px;
      font-size: 0.85rem; color: var(--text-secondary, #94A3B8);
    }
    .pp-spin {
      width: 20px; height: 20px;
      border: 2px solid rgba(255,255,255,0.1);
      border-top-color: var(--accent-primary, #00D4FF);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Body ─────────────────────────────────────────────────── */
    .pp-body {
      max-width: 520px;
      margin: 0 auto;
      padding: 16px 14px 48px;
    }

    /* ── Tabs ─────────────────────────────────────────────────── */
    .pp-tabs {
      display: flex; gap: 6px; margin-bottom: 16px;
    }
    .pp-tab {
      flex: 1; padding: 9px 6px;
      background: var(--bg-card, #1A2235);
      border: 1px solid var(--bg-border, #1E2D45);
      border-radius: 8px; cursor: pointer;
      font-size: 0.75rem; font-weight: 600;
      color: var(--text-secondary, #94A3B8);
      transition: all 0.15s;
    }
    .pp-tab.active {
      background: rgba(0,212,255,0.12);
      border-color: rgba(0,212,255,0.35);
      color: var(--accent-primary, #00D4FF);
    }

    /* ── Card ─────────────────────────────────────────────────── */
    .pp-card {
      background: var(--bg-card, #1A2235);
      border: 1px solid var(--bg-border, #1E2D45);
      border-radius: 12px; overflow: hidden;
    }
    .pp-card-head {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 16px;
      background: rgba(255,255,255,0.025);
      border-bottom: 1px solid var(--bg-border, #1E2D45);
    }
    .pp-card-icon { font-size: 1rem; }
    .pp-card-title { font-size: 0.88rem; font-weight: 700; color: var(--text-primary, #E2E8F0); }

    /* ── Fields ───────────────────────────────────────────────── */
    .pp-fields {
      padding: 16px;
      display: flex; flex-direction: column; gap: 16px;
    }
    .pp-field { display: flex; flex-direction: column; gap: 5px; }
    .pp-label {
      font-size: 0.78rem; font-weight: 600;
      color: var(--text-secondary, #94A3B8);
    }
    .pp-req  { color: #FF4757; }
    .pp-opt  { font-weight: 400; font-size: 0.7rem; color: #64748B; }
    .pp-hint { font-size: 0.68rem; color: #475569; margin: 0; }

    .pp-readonly {
      padding: 9px 12px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 8px; font-size: 0.85rem;
      color: var(--text-secondary, #94A3B8);
    }

    .pp-input {
      padding: 9px 12px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 8px; font-size: 0.85rem;
      color: var(--text-primary, #E2E8F0);
      outline: none; transition: border-color 0.15s;
    }
    .pp-input:focus { border-color: var(--accent-primary, #00D4FF); }

    /* ── Password ─────────────────────────────────────────────── */
    .pp-pw-wrap { position: relative; display: flex; }
    .pp-pw-wrap .pp-input { flex: 1; padding-right: 40px; }
    .pp-eye {
      position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
      background: none; border: none; cursor: pointer;
      font-size: 1rem; color: var(--text-secondary, #94A3B8);
    }

    /* Strength bar */
    .pp-strength-bar {
      height: 4px; background: rgba(255,255,255,0.08);
      border-radius: 99px; overflow: hidden; margin-top: 4px;
    }
    .pp-strength-fill {
      height: 100%; border-radius: 99px; transition: width 0.3s, background 0.3s;
    }
    .str-1 { background: #FF4757; }
    .str-2 { background: #FF8C42; }
    .str-3 { background: #FFD700; }
    .str-4 { background: #4ADE80; }
    .pp-strength-label { font-size: 0.68rem; color: var(--text-secondary, #94A3B8); margin: 2px 0 0; }

    .pp-match-err { font-size: 0.72rem; color: #FF4757; margin: 2px 0 0; }
    .pp-match-ok  { font-size: 0.72rem; color: #4ADE80; margin: 2px 0 0; }

    /* ── Save button ──────────────────────────────────────────── */
    .pp-btn-save {
      display: block; width: calc(100% - 32px);
      margin: 4px 16px 16px;
      padding: 10px; border-radius: 8px;
      background: var(--accent-primary, #00D4FF); color: #000;
      border: none; cursor: pointer;
      font-size: 0.85rem; font-weight: 700; transition: opacity 0.15s;
    }
    .pp-btn-save:disabled { opacity: 0.4; cursor: not-allowed; }
    .pp-btn-save:not(:disabled):hover { opacity: 0.85; }

    /* ── Children list ────────────────────────────────────────── */
    .pp-children-list {
      display: flex; flex-direction: column;
      padding: 8px 0;
    }
    .pp-child-row {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.04);
    }
    .pp-child-row:last-child { border-bottom: none; }

    .pp-child-av {
      width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, #0d7377, #14a085);
      display: flex; align-items: center; justify-content: center;
      font-size: 0.72rem; font-weight: 700; color: #fff;
      transition: background 0.2s;
    }
    .pp-child-av.editing { background: linear-gradient(135deg, #1e40af, #2563eb); }

    .pp-child-name {
      flex: 1; font-size: 0.88rem; font-weight: 600;
      color: var(--text-primary, #E2E8F0);
    }

    .pp-child-input { flex: 1; margin: 0; padding: 6px 10px; font-size: 0.85rem; }

    .pp-btn-edit {
      padding: 5px 12px; border-radius: 6px; flex-shrink: 0;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.12);
      color: var(--text-secondary, #94A3B8);
      cursor: pointer; font-size: 0.75rem;
    }
    .pp-btn-edit:hover { background: rgba(255,255,255,0.12); }

    .pp-btn-save-sm {
      width: 32px; height: 32px; border-radius: 6px; flex-shrink: 0;
      background: rgba(74,222,128,0.15); border: 1px solid rgba(74,222,128,0.3);
      color: #4ADE80; cursor: pointer; font-size: 0.9rem;
    }
    .pp-btn-save-sm:disabled { opacity: 0.4; cursor: not-allowed; }

    .pp-btn-cancel-sm {
      width: 32px; height: 32px; border-radius: 6px; flex-shrink: 0;
      background: rgba(255,71,87,0.12); border: 1px solid rgba(255,71,87,0.25);
      color: #FF4757; cursor: pointer; font-size: 0.85rem;
    }

    .pp-no-children {
      padding: 24px; text-align: center;
      color: var(--text-secondary, #94A3B8); font-size: 0.82rem;
    }
  `]
})
export class ParentProfileComponent implements OnInit {

  tab: ActiveTab = 'profile';
  loading = true;

  // Profile
  profile: ParentProfile | null = null;
  editName  = '';
  editEmail = '';
  savingProfile = false;

  // Password
  currentPassword = '';
  newPassword     = '';
  confirmPassword = '';
  showCurrent = false;
  showNew     = false;
  showConfirm = false;
  savingPassword  = false;

  // Children
  children: ChildName[] = [];
  childrenLoading = false;

  private readonly api = environment.apiUrl;

  constructor(
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    private themeService: ThemeService,
    private toast: ToastService
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
    this.loadProfile();
    this.loadChildren();
  }

  // ── Profile ────────────────────────────────────────────────────────────────

  loadProfile() {
    this.loading = true;
    this.http.get<any>(`${this.api}/ParentDashboard/profile`).subscribe({
      next: res => {
        this.loading = false;
        if (res.success) {
          this.profile   = res.profile;
          this.editName  = res.profile.fullName;
          this.editEmail = res.profile.email || '';
        }
      },
      error: () => {
        this.loading = false;
        this.toast.showError('Could not load profile');
      }
    });
  }

  saveProfile() {
    if (!this.editName.trim()) { this.toast.showError('Name is required'); return; }
    this.savingProfile = true;
    this.http.put<any>(`${this.api}/ParentDashboard/profile`, {
      fullName: this.editName.trim(),
      email:    this.editEmail.trim() || null
    }).subscribe({
      next: res => {
        this.savingProfile = false;
        if (res.success) {
          if (this.profile) this.profile.fullName = this.editName.trim();
          this.toast.showSuccess('Profile updated successfully');
        } else {
          this.toast.showError(res.message || 'Update failed');
        }
      },
      error: err => {
        this.savingProfile = false;
        this.toast.showError(err.error?.message || 'Could not save profile');
      }
    });
  }

  // ── Password ───────────────────────────────────────────────────────────────

  get passwordStrength(): number {
    const p = this.newPassword;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 6)  score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p) || /[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return Math.min(score, 4);
  }

  get canChangePassword(): boolean {
    return !!this.currentPassword && !!this.newPassword &&
           this.newPassword.length >= 6 &&
           this.newPassword === this.confirmPassword;
  }

  changePassword() {
    if (!this.canChangePassword) return;
    this.savingPassword = true;
    this.http.put<any>(`${this.api}/ParentDashboard/change-password`, {
      currentPassword: this.currentPassword,
      newPassword:     this.newPassword,
      confirmPassword: this.confirmPassword
    }).subscribe({
      next: res => {
        this.savingPassword = false;
        if (res.success) {
          this.toast.showSuccess('Password changed successfully');
          this.currentPassword = '';
          this.newPassword     = '';
          this.confirmPassword = '';
        } else {
          this.toast.showError(res.message || 'Change failed');
        }
      },
      error: err => {
        this.savingPassword = false;
        this.toast.showError(err.error?.message || 'Could not change password');
      }
    });
  }

  // ── Children ───────────────────────────────────────────────────────────────

  loadChildren() {
    this.childrenLoading = true;
    this.http.get<any>(`${this.api}/ParentDashboard/children`).subscribe({
      next: res => {
        this.childrenLoading = false;
        if (res.success) {
          this.children = (res.children || []).map((c: any) => ({
            studentId:   c.studentId,
            studentName: c.studentName,
            editingName: c.studentName,
            saving:      false,
            editing:     false
          }));
        }
      },
      error: () => { this.childrenLoading = false; }
    });
  }

  startEditChild(child: ChildName) {
    child.editingName = child.studentName;
    child.editing     = true;
  }

  cancelEditChild(child: ChildName) {
    child.editingName = child.studentName;
    child.editing     = false;
  }

  saveChildName(child: ChildName) {
    if (!child.editingName.trim() || child.saving) return;
    child.saving = true;
    this.http.put<any>(
      `${this.api}/ParentDashboard/children/${child.studentId}/name`,
      { fullName: child.editingName.trim() }
    ).subscribe({
      next: res => {
        child.saving = false;
        if (res.success) {
          child.studentName = child.editingName.trim();
          child.editing     = false;
          this.toast.showSuccess(`${child.studentName}'s name updated`);
        } else {
          this.toast.showError(res.message || 'Update failed');
        }
      },
      error: err => {
        child.saving = false;
        this.toast.showError(err.error?.message || 'Could not update name');
      }
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  initials(name?: string): string {
    if (!name) return '?';
    const p = name.trim().split(' ');
    return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  }

  goBack() { this.router.navigate(['/parent/dashboard']); }
}
