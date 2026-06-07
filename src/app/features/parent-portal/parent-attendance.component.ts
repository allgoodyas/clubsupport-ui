import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface AttendanceSummary {
  totalSlots: number;
  presentCount: number;
  absentCount: number;
  notMarkedCount: number;
  attendancePercentage: number;
}

interface EventBreakdown {
  eventId: number;
  eventName: string;
  enrollmentId: number;
  totalSlots: number;
  presentCount: number;
  attendancePercentage: number;
  // UI state
  expanded?: boolean;
  slots?: SlotDetail[];
  loadingSlots?: boolean;
}

interface SlotDetail {
  slotDate: string;
  status: string;          // 'Present' | 'Absent' | 'Late' | 'Excused' | 'upcoming'
  markedByName?: string;
  markedAt?: string;
  isFuture: boolean;
}

interface DetailedAttendanceResponse {
  success: boolean;
  eventInfo: {
    eventId: number;
    eventName: string;
    eventType: string;
    startDate: string;
    endDate: string;
    startTime?: string;
  };
  stats: {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    upcoming: number;
  };
  sessions: SlotDetail[];
  totalSessions: number;
  isWindowed: boolean;
  isFiltered: boolean;
  hasEarlier: boolean;
  hasLater: boolean;
}

@Component({
  selector: 'app-parent-attendance',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="attendance-page">

      <!-- Header -->
      <div class="att-header">
        <button class="btn-back" (click)="goBack()">← Back</button>
        <div class="header-title">
          <span class="header-icon">✓</span>
          <div>
            <h1>Attendance</h1>
            <p class="header-sub" *ngIf="studentName">{{ studentName }}</p>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div class="loading-wrap" *ngIf="loading">
        <div class="spinner-ring"></div>
        <p>Loading attendance...</p>
      </div>

      <!-- Error -->
      <div class="error-wrap" *ngIf="error && !loading">
        <span class="error-icon">⚠️</span>
        <p>{{ error }}</p>
        <button class="btn-retry" (click)="load()">Try Again</button>
      </div>

      <!-- Content -->
      <div class="att-content" *ngIf="!loading && !error && summary">

        <!-- ── Overall Summary Ring ── -->
        <div class="summary-card">
          <div class="ring-wrap">
            <svg class="ring-svg" viewBox="0 0 120 120">
              <!-- Background track -->
              <circle cx="60" cy="60" r="50" fill="none"
                      stroke="rgba(255,255,255,0.15)" stroke-width="12"/>
              <!-- Progress arc -->
              <circle cx="60" cy="60" r="50" fill="none"
                      [attr.stroke]="getRingColor(summary.attendancePercentage)"
                      stroke-width="12"
                      stroke-linecap="round"
                      stroke-dasharray="314"
                      [attr.stroke-dashoffset]="getRingOffset(summary.attendancePercentage)"
                      transform="rotate(-90 60 60)"/>
              <!-- Percentage text -->
              <text x="60" y="56" text-anchor="middle"
                    class="ring-pct-text" font-size="22" font-weight="700"
                    fill="white">
                {{ summary.attendancePercentage | number:'1.0-0' }}%
              </text>
              <text x="60" y="72" text-anchor="middle"
                    font-size="9" fill="rgba(255,255,255,0.7)">
                Overall
              </text>
            </svg>
          </div>

          <div class="summary-stats">
            <div class="stat-item present">
              <div class="stat-dot"></div>
              <div>
                <div class="stat-num">{{ summary.presentCount }}</div>
                <div class="stat-lbl">Present</div>
              </div>
            </div>
            <div class="stat-item absent">
              <div class="stat-dot"></div>
              <div>
                <div class="stat-num">{{ summary.absentCount }}</div>
                <div class="stat-lbl">Absent</div>
              </div>
            </div>
            <div class="stat-item total">
              <div class="stat-dot"></div>
              <div>
                <div class="stat-num">{{ summary.totalSlots }}</div>
                <div class="stat-lbl">Total Sessions</div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Empty State ── -->
        <div class="empty-state" *ngIf="eventBreakdown.length === 0">
          <div class="empty-icon">📋</div>
          <h3>No Attendance Records</h3>
          <p>Attendance hasn't been marked yet for any events.</p>
        </div>

        <!-- ── Per-Event Cards ── -->
        <div class="section-label" *ngIf="eventBreakdown.length > 0">
          By Event
        </div>

        <div class="event-cards" *ngIf="eventBreakdown.length > 0">
          <div class="event-card" *ngFor="let ev of eventBreakdown"
               [class.is-expanded]="ev.expanded">

            <!-- Card header — always visible -->
            <div class="event-card-header" (click)="toggleEvent(ev)">
              <div class="event-left">
                <div class="event-name">{{ ev.eventName }}</div>
                <div class="event-meta">
                  {{ ev.presentCount }} / {{ ev.totalSlots }} sessions attended
                </div>
                <!-- Progress bar -->
                <div class="progress-track">
                  <div class="progress-fill"
                       [style.width.%]="ev.attendancePercentage"
                       [style.background]="getBarColor(ev.attendancePercentage)">
                  </div>
                </div>
              </div>
              <div class="event-right">
                <div class="pct-badge"
                     [style.background]="getBadgeBg(ev.attendancePercentage)"
                     [style.color]="getBadgeColor(ev.attendancePercentage)">
                  {{ ev.attendancePercentage | number:'1.0-0' }}%
                </div>
                <span class="expand-arrow" [class.rotated]="ev.expanded">›</span>
              </div>
            </div>

            <!-- Slot detail — expanded -->
            <div class="slot-list" *ngIf="ev.expanded">
              <div class="slot-loading" *ngIf="ev.loadingSlots">
                Loading sessions...
              </div>
              <div *ngIf="!ev.loadingSlots && ev.slots?.length === 0" class="slot-empty">
                No session records found.
              </div>
              <div class="slot-item" *ngFor="let s of ev.slots"
                   [class.present]="s.status === 'Present'"
                   [class.absent]="s.status === 'Absent'"
                   [class.late]="s.status === 'Late'"
                   [class.excused]="s.status === 'Excused'"
                   [class.upcoming]="s.isFuture">
                <div class="slot-badge">{{ getStatusIcon(s.status) }}</div>
                <div class="slot-info">
                  <div class="slot-date">{{ s.slotDate | date:'EEE, dd MMM yyyy' }}</div>
                  <div class="slot-status">{{ s.isFuture ? 'Upcoming' : s.status }}</div>
                </div>
                <div class="slot-marker" *ngIf="s.markedByName && !s.isFuture">
                  <span class="marker-label">by {{ s.markedByName }}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ── Page layout ─────────────────────────────────────── */
    .attendance-page {
      min-height: 100vh;
      background: var(--bg-app, #0A0F1E);
      color: var(--text-primary, #E2E8F0);
    }

    /* ── Header ──────────────────────────────────────────── */
    .att-header {
      background: var(--gradient-primary, linear-gradient(135deg, #0B5345, #17A589));
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      position: sticky;
      top: 0;
      z-index: 10;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }

    .btn-back {
      background: rgba(255,255,255,0.15);
      color: white;
      border: 1px solid rgba(255,255,255,0.3);
      padding: 8px 14px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.875rem;
      white-space: nowrap;
      &:hover { background: rgba(255,255,255,0.25); }
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 10px;
      .header-icon { font-size: 1.5rem; }
      h1 { margin: 0; font-size: 1.25rem; color: white; }
      .header-sub { margin: 2px 0 0; font-size: 0.8rem; color: rgba(255,255,255,0.75); }
    }

    /* ── Loading / error ─────────────────────────────────── */
    .loading-wrap, .error-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      gap: 12px;
      color: var(--text-secondary, #94A3B8);
    }

    .spinner-ring {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255,255,255,0.1);
      border-top-color: var(--accent-primary, #00D4FF);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .error-icon { font-size: 2.5rem; }
    .btn-retry {
      background: var(--accent-primary, #00D4FF);
      color: #0A0F1E;
      border: none;
      padding: 10px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
    }

    /* ── Content wrapper ─────────────────────────────────── */
    .att-content {
      padding: 20px 16px;
      max-width: 600px;
      margin: 0 auto;
    }

    /* ── Summary card ────────────────────────────────────── */
    .summary-card {
      background: var(--gradient-primary, linear-gradient(135deg, #0B5345, #17A589));
      border-radius: 16px;
      padding: 24px 20px;
      display: flex;
      align-items: center;
      gap: 24px;
      margin-bottom: 24px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    }

    .ring-wrap {
      flex-shrink: 0;
    }

    .ring-svg {
      width: 110px;
      height: 110px;
    }

    .ring-pct-text {
      font-family: inherit;
    }

    .summary-stats {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 10px;
      .stat-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .stat-num { font-size: 1.1rem; font-weight: 700; color: white; }
      .stat-lbl { font-size: 0.75rem; color: rgba(255,255,255,0.7); }
      &.present .stat-dot { background: #4ADE80; }
      &.absent  .stat-dot { background: #F87171; }
      &.total   .stat-dot { background: rgba(255,255,255,0.5); }
    }

    /* ── Section label ───────────────────────────────────── */
    .section-label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-secondary, #94A3B8);
      margin-bottom: 12px;
    }

    /* ── Event cards ─────────────────────────────────────── */
    .event-cards {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .event-card {
      background: var(--bg-card, #1A2235);
      border-radius: 12px;
      border: 1px solid var(--bg-border, #1E2D45);
      overflow: hidden;
      transition: border-color 0.2s;
      &.is-expanded { border-color: var(--accent-primary, #00D4FF); }
    }

    .event-card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      cursor: pointer;
      user-select: none;
      &:hover { background: rgba(255,255,255,0.03); }
    }

    .event-left {
      flex: 1;
      min-width: 0;
    }

    .event-name {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text-primary, #E2E8F0);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 3px;
    }

    .event-meta {
      font-size: 0.75rem;
      color: var(--text-secondary, #94A3B8);
      margin-bottom: 8px;
    }

    .progress-track {
      height: 5px;
      background: rgba(255,255,255,0.1);
      border-radius: 99px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      border-radius: 99px;
      transition: width 0.6s ease;
    }

    .event-right {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .pct-badge {
      font-size: 0.9rem;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 99px;
      white-space: nowrap;
    }

    .expand-arrow {
      font-size: 1.2rem;
      color: var(--text-secondary, #94A3B8);
      transition: transform 0.25s;
      &.rotated { transform: rotate(90deg); }
    }

    /* ── Slot list ───────────────────────────────────────── */
    .slot-list {
      border-top: 1px solid var(--bg-border, #1E2D45);
      padding: 8px 0;
    }

    .slot-loading, .slot-empty {
      padding: 16px 20px;
      text-align: center;
      font-size: 0.85rem;
      color: var(--text-secondary, #94A3B8);
    }

    .slot-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.04);
      &:last-child { border-bottom: none; }
    }

    .slot-badge {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.9rem;
      flex-shrink: 0;
    }

    .slot-item.present .slot-badge { background: rgba(74,222,128,0.15); }
    .slot-item.absent  .slot-badge { background: rgba(248,113,113,0.15); }
    .slot-item.late    .slot-badge { background: rgba(251,191,36,0.15); }
    .slot-item.excused .slot-badge { background: rgba(148,163,184,0.15); }
    .slot-item.upcoming .slot-badge { background: rgba(96,165,250,0.15); }
    .slot-item.upcoming { opacity: 0.65; }

    .slot-info { flex: 1; min-width: 0; }
    .slot-date {
      font-size: 0.85rem;
      color: var(--text-primary, #E2E8F0);
      font-weight: 500;
    }
    .slot-status {
      font-size: 0.75rem;
      margin-top: 2px;
    }
    .slot-item.present .slot-status { color: #4ADE80; }
    .slot-item.absent  .slot-status { color: #F87171; }
    .slot-item.late    .slot-status { color: #FBBF24; }
    .slot-item.excused .slot-status { color: #94A3B8; }
    .slot-item.upcoming .slot-status { color: #60A5FA; }

    .slot-marker {
      flex-shrink: 0;
    }
    .marker-label {
      font-size: 0.7rem;
      color: var(--text-secondary, #94A3B8);
    }

    /* ── Empty state ─────────────────────────────────────── */
    .empty-state {
      text-align: center;
      padding: 48px 20px;
      .empty-icon { font-size: 3rem; margin-bottom: 16px; }
      h3 { margin: 0 0 8px; color: var(--text-primary, #E2E8F0); }
      p  { margin: 0; color: var(--text-secondary, #94A3B8); font-size: 0.875rem; }
    }
  `]
})
export class ParentAttendanceComponent implements OnInit {
  studentId = 0;
  studentName = '';
  loading = true;
  error = '';
  summary: AttendanceSummary | null = null;
  eventBreakdown: EventBreakdown[] = [];

  private readonly api = environment.apiUrl;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.studentId = Number(this.route.snapshot.paramMap.get('studentId'));
    // Try to get student name from history state
    const nav = this.router.getCurrentNavigation();
    this.studentName = nav?.extras?.state?.['studentName'] || '';
    this.load();
  }

  load() {
    this.loading = true;
    this.error = '';
    this.http.get<any>(`${this.api}/ParentProgress/student/${this.studentId}/attendance/summary`)
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.summary = res.summary;
            this.eventBreakdown = (res.eventBreakdown || []).map((e: EventBreakdown) => ({
              ...e,
              expanded: false,
              slots: [],
              loadingSlots: false
            }));
          } else {
            this.error = res.message || 'Failed to load attendance';
          }
          this.loading = false;
        },
        error: () => {
          this.error = 'Could not load attendance. Please try again.';
          this.loading = false;
        }
      });
  }

  toggleEvent(ev: EventBreakdown) {
    ev.expanded = !ev.expanded;
    if (ev.expanded && (!ev.slots || ev.slots.length === 0)) {
      this.loadSlots(ev);
    }
  }

  loadSlots(ev: EventBreakdown) {
    ev.loadingSlots = true;
    this.http.get<DetailedAttendanceResponse>(
      `${this.api}/ParentProgress/student/${this.studentId}/enrollment/${ev.enrollmentId}/attendance`
    ).subscribe({
      next: (res) => {
        ev.slots = res.sessions || [];
        ev.loadingSlots = false;
      },
      error: () => {
        ev.slots = [];
        ev.loadingSlots = false;
      }
    });
  }

  getRingOffset(pct: number): number {
    const circumference = 314;
    return circumference - (pct / 100) * circumference;
  }

  getRingColor(pct: number): string {
    if (pct >= 80) return '#4ADE80';
    if (pct >= 60) return '#FBBF24';
    return '#F87171';
  }

  getBarColor(pct: number): string {
    if (pct >= 80) return '#4ADE80';
    if (pct >= 60) return '#FBBF24';
    return '#F87171';
  }

  getBadgeBg(pct: number): string {
    if (pct >= 80) return 'rgba(74,222,128,0.15)';
    if (pct >= 60) return 'rgba(251,191,36,0.15)';
    return 'rgba(248,113,113,0.15)';
  }

  getBadgeColor(pct: number): string {
    if (pct >= 80) return '#4ADE80';
    if (pct >= 60) return '#FBBF24';
    return '#F87171';
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'Present':  return '✅';
      case 'Absent':   return '❌';
      case 'Late':     return '🕐';
      case 'Excused':  return '📝';
      case 'upcoming': return '📅';
      default:         return '⚪';
    }
  }

  goBack() {
    this.router.navigate(['/parent/dashboard']);
  }
}
