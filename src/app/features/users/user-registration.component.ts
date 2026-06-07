// user-registration.component.ts
// Component for creating and editing users in the club

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { UserService, Role } from '../../core/services/user.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-user-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, LanguageSwitcherComponent],
  templateUrl: './user-registration.component.html',
  styleUrls: ['./user-registration.component.scss']
})
export class UserRegistrationComponent implements OnInit {
  userForm!: FormGroup;
  roles: Role[] = [];
  isLoading = false;
  isSubmitting = false;
  showPassword = false;

  // Edit mode
  isEditMode = false;
  userId: number | null = null;
  currentUser: any = null;

  // Master admin mode — creating user for a specific club
  targetClubId: number | null = null;
  targetClubName = '';
  isMasterAdminMode = false;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute,
    private toastService: ToastService,
    private authService: AuthService,
    private http: HttpClient
  ) {
    this.initForm();
  }

  ngOnInit() {
    const clubIdParam = this.route.snapshot.queryParamMap.get('clubId');
    const userIdParam = this.route.snapshot.params['id'];

    if (clubIdParam) {
      // Master admin mode (create or edit for a specific club)
      this.targetClubId      = +clubIdParam;
      this.isMasterAdminMode = true;

      if (userIdParam) {
        // Master admin EDITING an existing user for a club
        this.isEditMode = true;
        this.userId     = +userIdParam;
        this.loadUserData();
      }

      this.loadClubRoles(this.targetClubId);

      // Load club info + apply theme
      this.http.get<any>(`${environment.apiUrl}/master/clubs/${this.targetClubId}`).subscribe({
        next: r => {
          this.targetClubName = r.clubNameEn || `Club #${this.targetClubId}`;
          if (r.theme) this.applyTheme(r.theme);
        },
        error: () => {}
      });

    } else {
      // Normal club admin mode
      this.route.params.subscribe(params => {
        if (params['id']) {
          this.isEditMode = true;
          this.userId = +params['id'];
          this.loadUserData();
        }
      });
      this.loadRoles();
    }
  }

  /** Apply a club theme object to :root CSS variables */
  private applyTheme(theme: any): void {
    const root = document.documentElement;
    const set = (v: string, val: string) => { if (val) root.style.setProperty(v, val); };
    set('--bg-app',          theme.bgApp          || '#0A0F1E');
    set('--bg-panel',        theme.bgPanel        || '#111827');
    set('--bg-card',         theme.bgCard         || '#1A2235');
    set('--bg-border',       theme.bgBorder       || '#1E2D45');
    set('--accent-primary',  theme.accentPrimary  || '#00D4FF');
    set('--accent-success',  theme.accentSuccess  || '#00FF9D');
    set('--accent-warning',  theme.accentWarning  || '#FF8C42');
    set('--accent-danger',   theme.accentDanger   || '#FF4757');
    set('--accent-info',     theme.accentInfo     || '#A855F7');
    set('--text-primary',    theme.textPrimary    || '#E2E8F0');
    set('--text-secondary',  theme.textSecondary  || '#94A3B8');
    set('--text-disabled',   theme.textDisabled   || '#4A5568');
  }

  initForm() {
    this.userForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      mobileNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10,15}$/)]],
      email: ['', [Validators.email]],
      password: [''],  // Will be required in create mode
      confirmPassword: [''],
      roleId: ['', [Validators.required]]
    });
  }

  updateValidators() {
    const passwordControl = this.userForm.get('password');
    const confirmPasswordControl = this.userForm.get('confirmPassword');

    if (this.isEditMode) {
      // In edit mode, password is optional
      passwordControl?.clearValidators();
      confirmPasswordControl?.clearValidators();
      
      // Add custom validator: if password is filled, it must be valid
      this.userForm.setValidators(this.passwordMatchValidator);
    } else {
      // In create mode, password is required
      passwordControl?.setValidators([Validators.required, Validators.minLength(6)]);
      confirmPasswordControl?.setValidators([Validators.required]);
      this.userForm.setValidators(this.passwordMatchValidator);
    }

    passwordControl?.updateValueAndValidity();
    confirmPasswordControl?.updateValueAndValidity();
  }

  passwordMatchValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const group = control as FormGroup;
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    
    // Only validate if password is provided
    if (password || confirmPassword) {
      return password === confirmPassword ? null : { passwordMismatch: true };
    }
    return null;
  }

  loadRoles() {
    this.isLoading = true;
    this.userService.getRoles().subscribe({
      next: (response) => {
        if (response.success) this.roles = response.roles;
        this.isLoading = false;
      },
      error: () => { this.toastService.showError('Failed to load roles'); this.isLoading = false; }
    });
  }

  loadClubRoles(clubId: number) {
    this.isLoading = true;
    this.http.get<any>(`${environment.apiUrl}/master/clubs/${clubId}/roles`).subscribe({
      next: r => {
        const raw = r.roles || [];
        // Normalise — PostgreSQL lowercases all identifiers in Dapper anonymous types
        this.roles = raw.map((role: any) => ({
          roleId:      role.roleId      ?? role.roleid      ?? role.role_id,
          roleName:    role.roleName    ?? role.rolename    ?? role.role_name    ?? '',
          description: role.description ?? role.Description ?? ''
        }));
        this.isLoading = false;
      },
      error: () => { this.toastService.showError('Failed to load roles'); this.isLoading = false; }
    });
  }

  loadUserData() {
    if (!this.userId) return;
    this.isLoading = true;

    if (this.isMasterAdminMode && this.targetClubId) {
      // Master admin — use dedicated endpoint that queries by club
      this.http.get<any>(`${environment.apiUrl}/master/clubs/${this.targetClubId}/users/${this.userId}`)
        .subscribe({
          next: r => {
            if (r.success && r.user) {
              this.currentUser = r.user;
              this.userForm.patchValue({
                fullName:     r.user.fullName,
                mobileNumber: r.user.mobileNumber,
                email:        r.user.email || '',
                roleId:       r.user.roleId
              });
              this.userForm.get('mobileNumber')?.disable();
              this.updateValidators();
            }
            this.isLoading = false;
          },
          error: () => {
            this.toastService.showError('Failed to load user data');
            this.isLoading = false;
          }
        });
    } else {
      // Normal club admin mode
      this.userService.getUserById(this.userId).subscribe({
        next: (response) => {
          if (response.success && response.user) {
            this.currentUser = response.user;
            this.userForm.patchValue({
              fullName:     this.currentUser.fullName,
              mobileNumber: this.currentUser.mobileNumber,
              email:        this.currentUser.email || '',
              roleId:       this.currentUser.roleId
            });
            this.userForm.get('mobileNumber')?.disable();
            this.updateValidators();
          }
          this.isLoading = false;
        },
        error: () => {
          this.toastService.showError('Failed to load user data');
          this.isLoading = false;
          this.router.navigate(['/users/list']);
        }
      });
    }
  }

  onSubmit() {
    if (this.userForm.invalid) {
      this.markFormGroupTouched(this.userForm);
      this.toastService.showError('Please fill all required fields correctly');
      return;
    }

    this.isSubmitting = true;

    if (this.isEditMode) {
      this.updateUser();
    } else {
      this.createUser();
    }
  }

  createUser() {
    const formValue = this.userForm.value;

    // ── Master admin creating a user for a specific club ──
    if (this.isMasterAdminMode && this.targetClubId) {
      const req = {
        fullName:     formValue.fullName,
        mobileNumber: formValue.mobileNumber,
        email:        formValue.email || null,
        password:     formValue.password,
        roleId:       parseInt(formValue.roleId) || 0
      };
      this.http.post<any>(`${environment.apiUrl}/master/clubs/${this.targetClubId}/users`, req)
        .subscribe({
          next: r => {
            this.isSubmitting = false;
            if (r.success) {
              this.toastService.showSuccess(r.message || 'User created successfully!');
              // Go back to the master admin club edit page, not the club's user list
              this.router.navigate(['/master-admin/clubs', this.targetClubId, 'edit']);
            } else {
              this.toastService.showError(r.message || 'Failed to create user');
            }
          },
          error: e => {
            this.isSubmitting = false;
            this.toastService.showError(e.error?.message || 'Failed to create user');
          }
        });
      return;
    }

    // ── Normal club admin mode ──
    const request = {
      fullName:     formValue.fullName,
      mobileNumber: formValue.mobileNumber,
      email:        formValue.email || undefined,
      password:     formValue.password,
      roleId:       parseInt(formValue.roleId)
    };
    this.userService.createUser(request).subscribe({
      next: r => {
        this.isSubmitting = false;
        if (r.success) {
          this.toastService.showSuccess('User created successfully!');
          this.router.navigate(['/users/list']);
        } else {
          this.toastService.showError(r.message || 'Failed to create user');
        }
      },
      error: e => {
        this.isSubmitting = false;
        this.toastService.showError(e.error?.message || 'Failed to create user');
      }
    });
  }

  updateUser() {
    if (!this.userId) return;
    const formValue = this.userForm.getRawValue();

    if (this.isMasterAdminMode && this.targetClubId) {
      // ── Master admin — use dedicated endpoint with clubId in URL ──
      const req: any = {
        fullName: formValue.fullName,
        email:    formValue.email || null,
        roleId:   Number(formValue.roleId) || 0
      };
      if (formValue.password) req.password = formValue.password;

      this.http.put<any>(
        `${environment.apiUrl}/master/clubs/${this.targetClubId}/users/${this.userId}`, req
      ).subscribe({
        next: r => {
          this.isSubmitting = false;
          if (r.success) {
            this.toastService.showSuccess('User updated successfully!');
            this.router.navigate(['/master-admin/clubs', this.targetClubId, 'edit']);
          } else {
            this.toastService.showError(r.message || 'Failed to update user');
          }
        },
        error: e => {
          this.isSubmitting = false;
          this.toastService.showError(e.error?.message || e.error?.title || 'Failed to update user');
        }
      });
      return;
    }

    // ── Normal club admin ──
    const request: any = {
      userId:   this.userId,
      fullName: formValue.fullName,
      email:    formValue.email || null,
      roleId:   Number(formValue.roleId) || 0
    };
    if (formValue.password) request.password = formValue.password;

    this.userService.updateUser(request).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastService.showSuccess('User updated successfully!');
          this.router.navigate(['/users/list']);
        } else {
          this.toastService.showError(response.message || 'Failed to update user');
        }
        this.isSubmitting = false;
      },
      error: (error) => {
        this.toastService.showError(error.error?.message || error.error?.title || 'Failed to update user.');
        this.isSubmitting = false;
      }
    });
  }

  cancel() {
    if (this.isMasterAdminMode && this.targetClubId) {
      this.router.navigate(['/master-admin/clubs', this.targetClubId, 'edit']);
    } else {
      this.router.navigate(['/users/list']);
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // Helper methods for template
  isFieldInvalid(fieldName: string): boolean {
    const field = this.userForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.userForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'This field is required';
      if (field.errors['minlength']) return `Minimum ${field.errors['minlength'].requiredLength} characters required`;
      if (field.errors['pattern']) return 'Invalid format';
      if (field.errors['email']) return 'Invalid email address';
    }
    if (fieldName === 'confirmPassword' && this.userForm.errors?.['passwordMismatch']) {
      return 'Passwords do not match';
    }
    return '';
  }

  getPageTitle(): string {
    return this.isEditMode ? 'USER_REGISTRATION.EDIT_USER' : 'USER_REGISTRATION.REGISTER_NEW_USER';
  }

  getSubmitButtonText(): string {
    return this.isEditMode ? 'Update User' : 'Register User';
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  goToUsersList(): void {
    this.router.navigate(['/users/list']);
  }

  goToSettings(): void {
    this.router.navigate(['/club/settings']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
