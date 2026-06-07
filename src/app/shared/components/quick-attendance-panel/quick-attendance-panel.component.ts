import {
  Component, Input, Output, EventEmitter,
  OnChanges, SimpleChanges, NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import {
  AttendanceService,
  EventAttendanceByDateDto,
  StudentAttendanceDto,
  BulkAttendanceDto
} from '../../services/attendance.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../services/toast.service';
import { environment } from '../../../../environments/environment';

type Step = 'students' | 'events' | 'attendance';

interface StudentItem {
  studentId: number;
  fullName: string;
  age: number;
  gender: string;
  hasPhoto: boolean;
  photoUrl?: SafeUrl;
}

interface EventItem {
  eventId: number;
  eventName: string;
  eventType: string;
  startDate: string;
  endDate: string;
  isPrimary: boolean;         // enrolled and active today
  enrollmentCount?: number;
}

@Component({
  selector: 'app-quick-attendance-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quick-attendance-panel.component.html',
  styleUrls: ['./quick-attendance-panel.component.scss']
})
export class QuickAttendancePanelComponent implements OnChanges {

  @Input()  isOpen = false;
  @Output() closePanel = new EventEmitter<void>();

  // ── Steps ────────────────────────────────────────────────────────────────────
  step: Step = 'students';

  // ── Step 1: Students ─────────────────────────────────────────────────────────
  students: StudentItem[] = [];
  filteredStudents: StudentItem[] = [];
  studentSearch = '';
  loadingStudents = false;
  private photoUrls = new Map<number, SafeUrl>();
  private blobUrls: string[] = [];

  // ── Step 2: Events ───────────────────────────────────────────────────────────
  selectedStudent: StudentItem | null = null;
  enrolledEvents: EventItem[] = [];   // student's own enrolled & active events
  otherEvents:    EventItem[] = [];   // all other active club events
  loadingEvents = false;

  // ── Step 3: Attendance ───────────────────────────────────────────────────────
  selectedEvent: EventItem | null = null;
  attendanceDate: string = '';
  maxDate: string = '';
  attendanceData: EventAttendanceByDateDto | null = null;
  studentStatuses = new Map<number, string>();
  studentNotes    = new Map<number, string>();
  loadingAttendance = false;
  savingIds         = new Set<number>(); // per-student saving indicator
  studentFilter = '';

  // ── Today's date ─────────────────────────────────────────────────────────────
  private readonly today: string;

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private attendanceService: AttendanceService,
    private authService: AuthService,
    private toastService: ToastService,
    private ngZone: NgZone
  ) {
    const d = new Date();
    this.today = this.formatDateStr(d);
    this.attendanceDate = this.today;
    this.maxDate        = this.today;
  }

  ngOnChanges(c: SimpleChanges) {
    if (c['isOpen']) {
      if (this.isOpen) {
        this.reset();
        this.loadStudents();
      } else {
        this.blobUrls.forEach(u => URL.revokeObjectURL(u));
        this.blobUrls = [];
        this.photoUrls.clear();
      }
    }
  }

  // ── Reset ─────────────────────────────────────────────────────────────────────
  private reset() {
    this.step              = 'students';
    this.studentSearch     = '';
    this.selectedStudent   = null;
    this.selectedEvent     = null;
    this.attendanceData    = null;
    this.studentStatuses   = new Map();
    this.studentNotes      = new Map();
    this.enrolledEvents    = [];
    this.otherEvents       = [];
    this.attendanceDate    = this.today;
    this.studentFilter     = '';
  }

  close() { this.closePanel.emit(); }

  // ── STEP 1: Load students ────────────────────────────────────────────────────
  loadStudents() {
    this.loadingStudents = true;
    this.http.get<any[]>(`${environment.apiUrl}/students`).subscribe({
      next: students => {
        this.ngZone.run(() => {
          this.students = students.map(s => ({
            studentId: s.studentId,
            fullName:  s.fullName,
            age:       s.age,
            gender:    s.gender,
            hasPhoto:  s.hasPhoto
          }));
          this.applyStudentFilter();
          this.loadingStudents = false;
          // Load photos lazily
          this.students.filter(s => s.hasPhoto).forEach(s => this.loadPhoto(s.studentId));
        });
      },
      error: () => { this.ngZone.run(() => { this.loadingStudents = false; }); }
    });
  }

  private loadPhoto(studentId: number) {
    if (this.photoUrls.has(studentId)) return;
    this.http.get(`${environment.apiUrl}/students/${studentId}/photo`, { responseType: 'blob' }).subscribe({
      next: blob => {
        this.ngZone.run(() => {
          const url = URL.createObjectURL(blob);
          this.blobUrls.push(url);
          this.photoUrls.set(studentId, this.sanitizer.bypassSecurityTrustUrl(url));
        });
      },
      error: () => {}
    });
  }

  getPhotoUrl(studentId: number): SafeUrl | null {
    return this.photoUrls.get(studentId) || null;
  }

  applyStudentFilter() {
    const q = this.studentSearch.toLowerCase().trim();
    this.filteredStudents = q
      ? this.students.filter(s => s.fullName.toLowerCase().includes(q))
      : [...this.students];
  }

  // ── STEP 2: Select student → load their events ────────────────────────────────
  selectStudent(student: StudentItem) {
    this.selectedStudent = student;
    this.step = 'events';
    this.loadEvents(student.studentId);
  }

  private loadEvents(studentId: number) {
    this.loadingEvents = true;
    this.enrolledEvents = [];
    this.otherEvents    = [];

    // Load student's own enrollments
    this.http.get<any>(`${environment.apiUrl}/enrollments/student/${studentId}`).subscribe({
      next: res => {
        const enrollments: any[] = res.data || res.enrollments || res || [];
        const enrolledIds = new Set<number>();

        this.enrolledEvents = enrollments
          .filter((e: any) => e.isActive !== false && e.isCancelled !== true)
          .map((e: any) => {
            const eventId = e.eventId || e.EventId;
            enrolledIds.add(eventId);
            return {
              eventId,
              eventName:       e.eventName || e.eventNameEn || e.EventNameEn || '',
              eventType:       e.eventType || e.EventType || 'Event',
              startDate:       e.startDate || e.StartDate || '',
              endDate:         e.endDate   || e.EndDate   || '',
              isPrimary:       true,
              enrollmentCount: e.currentEnrollment
            } as EventItem;
          });

        // Now load all active club events, exclude already enrolled
        this.http.get<any>(`${environment.apiUrl}/events`).subscribe({
          next: evRes => {
            const allEvents: any[] = evRes.data || evRes.events || evRes || [];
            this.otherEvents = allEvents
              .filter((e: any) => {
                const id = e.eventId || e.EventId;
                return !enrolledIds.has(id) && (e.status === 'Active' || e.isActive !== false);
              })
              .map((e: any) => ({
                eventId:         e.eventId || e.EventId,
                eventName:       e.eventNameEn || e.eventName || '',
                eventType:       e.eventType   || '',
                startDate:       e.startDate   || '',
                endDate:         e.endDate     || '',
                isPrimary:       false,
                enrollmentCount: e.currentEnrollment
              } as EventItem));

            this.ngZone.run(() => { this.loadingEvents = false; });
          },
          error: () => { this.ngZone.run(() => { this.loadingEvents = false; }); }
        });
      },
      error: () => {
        // If enrollment fails, just load all events
        this.http.get<any>(`${environment.apiUrl}/events`).subscribe({
          next: evRes => {
            const allEvents: any[] = evRes.data || evRes.events || evRes || [];
            this.otherEvents = allEvents
              .filter((e: any) => e.status === 'Active' || e.isActive !== false)
              .map((e: any) => ({
                eventId:    e.eventId || e.EventId,
                eventName:  e.eventNameEn || e.eventName || '',
                eventType:  e.eventType   || '',
                startDate:  e.startDate   || '',
                endDate:    e.endDate     || '',
                isPrimary:  false
              } as EventItem));
            this.ngZone.run(() => { this.loadingEvents = false; });
          },
          error: () => { this.ngZone.run(() => { this.loadingEvents = false; }); }
        });
      }
    });
  }

  // ── STEP 3: Select event → mark attendance ────────────────────────────────────
  selectEvent(event: EventItem) {
    this.selectedEvent  = event;
    this.step           = 'attendance';
    this.attendanceDate = this.today;
    this.loadAttendance();
  }

  loadAttendance() {
    if (!this.selectedEvent) return;
    this.loadingAttendance = true;
    this.attendanceData    = null;

    this.attendanceService.getAttendanceByDate(this.selectedEvent.eventId, this.attendanceDate).subscribe({
      next: data => {
        this.ngZone.run(() => {
          this.attendanceData = data;
          this.studentStatuses = new Map();
          this.studentNotes    = new Map();
          data.students.forEach(s => {
            this.studentStatuses.set(s.enrollmentId, s.status || 'Absent');
            this.studentNotes.set(s.enrollmentId,    s.notes  || '');
          });
          this.loadingAttendance = false;
        });
      },
      error: () => { this.ngZone.run(() => { this.loadingAttendance = false; }); }
    });
  }

  onDateChange() { this.loadAttendance(); }

  getStatus(enrollmentId: number): string {
    return this.studentStatuses.get(enrollmentId) || 'Absent';
  }

  isSaving(enrollmentId: number): boolean {
    return this.savingIds.has(enrollmentId);
  }

  // Called by each emoji button — saves immediately for that one student
  markStudent(enrollmentId: number, studentId: number, status: string) {
    if (!this.selectedEvent || this.savingIds.has(enrollmentId)) return;

    this.studentStatuses.set(enrollmentId, status);
    this.savingIds.add(enrollmentId);

    const dto: BulkAttendanceDto = {
      eventId:        this.selectedEvent.eventId,
      attendanceDate: new Date(this.attendanceDate),
      students: [{ enrollmentId, studentId, status } as StudentAttendanceDto]
    };

    this.attendanceService.markBulkAttendance(dto).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.savingIds.delete(enrollmentId);
          // Mark the student as saved in local data
          const s = this.attendanceData?.students.find(x => x.enrollmentId === enrollmentId);
          if (s) s.isMarked = true;
        });
      },
      error: err => {
        this.ngZone.run(() => {
          this.savingIds.delete(enrollmentId);
          this.toastService.showError(err.error?.message || 'Failed to save');
        });
      }
    });
  }

  // Bulk actions — save all at once
  markAllPresent() {
    if (!this.attendanceData || !this.selectedEvent) return;
    this.attendanceData.students.forEach(s => this.studentStatuses.set(s.enrollmentId, 'Present'));

    const dto: BulkAttendanceDto = {
      eventId:        this.selectedEvent.eventId,
      attendanceDate: new Date(this.attendanceDate),
      students:       this.attendanceData.students.map(s =>
        ({ enrollmentId: s.enrollmentId, studentId: s.studentId, status: 'Present' } as StudentAttendanceDto))
    };
    this.attendanceService.markBulkAttendance(dto).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.attendanceData?.students.forEach(s => s.isMarked = true);
          this.toastService.showSuccess('✅ All marked Present');
        });
      },
      error: err => {
        this.ngZone.run(() => this.toastService.showError(err.error?.message || 'Failed to save'));
      }
    });
  }

  markAllAbsent() {
    if (!this.attendanceData || !this.selectedEvent) return;
    this.attendanceData.students.forEach(s => this.studentStatuses.set(s.enrollmentId, 'Absent'));

    const dto: BulkAttendanceDto = {
      eventId:        this.selectedEvent.eventId,
      attendanceDate: new Date(this.attendanceDate),
      students:       this.attendanceData.students.map(s =>
        ({ enrollmentId: s.enrollmentId, studentId: s.studentId, status: 'Absent' } as StudentAttendanceDto))
    };
    this.attendanceService.markBulkAttendance(dto).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.attendanceData?.students.forEach(s => s.isMarked = true);
          this.toastService.showSuccess('❌ All marked Absent');
        });
      },
      error: err => {
        this.ngZone.run(() => this.toastService.showError(err.error?.message || 'Failed to save'));
      }
    });
  }

  getTotalPresent(): number {
    if (!this.attendanceData) return 0;
    return this.attendanceData.students.filter(s => this.getStatus(s.enrollmentId) === 'Present').length;
  }

  getTotalAbsent(): number {
    if (!this.attendanceData) return 0;
    return this.attendanceData.students.filter(s => this.getStatus(s.enrollmentId) === 'Absent').length;
  }

  getAttendancePct(): number {
    if (!this.attendanceData?.students.length) return 0;
    return Math.round((this.getTotalPresent() / this.attendanceData.students.length) * 100);
  }

  getFilteredStudents() {
    if (!this.attendanceData) return [];
    const q = this.studentFilter.toLowerCase().trim();
    return q
      ? this.attendanceData.students.filter(s => s.studentName.toLowerCase().includes(q))
      : this.attendanceData.students;
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  // ── Navigation ────────────────────────────────────────────────────────────────
  goBackToStudents() {
    this.selectedStudent = null;
    this.selectedEvent   = null;
    this.attendanceData  = null;
    this.step = 'students';
  }

  goBackToEvents() {
    this.selectedEvent  = null;
    this.attendanceData = null;
    this.step = 'events';
  }

  eventTypeEmoji(type: string): string {
    const map: Record<string, string> = {
      Training: '🏋️', Tournament: '🏆', Camp: '🏕️',
      Workshop: '🎯', Match: '⚽', Competition: '🥇', Class: '📚'
    };
    return map[type] || '📅';
  }

  formatDate(d: string): string {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  private formatDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
}
