import { Component, Input, OnInit, Output, EventEmitter, OnChanges } from '@angular/core';
import { AttendanceService, EventAttendanceByDateDto, StudentAttendanceRecordDto, BulkAttendanceDto, StudentAttendanceDto } from '../../../../shared/services/attendance.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-attendance-modal',
  standalone: false,
  templateUrl: './attendance-modal.component.html',
  styleUrls: ['./attendance-modal.component.scss']
})
export class AttendanceModalComponent implements OnInit, OnChanges {
  @Input() eventId: number = 0;
  @Input() eventName: string = '';
  @Input() isOpen: boolean = false;
  @Output() closeModal = new EventEmitter<void>();
  @Output() attendanceMarked = new EventEmitter<void>();

  attendanceData: EventAttendanceByDateDto | null = null;
  selectedDate: string = '';
  maxDate: string = '';
  loading: boolean = false;
  filterText: string = '';

  // Track statuses and per-student saving state
  studentStatuses: Map<number, string> = new Map();
  studentNotes: Map<number, string> = new Map();
  savingIds: Set<number> = new Set();

  statusOptions = [
    { value: 'Present', label: 'Present', color: 'success' },
    { value: 'Absent', label: 'Absent', color: 'danger' },
    { value: 'Late', label: 'Late', color: 'warning' },
    { value: 'Excused', label: 'Excused', color: 'info' }
  ];

  constructor(
    private attendanceService: AttendanceService,
    private toastr: ToastService
  ) { }

  ngOnInit(): void {
    const today = new Date();
    this.selectedDate = this.formatDate(today);
    this.maxDate = this.formatDate(today);
    
    if (this.eventId && this.isOpen) {
      this.loadAttendance();
    }
  }

  ngOnChanges(): void {
    if (this.isOpen && this.eventId) {
      const today = new Date();
      this.selectedDate = this.formatDate(today);
      this.loadAttendance();
    }
  }

  loadAttendance(): void {
    this.loading = true;
    const dateStr = this.selectedDate;

    this.attendanceService.getAttendanceByDate(this.eventId, dateStr).subscribe({
      next: (data) => {
        this.attendanceData = data;
        data.students.forEach(student => {
          this.studentStatuses.set(student.enrollmentId, student.status);
          this.studentNotes.set(student.enrollmentId, student.notes || '');
        });
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading attendance:', error);
        this.toastr.showError('Failed to load attendance data');
        this.loading = false;
      }
    });
  }

  onDateChange(): void {
    this.loadAttendance();
  }

  getStatus(enrollmentId: number): string {
    return this.studentStatuses.get(enrollmentId) || 'Absent';
  }

  getNotes(enrollmentId: number): string {
    return this.studentNotes.get(enrollmentId) || '';
  }

  isSaving(enrollmentId: number): boolean {
    return this.savingIds.has(enrollmentId);
  }

  // Called when ⏰ Late button is tapped — sets status locally but does NOT save yet.
  // The remarks input + 💾 button appear; saving happens via saveLateWithRemarks().
  onLateClicked(enrollmentId: number, studentId: number): void {
    // If already Late, tapping again clears back to Absent (toggle off)
    if (this.studentStatuses.get(enrollmentId) === 'Late') {
      this.studentStatuses.set(enrollmentId, 'Absent');
      this.studentNotes.set(enrollmentId, '');
      return;
    }
    // Mark as Late locally — remarks input becomes visible
    this.studentStatuses.set(enrollmentId, 'Late');
  }

  // Called when 💾 is clicked or Enter is pressed inside the remarks input.
  // Saves Late status + notes together.
  saveLateWithRemarks(enrollmentId: number, studentId: number): void {
    if (this.savingIds.has(enrollmentId)) return;

    const notes = this.studentNotes.get(enrollmentId) || '';
    this.savingIds.add(enrollmentId);

    const dto: BulkAttendanceDto = {
      eventId:        this.eventId,
      attendanceDate: new Date(this.selectedDate),
      students: [{
        enrollmentId,
        studentId,
        status: 'Late',
        notes
      } as StudentAttendanceDto]
    };

    this.attendanceService.markBulkAttendance(dto).subscribe({
      next: () => {
        this.savingIds.delete(enrollmentId);
        const s = this.attendanceData?.students.find(x => x.enrollmentId === enrollmentId);
        if (s) {
          s.isMarked = true;
          s.notes = notes;
        }
        this.toastr.showSuccess('⏰ Late saved');
        this.attendanceMarked.emit();
      },
      error: (err) => {
        this.savingIds.delete(enrollmentId);
        this.toastr.showError(err.error?.message || 'Failed to save');
      }
    });
  }

  // Immediately saves one student when their emoji button is tapped (Present / Absent / Excused)
  markStudent(enrollmentId: number, studentId: number, status: string): void {
    if (this.savingIds.has(enrollmentId)) return;
    this.studentStatuses.set(enrollmentId, status);
    // Clear any notes when switching away from Late
    if (status !== 'Late') {
      this.studentNotes.set(enrollmentId, '');
    }
    this.savingIds.add(enrollmentId);

    const dto: BulkAttendanceDto = {
      eventId:        this.eventId,
      attendanceDate: new Date(this.selectedDate),
      students: [{ enrollmentId, studentId, status, notes: '' } as StudentAttendanceDto]
    };

    this.attendanceService.markBulkAttendance(dto).subscribe({
      next: () => {
        this.savingIds.delete(enrollmentId);
        const s = this.attendanceData?.students.find(x => x.enrollmentId === enrollmentId);
        if (s) s.isMarked = true;
        this.attendanceMarked.emit();
      },
      error: (err) => {
        this.savingIds.delete(enrollmentId);
        this.toastr.showError(err.error?.message || 'Failed to save');
      }
    });
  }

  updateNotes(enrollmentId: number, notes: string): void {
    this.studentNotes.set(enrollmentId, notes);
  }

  // Bulk actions
  markAllPresent(): void {
    if (!this.attendanceData) return;
    this.attendanceData.students.forEach(s => {
      this.studentStatuses.set(s.enrollmentId, 'Present');
      this.studentNotes.set(s.enrollmentId, '');
    });

    const dto: BulkAttendanceDto = {
      eventId:        this.eventId,
      attendanceDate: new Date(this.selectedDate),
      students:       this.attendanceData.students.map(s =>
        ({ enrollmentId: s.enrollmentId, studentId: s.studentId, status: 'Present', notes: '' } as StudentAttendanceDto))
    };
    this.attendanceService.markBulkAttendance(dto).subscribe({
      next: () => {
        this.attendanceData?.students.forEach(s => s.isMarked = true);
        this.toastr.showSuccess('✅ All marked Present');
        this.attendanceMarked.emit();
      },
      error: (err) => this.toastr.showError(err.error?.message || 'Failed to save')
    });
  }

  markAllAbsent(): void {
    if (!this.attendanceData) return;
    this.attendanceData.students.forEach(s => {
      this.studentStatuses.set(s.enrollmentId, 'Absent');
      this.studentNotes.set(s.enrollmentId, '');
    });

    const dto: BulkAttendanceDto = {
      eventId:        this.eventId,
      attendanceDate: new Date(this.selectedDate),
      students:       this.attendanceData.students.map(s =>
        ({ enrollmentId: s.enrollmentId, studentId: s.studentId, status: 'Absent', notes: '' } as StudentAttendanceDto))
    };
    this.attendanceService.markBulkAttendance(dto).subscribe({
      next: () => {
        this.attendanceData?.students.forEach(s => s.isMarked = true);
        this.toastr.showSuccess('❌ All marked Absent');
        this.attendanceMarked.emit();
      },
      error: (err) => this.toastr.showError(err.error?.message || 'Failed to save')
    });
  }

  close(): void {
    this.closeModal.emit();
  }

  formatDate(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'Present':  return 'badge-success';
      case 'Absent':   return 'badge-danger';
      case 'Late':     return 'badge-warning';
      case 'Excused':  return 'badge-info';
      default:         return 'badge-secondary';
    }
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  getTotalPresent(): number {
    if (!this.attendanceData) return 0;
    return this.attendanceData.students.filter(s => this.getStatus(s.enrollmentId) === 'Present').length;
  }

  getTotalAbsent(): number {
    if (!this.attendanceData) return 0;
    return this.attendanceData.students.filter(s => this.getStatus(s.enrollmentId) === 'Absent').length;
  }

  getAttendancePercentage(): number {
    if (!this.attendanceData || this.attendanceData.students.length === 0) return 0;
    return Math.round((this.getTotalPresent() / this.attendanceData.students.length) * 100);
  }

  getFilteredStudents(): StudentAttendanceRecordDto[] {
    if (!this.attendanceData) return [];
    if (!this.filterText || this.filterText.trim() === '') return this.attendanceData.students;
    const searchTerm = this.filterText.toLowerCase().trim();
    return this.attendanceData.students.filter(s => s.studentName.toLowerCase().includes(searchTerm));
  }

  onFilterChange(): void { }

  clearFilter(): void {
    this.filterText = '';
  }
}
