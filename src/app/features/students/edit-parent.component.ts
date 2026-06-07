import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { StudentService } from '../../core/services/student.service';
import { UserService } from '../../core/services/user.service';
import { ToastService } from '../../shared/services/toast.service';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher.component';
import { StudentDetails } from '../../models/api.models';
import { extractApiError } from '../../core/utils/api-error.util';

@Component({
  selector: 'app-edit-parent',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    LanguageSwitcherComponent
  ],
  templateUrl: './edit-parent.component.html',
  styleUrl: './edit-parent.component.scss'
})
export class EditParentComponent implements OnInit {
  studentId: number = 0;
  student: StudentDetails | null = null;
  isLoading: boolean = false;
  isSaving: boolean = false;

  // Form fields
  parentName: string = '';
  parentMobile: string = '';
  parentEmail: string = '';
  parentRoleId: number = 0; // Store parent's role ID

  // Original values for comparison
  originalParentName: string = '';
  originalParentMobile: string = '';
  originalParentEmail: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private studentService: StudentService,
    private userService: UserService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.studentId = parseInt(id, 10);
      this.loadStudentDetails();
    } else {
      this.toastService.error('Invalid student ID');
      this.goBack();
    }
  }

  loadStudentDetails(): void {
    this.isLoading = true;

    this.studentService.getStudentById(this.studentId).subscribe({
      next: (student) => {
        this.student = student;
        
        // Populate form fields
        this.parentName = student.parentFullName || '';
        this.parentMobile = student.parentMobile || '';
        this.parentEmail = student.parentEmail || '';

        // Store original values
        this.originalParentName = this.parentName;
        this.originalParentMobile = this.parentMobile;
        this.originalParentEmail = this.parentEmail;

        // Load parent's role ID
        this.loadParentRoleId(student.parentId);

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading student details:', error);
        this.toastService.error(extractApiError(error, 'Failed to load student details'));
        this.isLoading = false;
        this.goBack();
      }
    });
  }

  loadParentRoleId(parentId: number): void {
    // Get parent's user details to find role ID
    this.userService.getUserById(parentId).subscribe({
      next: (response: any) => {
        if (response.success && response.user) {
          this.parentRoleId = response.user.roleId;
          console.log('Parent role ID loaded:', this.parentRoleId);
        }
      },
      error: (error) => {
        console.error('Error loading parent role:', error);
        // Default to parent role if we can't load it
        // You might want to handle this differently
      }
    });
  }

  saveParentInfo(): void {
    // Validation
    if (!this.parentName || !this.parentName.trim()) {
      this.toastService.error('Parent name is required');
      return;
    }

    // Email validation (if provided)
    if (this.parentEmail && this.parentEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.parentEmail.trim())) {
        this.toastService.error('Please enter a valid email address');
        return;
      }
    }

    // Check if anything changed (mobile is readonly, don't check it)
    if (
      this.parentName.trim() === this.originalParentName &&
      (this.parentEmail?.trim() || '') === this.originalParentEmail
    ) {
      this.toastService.info('No changes detected');
      return;
    }

    this.isSaving = true;

    const updateRequest = {
      userId: this.student!.parentId,
      fullName: this.parentName.trim(),
      email: this.parentEmail?.trim() || null,
      roleId: this.parentRoleId // Include role ID
    };

    console.log('Updating parent info:', updateRequest);

    this.userService.updateUser(updateRequest).subscribe({
      next: (response) => {
        console.log('Update response:', response);
        this.isSaving = false;
        this.toastService.success('Parent information updated successfully!');
        
        // Navigate back to student details
        this.router.navigate(['/students', this.studentId]);
      },
      error: (error) => {
        console.error('Error updating parent info:', error);
        this.isSaving = false;
        
        this.toastService.error(extractApiError(error, 'Failed to update parent information'));
      }
    });
  }

  hasChanges(): boolean {
    return (
      this.parentName.trim() !== this.originalParentName ||
      (this.parentEmail?.trim() || '') !== this.originalParentEmail
    );
  }

  cancel(): void {
    if (this.hasChanges()) {
      if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
        this.goBack();
      }
    } else {
      this.goBack();
    }
  }

  goBack(): void {
    this.router.navigate(['/students', this.studentId]);
  }
}
