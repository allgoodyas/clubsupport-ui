import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { StudentService } from '../../core/services/student.service';
import { ToastService } from '../../shared/services/toast.service';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher.component';
import { StudentDetails, UpdateStudentRequest } from '../../models/api.models';
import { extractApiError } from '../../core/utils/api-error.util';

@Component({
  selector: 'app-edit-student',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, LanguageSwitcherComponent],
  templateUrl: './edit-student.component.html',
  styleUrl: './edit-student.component.scss'
})
export class EditStudentComponent implements OnInit {
  studentId: number = 0;
  student: StudentDetails | null = null;
  
  // Form fields
  fullName: string = '';
  dateOfBirth: string = '';
  gender: string = '';
  medicalNotes: string = '';
  
  // Photo handling
  photoFile: File | null = null;
  photoPreview: string | null = null;
  existingPhotoUrl: string | null = null;
  removePhoto: boolean = false;
  
  // UI state
  isLoading: boolean = false;
  isSaving: boolean = false;
  medicalNotesExpanded: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private studentService: StudentService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.studentId = parseInt(id, 10);
      this.loadStudent();
    } else {
      this.toastService.error('Invalid student ID');
      this.goBack();
    }
  }

  loadStudent(): void {
    this.isLoading = true;

    this.studentService.getStudentById(this.studentId).subscribe({
      next: (student) => {
        this.student = student;
        
        // Pre-fill form
        this.fullName = student.fullName;
        this.dateOfBirth = this.formatDateForInput(student.dateOfBirth);
        this.gender = student.gender;
        this.medicalNotes = student.medicalNotes || '';
        
        // Set existing photo
        if (student.hasPhoto) {
          this.existingPhotoUrl = this.studentService.getStudentPhotoUrl(this.studentId);
        }
        
        // Expand medical notes if they exist
        if (this.medicalNotes) {
          this.medicalNotesExpanded = true;
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading student:', error);
        this.toastService.error(extractApiError(error, 'Failed to load student details'));
        this.isLoading = false;
        this.goBack();
      }
    });
  }

  formatDateForInput(dateString: string): string {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  onPhotoSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.toastService.error('Please select a valid image file');
        return;
      }

      // Validate file size (2MB)
      if (file.size > 2 * 1024 * 1024) {
        this.toastService.error('Photo size must be less than 2MB');
        return;
      }

      this.photoFile = file;
      this.removePhoto = false;

      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.photoPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeExistingPhoto(): void {
    this.removePhoto = true;
    this.existingPhotoUrl = null;
    this.photoFile = null;
    this.photoPreview = null;
    this.toastService.info('Photo will be removed when you save');
  }

  undoRemovePhoto(): void {
    this.removePhoto = false;
    if (this.student?.hasPhoto) {
      this.existingPhotoUrl = this.studentService.getStudentPhotoUrl(this.studentId);
    }
  }

  toggleMedicalNotes(): void {
    this.medicalNotesExpanded = !this.medicalNotesExpanded;
  }

  selectGender(gender: string): void {
    this.gender = gender;
  }

  async saveStudent(): Promise<void> {
    // Validation
    if (!this.fullName.trim()) {
      this.toastService.error('Please enter student name');
      return;
    }

    if (!this.dateOfBirth) {
      this.toastService.error('Please select date of birth');
      return;
    }

    if (!this.gender) {
      this.toastService.error('Please select gender');
      return;
    }

    this.isSaving = true;

    try {
      const request: UpdateStudentRequest = {
        fullName: this.fullName.trim(),
        dateOfBirth: this.dateOfBirth,
        gender: this.gender,
        medicalNotes: this.medicalNotes.trim() || undefined,
        removePhoto: this.removePhoto
      };

      // Handle photo if changed
      if (this.photoFile) {
        const photoBase64 = await this.fileToBase64(this.photoFile);
        request.photoBase64 = photoBase64;
        request.photoContentType = this.photoFile.type;
        request.photoFileName = this.photoFile.name;
      }

      this.studentService.updateStudent(this.studentId, request).subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.success('Student updated successfully!');
            setTimeout(() => {
              this.router.navigate(['/students', this.studentId]);
            }, 1000);
          } else {
            this.toastService.error(response.message || 'Failed to update student');
            this.isSaving = false;
          }
        },
        error: (error) => {
          console.error('Error updating student:', error);
          this.toastService.error(extractApiError(error, 'Failed to update student'));
          this.isSaving = false;
        }
      });
    } catch (error) {
      console.error('Error preparing update:', error);
      this.toastService.error('Failed to prepare update');
      this.isSaving = false;
    }
  }

  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data:image/jpeg;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }

  cancel(): void {
    if (confirm('Discard changes and go back?')) {
      this.goBack();
    }
  }

  goBack(): void {
    this.router.navigate(['/students', this.studentId]);
  }
}
