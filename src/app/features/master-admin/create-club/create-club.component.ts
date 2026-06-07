import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ClubService } from '../../../core/services/club.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import { LanguageSwitcherComponent } from '../../../shared/components/language-switcher/language-switcher.component';
import { CreateClubRequest, ClubDetailsResponse } from '../../../models/api.models';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-create-club',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, LanguageSwitcherComponent],
  templateUrl: './create-club.component.html',
  styleUrls: ['./create-club.component.scss']
})
export class CreateClubComponent implements OnInit, OnDestroy {

  // ── Mode ────────────────────────────────────────────────────────────────────
  isEditMode  = false;
  clubId      = 0;
  club: ClubDetailsResponse | null = null;
  clubLogoUrl: SafeUrl | null = null;

  // ── Club Info ────────────────────────────────────────────────────────────────
  clubNameEn          = '';
  clubNameAr          = '';
  clubCode            = '';
  cityId              = 1;
  locationCoordinates = '';
  locationUrl         = '';
  baseCurrency        = 'SAR';
  autoDeactivateDays  = 90;
  isActive            = true;

  // ── Legacy Theme (Create & Edit) ─────────────────────────────────────────────
  primaryColor   = '#2E7D32';
  secondaryColor = '#FDD835';
  accentColor    = '#FFFFFF';

  // ── Enhanced Theme ──────────────────────────────────────
  bgApp          = '#0A0F1E';
  bgPanel        = '#111827';
  bgCard         = '#1A2235';
  bgBorder       = '#1E2D45';
  accentPrimary  = '#00D4FF';
  accentSuccess  = '#00FF9D';
  accentWarning  = '#FF8C42';
  accentDanger   = '#FF4757';
  accentInfo     = '#A855F7';
  textPrimary    = '#E2E8F0';
  textSecondary  = '#94A3B8';
  textDisabled   = '#4A5568';
  themeMode      = 'dark';

  // ── Admin (Create mode only) ─────────────────────────────────────────────────
  adminFullName    = '';
  adminMobileNumber = '';
  adminEmail       = '';

  // ── Logo ─────────────────────────────────────────────────────────────────────
  logoFile: File | null = null;
  logoPreview: string | null = null;

  // ── UI State ─────────────────────────────────────────────────────────────────
  isLoading           = false;
  isSaving            = false;
  errorMessage        = '';
  successMessage      = '';
  // Create-mode modal
  showSuccessModal  = false;
  temporaryPassword = '';
  createdClubName   = '';

  // ── Notification Channels (master admin edit view) ────────────────────────────
  clubChannels: any[] = [];
  ncLoading = false;
  ncError   = '';

  // ── Club Admin user (master admin edit view) ─────────────────────────────────
  clubAdmin: any = null;       // existing admin user for this club
  adminLoading = false;

  constructor(
    private route:     ActivatedRoute,
    private router:    Router,
    private clubService: ClubService,
    public  authService: AuthService,
    private translate:   TranslateService,
    private http:        HttpClient,
    private sanitizer:   DomSanitizer,
    private toastService: ToastService
  ) {}

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    const idParam = this.route.snapshot.params['id'];

    if (idParam) {
      // Master-admin editing a specific club: /master-admin/clubs/:id/edit
      this.isEditMode = true;
      this.clubId = +idParam;
      this.loadClub();
      // Load channels independently — don’t wait for club form
      if (this.authService.isMasterAdmin) {
        this.loadClubChannels();
        this.loadClubAdmin();
      }
    } else {
      // Check if a club admin reached /club/settings — auto edit their own club
      const currentUser = this.authService.currentUserValue;
      if (currentUser?.clubId) {
        this.isEditMode = true;
        this.clubId = currentUser.clubId;
        this.loadClub();
      }
      // Otherwise: master-admin on /master-admin/create-club → isEditMode stays false
    }
  }

  ngOnDestroy(): void {
    if (this.clubLogoUrl) {
      URL.revokeObjectURL(this.clubLogoUrl.toString());
    }
  }

  // ── Edit: load existing data ─────────────────────────────────────────────────
  loadClub(): void {
    this.isLoading = true;
    this.clubService.getClubById(this.clubId, this.authService.isMasterAdmin).subscribe({
      next: (club) => {
        this.club = club;
        this.populateForm(club);
        if (club.theme?.hasLogo) this.loadClubLogo();
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err.message || 'Failed to load club details';
        this.toastService.error(this.errorMessage);
        this.isLoading = false;
      }
    });
  }

  populateForm(club: ClubDetailsResponse): void {
    this.clubNameEn          = club.clubNameEn          || '';
    this.clubNameAr          = club.clubNameAr          || '';
    this.clubCode            = club.clubCode            || '';
    this.cityId              = club.cityId              || 0;
    this.locationCoordinates = club.locationCoordinates || '';
    this.locationUrl         = club.locationUrl         || '';
    this.baseCurrency        = club.baseCurrency        || 'SAR';
    this.autoDeactivateDays  = club.autoDeactivateDays  || 90;
    this.isActive            = club.isActive;

    if (club.theme) {
      const t = club.theme as any;
      this.primaryColor   = t.primaryColor   || '#2E7D32';
      this.secondaryColor = t.secondaryColor || '#FDD835';
      this.accentColor    = t.accentColor    || '#FFFFFF';
      this.bgApp          = t.bgApp          || '#0A0F1E';
      this.bgPanel        = t.bgPanel        || '#111827';
      this.bgCard         = t.bgCard         || '#1A2235';
      this.bgBorder       = t.bgBorder       || '#1E2D45';
      this.accentPrimary  = t.accentPrimary  || '#00D4FF';
      this.accentSuccess  = t.accentSuccess  || '#00FF9D';
      this.accentWarning  = t.accentWarning  || '#FF8C42';
      this.accentDanger   = t.accentDanger   || '#FF4757';
      this.accentInfo     = t.accentInfo     || '#A855F7';
      this.textPrimary    = t.textPrimary    || '#E2E8F0';
      this.textSecondary  = t.textSecondary  || '#94A3B8';
      this.textDisabled   = t.textDisabled   || '#4A5568';
      this.themeMode      = t.themeMode      || 'dark';
    }
  }

  loadClubLogo(): void {
    const url = this.authService.isMasterAdmin
      ? `${environment.apiUrl}/master/clubs/${this.clubId}/logo`
      : `${environment.apiUrl}/club/logo`;
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        this.clubLogoUrl = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob));
      },
      error: () => {}
    });
  }

  // ── Club Admin ───────────────────────────────────────────────────────────────
  loadClubAdmin(): void {
    this.adminLoading = true;
    this.http.get<any>(`${environment.apiUrl}/master/clubs/${this.clubId}/users`).subscribe({
      next: r => {
        this.adminLoading = false;
        const users = r.users || r.data || [];
        if (users.length > 0) {
          const u = users[0];
          // PostgreSQL folds all identifiers to lowercase
          // so Dapper anonymous types return: userid, fullname, mobilenumber etc.
          this.clubAdmin = {
            userId:       u.userid       ?? u.userId       ?? u.user_id,
            fullName:     u.fullname     ?? u.fullName     ?? u.full_name     ?? '',
            mobileNumber: u.mobilenumber ?? u.mobileNumber ?? u.mobile_number ?? '',
            email:        u.email        ?? '',
            roleName:     u.rolename     ?? u.roleName     ?? u.role_name     ?? '',
            isActive:     u.isactive     ?? u.isActive     ?? u.is_active     ?? true
          };
        } else {
          this.clubAdmin = null;
        }
      },
      error: () => { this.adminLoading = false; }
    });
  }

  editClubAdmin(): void {
    const id = this.clubAdmin?.userId;
    if (id) {
      this.router.navigate(['/users/edit', id], {
        queryParams: { clubId: this.clubId }
      });
    }
  }

  addClubAdmin(): void {
    this.router.navigate(['/users/register'], {
      queryParams: { clubId: this.clubId }
    });
  }

  loadClubChannels(): void {
    this.ncLoading = true;
    this.ncError   = '';
    const url = `${environment.apiUrl}/ClubActiveChannels/club/${this.clubId}`;
    console.log('[CreateClub] Loading channels from:', url);
    this.http.get<any>(url).subscribe({
      next: (res) => {
        console.log('[CreateClub] Channels response:', res);
        this.clubChannels = res.success
          ? (res.channels || []).map((c: any) => ({ ...c, saving: false, providerSaving: false }))
          : [];
        if (!res.success) this.ncError = 'API returned failure';
        this.ncLoading = false;
      },
      error: (err) => {
        console.error('[CreateClub] Channels error:', err);
        this.ncError = `Could not load channels (${err.status}: ${err.statusText}). Ensure the API is restarted.`;
        this.ncLoading = false;
      }
    });
  }

  toggleNcChannel(ch: any): void {
    const newVal = !ch.isActive;
    ch.saving = true;
    this.http.put<any>(`${environment.apiUrl}/ClubActiveChannels`, {
      clubId:    this.clubId,
      channelId: ch.channelId,
      isActive:  newVal
    }).subscribe({
      next: (res) => {
        ch.saving = false;
        if (res.success) {
          ch.isActive = newVal;
          this.toastService.success(`${ch.channelName} ${newVal ? 'enabled' : 'disabled'}`);
          this.loadClubChannels();
        } else {
          this.toastService.error('Failed to update channel');
        }
      },
      error: () => { ch.saving = false; this.toastService.error('Could not save'); }
    });
  }

  setNcWhatsAppProvider(ch: any, provider: string): void {
    if (ch.whatsAppProvider === provider || ch.providerSaving) return;
    ch.providerSaving = true;
    this.http.put<any>(`${environment.apiUrl}/ClubActiveChannels/whatsapp-provider`, {
      provider,
      clubId: this.clubId
    }).subscribe({
      next: (res) => {
        ch.providerSaving = false;
        if (res.success) {
          ch.whatsAppProvider = provider;
          const label = provider === 'twilio' ? 'Twilio' : 'Direct WhatsApp API';
          this.toastService.success(`WhatsApp provider set to ${label}`);
        } else {
          this.toastService.error('Failed to save provider');
        }
      },
      error: () => { ch.providerSaving = false; this.toastService.error('Could not save provider'); }
    });
  }

  getNcIcon(code: string): string {
    return ({ push: '📱', whatsapp: '💬', sms: '✉️', email: '📧' } as any)[code] ?? '📡';
  }

  getNcDesc(code: string): string {
    return ({
      push:     'Browser & mobile push alerts',
      whatsapp: 'WhatsApp Business messages',
      sms:      'SMS text messages',
      email:    'Email notifications'
    } as any)[code] ?? '';
  }

  // ── Logo ──────────────────────────────────────────────────────────────────────
  onLogoSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    // Accept standard images AND SVG (Windows can report SVG as text/plain or application/xml)
    const isSvgByExtension = file.name.toLowerCase().endsWith('.svg');
    const isValidType = file.type.startsWith('image/') ||
                        file.type === 'image/svg+xml'  ||
                        file.type === 'text/plain'     && isSvgByExtension ||
                        file.type === 'application/xml' && isSvgByExtension ||
                        file.type === 'text/xml'        && isSvgByExtension ||
                        file.type === ''                && isSvgByExtension;

    if (!isValidType) {
      this.toastService.error(this.translate.instant('VALIDATION.IMAGE_INVALID')); return;
    }
    if (file.size > 5 * 1024 * 1024) {  // 5MB — matches backend limit
      this.toastService.error(this.translate.instant('VALIDATION.FILE_TOO_LARGE')); return;
    }
    this.logoFile = file;
    const reader = new FileReader();
    reader.onload = (e: any) => { this.logoPreview = e.target.result; };
    reader.readAsDataURL(file);
  }

  removeLogo(): void { this.logoFile = null; this.logoPreview = null; }

  // ── Create helpers ────────────────────────────────────────────────────────────
  generateClubCode(): void {
    if (!this.isEditMode && this.clubNameEn) {
      const words = this.clubNameEn.replace(/[^a-zA-Z0-9\s]/g, '').trim().split(/\s+/);
      this.clubCode = words.slice(0, 3).map(w => w.substring(0, 3).toUpperCase())
        .filter(w => w.length > 0).join('_') + '_001';
    }
  }

  formatMobileNumber(): void {
    if (this.adminMobileNumber && !this.adminMobileNumber.startsWith('+')) {
      if (this.adminMobileNumber.startsWith('5'))
        this.adminMobileNumber = '+966' + this.adminMobileNumber;
      else if (this.adminMobileNumber.startsWith('966'))
        this.adminMobileNumber = '+' + this.adminMobileNumber;
    }
  }

  // ── Submit (delegates to create or update) ────────────────────────────────────
  onSubmit(): void {
    this.isEditMode ? this.saveChanges() : this.createClub();
  }

  // ── CREATE ────────────────────────────────────────────────────────────────────
  createClub(): void {
    if (!this.validateCreateForm()) return;
    this.isLoading = true;
    this.errorMessage = '';

    const request: CreateClubRequest = {
      clubNameEn: this.clubNameEn.trim(),
      clubNameAr: this.clubNameAr.trim(),
      clubCode:   this.clubCode.trim().toUpperCase(),
      cityId:     this.cityId,
      locationCoordinates: this.locationCoordinates.trim() || undefined,
      locationUrl:         this.locationUrl.trim()         || undefined,
      baseCurrency:        this.baseCurrency,
      autoDeactivateDays:  this.autoDeactivateDays,
      primaryColor:        this.primaryColor,
      secondaryColor:      this.secondaryColor,
      accentColor:         this.accentColor,
      adminFullName:       this.adminFullName.trim(),
      adminMobileNumber:   this.adminMobileNumber.trim(),
      adminEmail:          this.adminEmail.trim() || undefined
    };

    this.clubService.createClub(request).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success) {
          this.createdClubName   = res.club?.clubNameEn || this.clubNameEn;
          this.temporaryPassword = res.adminCredentials?.temporaryPassword || '';
          this.showSuccessModal  = true;
        } else {
          this.errorMessage = res.message;
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.message || this.translate.instant('MESSAGES.CLUB_CREATE_FAILED');
      }
    });
  }

  // ── UPDATE ────────────────────────────────────────────────────────────────────
  saveChanges(): void {
    if (!this.validateEditForm()) return;
    this.isSaving = true;
    this.errorMessage = '';

    const payload: any = {
      clubNameEn: this.clubNameEn, clubNameAr: this.clubNameAr,
      cityId: this.cityId, locationCoordinates: this.locationCoordinates,
      locationUrl: this.locationUrl, isActive: this.isActive,
      autoDeactivateDays: this.autoDeactivateDays,
      primaryColor: this.primaryColor, secondaryColor: this.secondaryColor,
      accentColor: this.accentColor,
      bgApp: this.bgApp, bgPanel: this.bgPanel, bgCard: this.bgCard, bgBorder: this.bgBorder,
      accentPrimary: this.accentPrimary, accentSuccess: this.accentSuccess,
      accentWarning: this.accentWarning, accentDanger: this.accentDanger, accentInfo: this.accentInfo,
      textPrimary: this.textPrimary, textSecondary: this.textSecondary,
      textDisabled: this.textDisabled, themeMode: this.themeMode
    };

    const doSave = (data: any) => {
      this.clubService.updateClub(this.clubId, data, this.authService.isMasterAdmin).subscribe({
        next: () => {
          this.isSaving = false;
          this.toastService.success('Club updated successfully!');
          this.logoFile = null;
          this.logoPreview = null;
          setTimeout(() => this.loadClub(), 500);
        },
        error: (err) => {
          this.isSaving = false;
          this.toastService.error(err.message || this.translate.instant('MESSAGES.ERROR_OCCURRED'));
        }
      });
    };

    if (this.logoFile) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const raw = e.target.result as string;
        // base64 part is after the comma in  "data:...;base64,<data>"
        payload.logoBase64       = raw.split(',')[1];
        // Normalise SVG content type — Windows may report wrong MIME
        const isSvg = this.logoFile!.name.toLowerCase().endsWith('.svg');
        payload.logoContentType  = isSvg ? 'image/svg+xml' : (this.logoFile!.type || 'image/png');
        payload.logoFileName     = this.logoFile!.name;
        doSave(payload);
      };
      reader.readAsDataURL(this.logoFile);
    } else {
      doSave(payload);
    }
  }

  // ── Validation ────────────────────────────────────────────────────────────────
  validateCreateForm(): boolean {
    if (!this.clubNameEn.trim())     { this.errorMessage = this.translate.instant('VALIDATION.CLUB_NAME_EN_REQUIRED'); return false; }
    if (!this.clubNameAr.trim())     { this.errorMessage = this.translate.instant('VALIDATION.CLUB_NAME_AR_REQUIRED'); return false; }
    if (!this.clubCode.trim())       { this.errorMessage = this.translate.instant('VALIDATION.CLUB_CODE_REQUIRED');   return false; }
    if (!/^[A-Z0-9_]+$/.test(this.clubCode)) { this.errorMessage = this.translate.instant('VALIDATION.CLUB_CODE_INVALID'); return false; }
    if (!this.adminFullName.trim())  { this.errorMessage = this.translate.instant('VALIDATION.ADMIN_NAME_REQUIRED');  return false; }
    if (!this.adminMobileNumber.trim()) { this.errorMessage = this.translate.instant('VALIDATION.ADMIN_MOBILE_REQUIRED'); return false; }
    if (!/^\+966[5][0-9]{8}$/.test(this.adminMobileNumber)) { this.errorMessage = this.translate.instant('VALIDATION.MOBILE_INVALID'); return false; }
    if (this.adminEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.adminEmail)) { this.errorMessage = this.translate.instant('VALIDATION.EMAIL_INVALID'); return false; }
    return true;
  }

  validateEditForm(): boolean {
    if (!this.clubNameEn.trim()) { this.toastService.error(this.translate.instant('VALIDATION.CLUB_NAME_EN_REQUIRED')); return false; }
    if (!this.clubNameAr.trim()) { this.toastService.error(this.translate.instant('VALIDATION.CLUB_NAME_AR_REQUIRED')); return false; }
    return true;
  }

  // ── Theme helpers (edit mode) ─────────────────────────────────────────────────
  setThemeMode(mode: string): void { this.themeMode = mode; }

  applyPreset(name: string): void {
    const presets: Record<string, any> = {
      pharmacare: { bgApp:'#0A0F1E', bgPanel:'#111827', bgCard:'#1A2235', bgBorder:'#1E2D45',
        accentPrimary:'#00D4FF', accentSuccess:'#00FF9D', accentWarning:'#FF8C42', accentDanger:'#FF4757', accentInfo:'#A855F7',
        textPrimary:'#E2E8F0', textSecondary:'#94A3B8', textDisabled:'#4A5568', themeMode:'dark' },
      forest: { bgApp:'#0F1E0A', bgPanel:'#182711', bgCard:'#1F3518', bgBorder:'#2D451E',
        accentPrimary:'#4CAF50', accentSuccess:'#8BC34A', accentWarning:'#FF9800', accentDanger:'#F44336', accentInfo:'#009688',
        textPrimary:'#E8F5E9', textSecondary:'#A5D6A7', textDisabled:'#66BB6A', themeMode:'dark' },
      ocean: { bgApp:'#0A1420', bgPanel:'#0D1B2A', bgCard:'#1B263B', bgBorder:'#415A77',
        accentPrimary:'#0D9488', accentSuccess:'#06B6D4', accentWarning:'#F59E0B', accentDanger:'#EF4444', accentInfo:'#8B5CF6',
        textPrimary:'#E0F2FE', textSecondary:'#7DD3FC', textDisabled:'#0369A1', themeMode:'dark' },
      sunset: { bgApp:'#1E0F0A', bgPanel:'#271811', bgCard:'#352218', bgBorder:'#452D1E',
        accentPrimary:'#FF6B35', accentSuccess:'#00D4AA', accentWarning:'#FFA726', accentDanger:'#EF5350', accentInfo:'#AB47BC',
        textPrimary:'#FFF3E0', textSecondary:'#FFAB91', textDisabled:'#BF360C', themeMode:'dark' }
    };
    if (presets[name]) {
      Object.assign(this, presets[name]);
      this.toastService.success(name.charAt(0).toUpperCase() + name.slice(1) + ' theme applied!');
    }
  }

  // ── Template helpers — avoid TS index-signature errors in *ngFor color loops ───
  getColor(key: string): string {
    return (this as any)[key] ?? '';
  }

  setColor(key: string, value: string): void {
    (this as any)[key] = value;
  }

  // ── Navigation ────────────────────────────────────────────────────────────────
  cancel(): void {
    if (!this.isEditMode) {
      // Create mode — master admin
      this.router.navigate(['/master-admin']);
    } else if (this.authService.isMasterAdmin) {
      // Edit mode — master admin editing a specific club
      this.router.navigate(['/master-admin/clubs']);
    } else {
      // Edit mode — club admin editing their own club via /club/settings
      this.router.navigate(['/dashboard']);
    }
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.router.navigate(['/master-admin']);
  }

  createAnotherClub(): void {
    this.showSuccessModal = false;
    this.clubNameEn = ''; this.clubNameAr = ''; this.clubCode = '';
    this.cityId = 1; this.locationCoordinates = ''; this.locationUrl = '';
    this.baseCurrency = 'SAR'; this.autoDeactivateDays = 90;
    this.primaryColor = '#2E7D32'; this.secondaryColor = '#FDD835'; this.accentColor = '#FFFFFF';
    this.adminFullName = ''; this.adminMobileNumber = ''; this.adminEmail = '';
    this.logoFile = null; this.logoPreview = null;
    this.errorMessage = ''; this.successMessage = '';
    this.temporaryPassword = ''; this.createdClubName = '';
  }
}
