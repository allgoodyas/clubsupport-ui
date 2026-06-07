import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { StudentService } from '../../core/services/student.service';
import { ToastService } from '../../shared/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher.component';
import { StudentRegistration, RegisterParentStudentResponse, ExistingStudent } from '../../models/api.models';
import { extractApiError } from '../../core/utils/api-error.util';

@Component({
  selector: 'app-register-student',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, LanguageSwitcherComponent],
  templateUrl: './register-student.component.html',
  styleUrls: ['./register-student.component.scss']
})
export class RegisterStudentComponent implements OnInit {
  // Registration mode
  registrationMode: 'parent' | 'self' = 'parent';

  // Parent info
  parentMobile: string = '';
  parentName: string = '';
  parentEmail: string = '';
  parentExists: boolean = false;
  parentChecked: boolean = false;
  existingStudents: ExistingStudent[] = [];
  selectedStudentTab: number = 0;

  // Students array
  students: StudentFormData[] = [];

  // UI state
  isLoading: boolean = false;
  isSaving: boolean = false;
  showCredentials: boolean = false;
  registrationResponse: RegisterParentStudentResponse | null = null;

  constructor(
    private studentService: StudentService,
    private toastService: ToastService,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Add first student by default
    this.addStudent();
  }

  // Auto-check parent on mobile blur
  onMobileBlur(): void {
    if (this.parentMobile && this.parentMobile.trim() !== '' && this.validateMobile()) {
      this.checkParent();
    }
  }

  checkParent(): void {
    this.isLoading = true;
    this.parentChecked = false;

    this.studentService.checkParent({ mobileNumber: this.parentMobile }).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.parentChecked = true;

        if (response.parentExists && response.parentFullName) {
          this.parentExists = true;
          this.parentName = response.parentFullName;
          this.parentEmail = response.parentEmail || '';
          this.existingStudents = response.existingStudents || [];
          this.selectedStudentTab = 0;
          
          const studentCount = this.existingStudents.length;
          const message = studentCount > 0 
            ? `Existing parent found with ${studentCount} student(s): ${response.parentFullName}`
            : `Existing parent found: ${response.parentFullName}`;
          this.toastService.info(message);
        } else {
          this.parentExists = false;
          this.existingStudents = [];
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.toastService.error(extractApiError(error, 'Error checking parent'));
      }
    });
  }

  onModeChange(): void {
    // Reset existing students when changing mode
    this.existingStudents = [];
    this.parentChecked = false;
    this.parentExists = false;
  }

  addStudent(): void {
    this.students.push({
      fullName: '',
      dateOfBirth: '',
      gender: '',
      medicalNotes: '',
      medicalExpanded: false,
      photoFile: null,
      photoPreview: null
    });
  }

  removeStudent(index: number): void {
    if (this.students.length > 1) {
      this.students.splice(index, 1);
    } else {
      this.toastService.warning('At least one student is required');
    }
  }

  toggleMedicalNotes(index: number): void {
    this.students[index].medicalExpanded = !this.students[index].medicalExpanded;
  }

  onPhotoSelected(event: any, index: number): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.toastService.error('Please select a valid image file');
        return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        this.toastService.error('Photo size must be less than 2MB');
        return;
      }

      this.students[index].photoFile = file;

      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.students[index].photoPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removePhoto(index: number): void {
    this.students[index].photoFile = null;
    this.students[index].photoPreview = null;
  }

  validateMobile(): boolean {
    const saudiMobilePattern = /^\+966[5][0-9]{8}$/;
    if (!saudiMobilePattern.test(this.parentMobile)) {
      this.toastService.error('Invalid mobile number format. Use: +966XXXXXXXXX');
      return false;
    }
    return true;
  }

  validateForm(): boolean {
    // Contact info validation (parent or self)
    const contactLabel = this.registrationMode === 'self' ? 'Your' : 'Parent';

    if (!this.parentMobile.trim()) {
      this.toastService.error(`${contactLabel} mobile number is required`);
      return false;
    }

    if (!this.validateMobile()) {
      return false;
    }

    if (!this.parentName.trim()) {
      this.toastService.error(`${contactLabel} full name is required`);
      return false;
    }

    // Students validation
    if (this.students.length === 0) {
      this.toastService.error('At least one student is required');
      return false;
    }

    for (let i = 0; i < this.students.length; i++) {
      const student = this.students[i];

      if (!student.fullName.trim()) {
        this.toastService.error(`Student ${i + 1}: Full name is required`);
        return false;
      }

      if (!student.dateOfBirth) {
        this.toastService.error(`Student ${i + 1}: Date of birth is required`);
        return false;
      }

      if (!student.gender) {
        this.toastService.error(`Student ${i + 1}: Gender is required`);
        return false;
      }
    }

    return true;
  }

  async register(): Promise<void> {
    if (!this.validateForm()) {
      return;
    }

    this.isSaving = true;

    try {
      // Convert students data
      const studentsData: StudentRegistration[] = [];

      for (const student of this.students) {
        const studentData: StudentRegistration = {
          fullName: student.fullName,
          dateOfBirth: student.dateOfBirth,
          gender: student.gender as 'Male' | 'Female',
          medicalNotes: student.medicalNotes || undefined,
          isSelfRegistered: this.registrationMode === 'self'
        };

        // Handle photo if uploaded
        if (student.photoFile) {
          const base64 = await this.fileToBase64(student.photoFile);
          studentData.photoBase64 = base64;
          studentData.photoContentType = student.photoFile.type;
          studentData.photoFileName = student.photoFile.name;
        }

        studentsData.push(studentData);
      }

      // Submit registration
      this.studentService.registerParentAndStudents({
        mobileNumber: this.parentMobile,
        parentFullName: this.parentName,
        parentEmail: this.parentEmail || undefined,
        students: studentsData
      }).subscribe({
        next: (response) => {
          this.isSaving = false;

          if (response.success) {
            this.registrationResponse = response;

            const message = response.parentAlreadyExists
              ? `${response.studentIds.length} student(s) added to ${this.parentName} successfully!`
              : `Parent and ${response.studentIds.length} student(s) registered successfully!`;

            this.toastService.success(message);

            // Only show credentials for a brand-new parent account
            // Never show credentials when adding a student to an existing parent
            if (response.userAccountCreated && response.temporaryPassword) {
              this.showCredentials = true;
            } else {
              setTimeout(() => this.router.navigate(['/students']), 1500);
            }
          } else {
            this.toastService.error(response.message);
          }
        },
        error: (error) => {
          this.isSaving = false;
          this.toastService.error(extractApiError(error, 'Registration failed'));
        }
      });
    } catch (error) {
      this.isSaving = false;
      this.toastService.error('Error processing photos');
    }
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  formatMobileNumber(): void {
    if (this.parentMobile && !this.parentMobile.startsWith('+')) {
      if (this.parentMobile.startsWith('5')) {
        this.parentMobile = '+966' + this.parentMobile;
      } else if (this.parentMobile.startsWith('966')) {
        this.parentMobile = '+' + this.parentMobile;
      }
    }
  }

  goBack(): void {
    this.router.navigate(['/students']);
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  goToStudents(): void {
    this.router.navigate(['/students']);
  }

  goToSettings(): void {
    this.router.navigate(['/club/settings']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  closeCredentials(): void {
    this.showCredentials = false;
    this.router.navigate(['/students']);
  }

  selectStudentTab(index: number): void {
    this.selectedStudentTab = index;
  }
}

// Interface for student form data
interface StudentFormData {
  fullName: string;
  dateOfBirth: string;
  gender: string;
  medicalNotes: string;
  medicalExpanded: boolean;
  photoFile: File | null;
  photoPreview: string | null;
}
