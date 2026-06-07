import { Component, OnInit, HostListener } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { EventsService } from '../../../core/services/events.service';
import { EventListItem } from '../../../shared/models/event.model';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserInfo } from '../../../models/api.models';
import { SidebarStateService } from '../../../core/services/sidebar-state.service';

@Component({
  selector: 'app-events-list',
  standalone: false,
  templateUrl: './events-list.component.html',
  styleUrls: [
    './events-list.component.scss',
    './events-list.component.pagination.scss'
  ]
})
export class EventsListComponent implements OnInit {
  currentUser: UserInfo | null = null;
  events: EventListItem[] = [];
  filteredEvents: EventListItem[] = [];
  loading = false;
  viewMode: 'grid' | 'table' | 'scheduler' = 'table';

  schedulerSubMode: 'week' | 'month' = 'week';
  schedulerDate: Date = new Date();

  popoverDay: Date | null = null;
  popoverEvents: EventListItem[] = [];
  popoverX = 0;
  popoverY = 0;

  activeMenuId: number | null = null;

  showEnrollDialog = false;
  selectedEventForEnrollment: EventListItem | null = null;
  showPaymentPanel = false;
  showTrainerModal = false;
  showAttendanceModal = false;
  selectedEventForManagement: EventListItem | null = null;

  searchTerm   = '';
  filterType   = '';
  filterStatus = '';
  isSidebarOpen = false;

  eventTypes: { value: string; label: string }[] = [];
  statusOptions: { value: string; label: string }[] = [];

  // ── Pagination ───────────────────────────────────────────────────────
  readonly pageSize = 15;
  currentPage = 1;

  get totalPages(): number {
    return Math.ceil(this.filteredEvents.length / this.pageSize) || 1;
  }

  get pagedEvents(): EventListItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredEvents.slice(start, start + this.pageSize);
  }

  /** End index label — e.g. "Showing 1–15 of 47" */
  get pageEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredEvents.length);
  }

  get pageStart(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageNumbers(): number[] {
    const total = this.totalPages;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = new Set<number>([1, total]);
    for (let i = Math.max(2, this.currentPage - 2);
             i <= Math.min(total - 1, this.currentPage + 2); i++) {
      pages.add(i);
    }
    return Array.from(pages).sort((a, b) => a - b);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.activeMenuId = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Constructor & lifecycle ───────────────────────────────────────────

  constructor(
    private eventsService: EventsService,
    private router: Router,
    private route: ActivatedRoute,
    private toastService: ToastService,
    private authService: AuthService,
    private translate: TranslateService,
    private sidebarState: SidebarStateService
  ) { }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => { this.currentUser = user; });

    this.eventTypes = [
      { value: '', label: this.translate.instant('EVENTS.ALL_TYPES') },
      { value: 'Training', label: this.translate.instant('EVENTS.TRAINING') },
      { value: 'Competition', label: this.translate.instant('EVENTS.COMPETITION') },
      { value: 'Camp', label: this.translate.instant('EVENTS.CAMP') },
      { value: 'Workshop', label: this.translate.instant('EVENTS.WORKSHOP') }
    ];

    this.statusOptions = [
      { value: '', label: this.translate.instant('EVENTS.ALL_STATUS') },
      { value: 'Published', label: this.translate.instant('EVENTS.PUBLISHED') },
      { value: 'Draft', label: this.translate.instant('EVENTS.DRAFT') },
      { value: 'Cancelled', label: this.translate.instant('EVENTS.STATUS_CANCELLED') }
    ];

    const qp = this.route.snapshot.queryParams;
    if (qp['search']) this.searchTerm   = qp['search'];
    if (qp['type'])   this.filterType   = qp['type'];
    if (qp['status']) this.filterStatus = qp['status'];
    if (qp['view'] && ['grid', 'table', 'scheduler'].includes(qp['view'])) {
      this.viewMode = qp['view'] as 'grid' | 'table' | 'scheduler';
    }

    this.loadEvents();
  }

  // ── Menu ─────────────────────────────────────────────────────────────

  @HostListener('document:click')
  onDocumentClick(): void { this.activeMenuId = null; }

  toggleMenu(eventId: number, $event: MouseEvent): void {
    $event.stopPropagation();
    this.activeMenuId = this.activeMenuId === eventId ? null : eventId;
  }

  menuView(eventId: number, $event: MouseEvent): void {
    $event.stopPropagation(); this.activeMenuId = null; this.viewEvent(eventId);
  }
  menuEdit(eventId: number, $event: MouseEvent): void {
    $event.stopPropagation(); this.activeMenuId = null; this.editEvent(eventId);
  }
  menuRecreate(eventId: number, $event: MouseEvent): void {
    $event.stopPropagation(); this.activeMenuId = null; this.recreateEvent(eventId);
  }
  menuTrainers(event: EventListItem, $event: MouseEvent): void {
    $event.stopPropagation(); this.activeMenuId = null; this.openTrainerModal(event);
  }
  menuAttendance(event: EventListItem, $event: MouseEvent): void {
    $event.stopPropagation(); this.activeMenuId = null; this.openAttendanceModal(event);
  }

  // ── Data ─────────────────────────────────────────────────────────────

  loadEvents(): void {
    this.loading = true;
    this.eventsService.getEvents().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.events = response.data;
          this.applyFilters();
        } else {
          this.toastService.showError('Failed to load events');
        }
        this.loading = false;
      },
      error: () => {
        this.toastService.showError('Error loading events');
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    this.filteredEvents = this.events.filter(event => {
      const matchesSearch = !this.searchTerm ||
        event.eventNameEn.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (event.eventNameAr && event.eventNameAr.includes(this.searchTerm)) ||
        (event.sport && event.sport.toLowerCase().includes(this.searchTerm.toLowerCase()));

      const matchesType = !this.filterType
        ? true
        : this.filterType === 'Subscription'
          ? (event as any).isSubscription === true
          : event.eventType === this.filterType;

      const matchesStatus = !this.filterStatus || event.status === this.filterStatus;

      return matchesSearch && matchesType && matchesStatus;
    });

    this.currentPage = 1;  // always reset to page 1 on filter change
  }

  onSearchChange(): void       { this.applyFilters(); }
  onTypeFilterChange(): void   { this.applyFilters(); }
  onStatusFilterChange(): void { this.applyFilters(); }

  clearFilters(): void {
    this.searchTerm   = '';
    this.filterType   = '';
    this.filterStatus = '';
    this.applyFilters();
  }

  // ── Actions ──────────────────────────────────────────────────────────

  openEnrollDialog(event: EventListItem): void {
    this.router.navigate(['/events', event.eventId, 'enroll'], {
      queryParams: {
        search: this.searchTerm   || null,
        type:   this.filterType   || null,
        status: this.filterStatus || null,
        view:   this.viewMode     || null
      }
    });
  }

  closeEnrollDialog(): void {
    this.showEnrollDialog = false;
    this.selectedEventForEnrollment = null;
  }

  onStudentEnrolled(): void {
    this.loadEvents();
    this.toastService.showSuccess('Student enrolled successfully!');
  }

  openPaymentPanel(event: EventListItem): void {
    this.selectedEventForManagement = event;
    this.showPaymentPanel = true;
  }

  closePaymentPanel(): void {
    this.showPaymentPanel = false;
    this.selectedEventForManagement = null;
  }

  onPaymentRecorded(): void { this.closePaymentPanel(); this.loadEvents(); }

  openTrainerModal(event: EventListItem): void {
    this.selectedEventForManagement = event;
    this.showTrainerModal = true;
  }

  closeTrainerModal(): void {
    this.showTrainerModal = false;
    this.selectedEventForManagement = null;
  }

  onTrainerAssigned(): void { this.toastService.showSuccess('Trainer assigned successfully'); }

  openAttendanceModal(event: EventListItem): void {
    this.selectedEventForManagement = event;
    this.showAttendanceModal = true;
  }

  closeAttendanceModal(): void {
    this.showAttendanceModal = false;
    this.selectedEventForManagement = null;
  }

  onAttendanceMarked(): void { this.toastService.showSuccess('Attendance marked successfully'); }

  createEvent(): void { this.router.navigate(['/events/create']); }
  viewEvent(eventId: number): void { this.router.navigate(['/events', eventId]); }
  editEvent(eventId: number): void { this.router.navigate(['/events', eventId, 'edit']); }
  recreateEvent(eventId: number): void {
    this.router.navigate(['/events/create'], { queryParams: { clone: eventId } });
  }

  toggleSidebar(): void { this.sidebarState.toggle(); }
  closeSidebar():  void { this.sidebarState.close();  }
  goToSettings(): void  { this.router.navigate(['/club/settings']); }
  goToDashboard(): void { this.router.navigate(['/dashboard']); }

  // ── Scheduler ────────────────────────────────────────────────────────

  schedulerNav(dir: -1 | 1): void {
    const d = new Date(this.schedulerDate);
    this.schedulerSubMode === 'week'
      ? d.setDate(d.getDate() + dir * 7)
      : d.setMonth(d.getMonth() + dir);
    this.schedulerDate = d;
    this.closePopover();
  }

  goToToday(): void { this.schedulerDate = new Date(); this.closePopover(); }

  getWeekDays(): Date[] {
    const d = new Date(this.schedulerDate);
    d.setDate(d.getDate() - d.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const dd = new Date(d); dd.setDate(d.getDate() + i); return dd;
    });
  }

  getMonthCells(): Date[] {
    const y = this.schedulerDate.getFullYear();
    const m = this.schedulerDate.getMonth();
    const first = new Date(y, m, 1);
    const sun   = new Date(first);
    sun.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const dd = new Date(sun); dd.setDate(sun.getDate() + i); return dd;
    });
  }

  isOtherMonth(d: Date): boolean { return d.getMonth() !== this.schedulerDate.getMonth(); }

  isToday(d: Date): boolean {
    const t = new Date();
    return d.getFullYear() === t.getFullYear()
        && d.getMonth()    === t.getMonth()
        && d.getDate()     === t.getDate();
  }

  getEventsForDay(day: Date): EventListItem[] {
    const dd = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    return this.filteredEvents.filter(ev => {
      const s = new Date(ev.startDate);
      const e = new Date(ev.endDate || ev.startDate);
      return dd >= new Date(s.getFullYear(), s.getMonth(), s.getDate())
          && dd <= new Date(e.getFullYear(), e.getMonth(), e.getDate());
    });
  }

  getChipClass(eventType: string): string {
    const map: Record<string, string> = {
      Training: 'chip-training', Competition: 'chip-competition',
      Camp: 'chip-camp', Workshop: 'chip-workshop'
    };
    return map[eventType] || 'chip-default';
  }

  getWeekRangeLabel(): string {
    const days  = this.getWeekDays();
    const first = days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const last  = days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${first} – ${last}`;
  }

  getMonthLabel(): string {
    return this.schedulerDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  openPopover(day: Date, evs: EventListItem[], $event: MouseEvent): void {
    $event.stopPropagation();
    if (evs.length === 0) return;
    if (this.popoverDay && this.isSameDay(this.popoverDay, day)) { this.closePopover(); return; }
    this.popoverDay = day; this.popoverEvents = evs;
  }

  closePopover(): void { this.popoverDay = null; this.popoverEvents = []; }

  isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth()    === b.getMonth()
        && a.getDate()     === b.getDate();
  }

  popoverDayLabel(): string {
    if (!this.popoverDay) return '';
    return this.popoverDay.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }

  popoverOpenPayment(ev: EventListItem): void   { this.closePopover(); this.openPaymentPanel(ev); }
  popoverOpenAttendance(ev: EventListItem): void { this.closePopover(); this.openAttendanceModal(ev); }
  popoverViewEvent(ev: EventListItem): void      { this.closePopover(); this.viewEvent(ev.eventId); }

  // ── Display helpers ───────────────────────────────────────────────────

  getEventIcon(eventType: string): string {
    const icons: Record<string, string> = {
      Training: '🏋️', Competition: '🏆', Camp: '🏕️', Workshop: '🎓'
    };
    return icons[eventType] || '📅';
  }

  getStatusBadgeClass(status?: string): string {
    const cls: Record<string, string> = {
      Published: 'badge-success', Draft: 'badge-warning',
      Cancelled: 'badge-danger',  Active: 'badge-info'
    };
    return cls[status || 'Draft'] || 'badge-secondary';
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatDateRange(start: string, end: string): string {
    const s = this.formatDate(start), e = this.formatDate(end);
    return s === e ? s : `${s} – ${e}`;
  }

  getCapacityPercentage(event: EventListItem): number {
    return (event.currentEnrollment / event.maxParticipants) * 100;
  }

  getCapacityClass(event: EventListItem): string {
    const p = this.getCapacityPercentage(event);
    if (p >= 90) return 'capacity-full';
    if (p >= 70) return 'capacity-high';
    if (p >= 50) return 'capacity-medium';
    return 'capacity-low';
  }

  getBannerUrl(eventId: number): string {
    return this.eventsService.getEventBannerUrl(eventId);
  }
}
