import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { ToastService } from '../../shared/services/toast.service';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, LanguageSwitcherComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  // ── Form fields ────────────────────────────────────────────────
  mobileNumber = '';
  password     = '';
  rememberMe   = false;

  // ── UI state ───────────────────────────────────────────────────
  isLoading        = false;
  errorMessage     = '';
  clubDeactivated  = false;

  // ── Club branding (loaded from slug in URL path) ───────────────
  clubSlug:     string | null = null;   // :clubSlug route param
  clubCode:     string | null = null;   // resolved from branding API
  clubBranding: any           = null;
  brandingLoading             = false;
  isMasterAdminLogin          = false;  // true when no slug in URL

  readonly apiUrl = environment.apiUrl;

  constructor(
    private authService:  AuthService,
    private router:       Router,
    private route:        ActivatedRoute,
    private translate:    TranslateService,
    private toastService: ToastService,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    // Already authenticated? Redirect immediately.
    if (this.authService.isAuthenticated) {
      this.redirectToDashboard();
      return;
    }

    // Read :clubSlug from route param (path-based) — also still supports ?c= for
    // backwards compatibility with any old links already distributed.
    const pathSlug  = this.route.snapshot.paramMap.get('clubSlug');
    const queryCode = this.route.snapshot.queryParamMap.get('c');
    const identifier = pathSlug || queryCode || null;

    if (identifier) {
      this.clubSlug          = identifier;
      this.isMasterAdminLogin = false;
      this.authService.saveLoginSource(identifier);
      this.loadClubBranding(identifier);
    } else {
      this.isMasterAdminLogin = true;
      this.authService.saveLoginSource(null);
      this.themeService.applyMasterAdminTheme();
    }
  }

  // ── Load club branding from slug/code ──────────────────────────

  private loadClubBranding(identifier: string): void {
    this.brandingLoading = true;
    this.themeService.loadPublicThemeByCode(identifier).subscribe({
      next: (response) => {
        this.brandingLoading = false;
        if (response.success && response.club) {
          this.clubBranding = response.club;
          this.clubCode     = response.club.clubCode;
        } else {
          // Slug not found — fall back to master admin theme
          this.clubBranding       = null;
          this.clubCode           = null;
          this.isMasterAdminLogin = true;
          this.themeService.applyMasterAdminTheme();
        }
      },
      error: () => {
        this.brandingLoading    = false;
        this.clubBranding       = null;
        this.clubCode           = null;
        this.isMasterAdminLogin = true;
        this.themeService.applyMasterAdminTheme();
      }
    });
  }

  // ── Mobile auto-format ──────────────────────────────────────────

  formatMobileNumber(): void {
    this.errorMessage = '';
    if (this.mobileNumber && !this.mobileNumber.startsWith('+')) {
      if (this.mobileNumber.startsWith('5')) {
        this.mobileNumber = '+966' + this.mobileNumber;
      } else if (this.mobileNumber.startsWith('966')) {
        this.mobileNumber = '+' + this.mobileNumber;
      }
    }
  }

  // ── Single-call login ───────────────────────────────────────────

  login(): void {
    this.errorMessage   = '';
    this.clubDeactivated = false;

    // Client-side validation — mobile format
    if (!this.mobileNumber || this.mobileNumber.trim() === '') {
      this.errorMessage = this.translate.instant('VALIDATION.MOBILE_REQUIRED');
      return;
    }
    const saudiPattern = /^\+966[5][0-9]{8}$/;
    if (!saudiPattern.test(this.mobileNumber)) {
      this.errorMessage = this.translate.instant('VALIDATION.MOBILE_INVALID');
      return;
    }

    // Client-side validation — password
    if (!this.password || this.password.trim() === '') {
      this.errorMessage = this.translate.instant('VALIDATION.PASSWORD_REQUIRED');
      return;
    }

    this.isLoading = true;

    // Use resolved clubCode from branding; for master admin login send empty string.
    const clubCodeToSend = this.isMasterAdminLogin ? '' : (this.clubCode ?? this.clubSlug ?? '');

    this.authService.login({
      username:   this.mobileNumber,
      password:   this.password,
      clubCode:   clubCodeToSend,
      rememberMe: this.rememberMe
    }).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.toastService.success(this.translate.instant('MESSAGES.LOGIN_SUCCESS'));
          setTimeout(() => this.redirectToDashboard(), 800);
        } else {
          this.clubDeactivated = response.isClubInactive ?? false;
          // Always show a generic message — never reveal which field was wrong
          this.errorMessage = this.clubDeactivated
            ? response.message
            : this.translate.instant('MESSAGES.LOGIN_FAILED') || 'Invalid credentials.';
        }
      },
      error: (err) => {
        this.isLoading       = false;
        this.clubDeactivated = err.error?.isClubInactive ?? false;
        this.errorMessage    = this.clubDeactivated
          ? (err.error?.message ?? 'Club has been deactivated.')
          : (this.translate.instant('MESSAGES.LOGIN_FAILED') || 'Invalid credentials.');
      }
    });
  }

  // ── Redirect after login ────────────────────────────────────────

  private redirectToDashboard(): void {
    if (this.authService.isMasterAdmin) {
      this.router.navigate(['/master-admin']);
    } else {
      const user     = this.authService.currentUserValue;
      const roleName = user?.roleName?.toLowerCase() || '';
      const isParent = roleName.includes('parent') || roleName.includes('customer');
      this.router.navigate(isParent ? ['/parent/dashboard'] : ['/dashboard']);
    }
  }
}
