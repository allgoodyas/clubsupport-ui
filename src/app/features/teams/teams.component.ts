import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { SidebarNavigationComponent } from '../../shared/components/sidebar-navigation/sidebar-navigation.component';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';
import { SidebarStateService } from '../../core/services/sidebar-state.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { environment } from '../../../environments/environment';

interface Team {
  teamId: number;
  nameEn: string;
  nameAr?: string;
  ageGroup?: string;
  description?: string;
  color?: string;
  isActive: boolean;
  memberCount: number;
  createdAt: string;
}

interface TeamMember {
  studentId: number;
  fullName: string;
  age: number;
  gender: string;
  parentName?: string;
  parentMobile?: string;
  joinedDate: string;
}

interface AvailableStudent {
  studentId: number;
  fullName: string;
  age: number;
  gender: string;
  parentName?: string;
  currentTeam?: string;
}

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarNavigationComponent, PageHeaderComponent],
  templateUrl: './teams.component.html',
  styleUrls: ['./teams.component.scss']
})
export class TeamsComponent implements OnInit {
  private readonly apiBase = environment.apiUrl;

  isSidebarOpen = false;

  // Teams list
  teams: Team[] = [];
  loadingTeams = false;

  // Selected team panel
  selectedTeam: Team | null = null;
  members: TeamMember[] = [];
  loadingMembers = false;

  // Create / Edit form
  showForm = false;
  isEditMode = false;
  saving = false;
  form = this.emptyForm();

  // Assign students panel
  showAssignPanel = false;
  availableStudents: AvailableStudent[] = [];
  loadingAvailable = false;
  assignSearch = '';
  selectedStudentIds: Set<number> = new Set();
  assigning = false;

  // Color palette for team badges
  colorOptions = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
    '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'
  ];

  ageGroups = ['U-8', 'U-10', 'U-12', 'U-14', 'U-15', 'U-16', 'U-18', 'Senior'];

  constructor(
    private http: HttpClient,
    private router: Router,
    private themeService: ThemeService,
    private authService: AuthService,
    private sidebarState: SidebarStateService
  ) {}

  ngOnInit(): void {
    // Apply the club's dynamic theme — same as events, students, dashboard
    const user = this.authService.currentUserValue;
    if (user?.clubId) {
      this.themeService.loadAndApplyClubTheme(user.clubId)
        .subscribe({ error: () => this.themeService.loadThemeFromStorage() });
    } else {
      this.themeService.loadThemeFromStorage();
    }
    this.loadTeams();
  }

  // ── Load ─────────────────────────────────────────────────────

  loadTeams(): void {
    this.loadingTeams = true;
    this.http.get<Team[]>(`${this.apiBase}/teams`).subscribe({
      next: (t) => { this.teams = t; this.loadingTeams = false; },
      error: () => { this.loadingTeams = false; }
    });
  }

  selectTeam(team: Team): void {
    this.selectedTeam = team;
    this.loadMembers(team.teamId);
    this.showAssignPanel = false;
  }

  loadMembers(teamId: number): void {
    this.loadingMembers = true;
    this.members = [];
    const id = +teamId; // ensure numeric
    this.http.get<TeamMember[]>(`${this.apiBase}/teams/${id}/students`).subscribe({
      next: (m) => {
        console.log(`[Teams] loadMembers teamId=${id} returned ${m.length} members`, m);
        this.members = m;
        this.loadingMembers = false;
      },
      error: (err) => {
        console.error(`[Teams] loadMembers error for teamId=${id}:`, err);
        this.loadingMembers = false;
      }
    });
  }

  // ── Create / Edit ─────────────────────────────────────────────

  openCreate(): void {
    this.isEditMode = false;
    this.form = this.emptyForm();
    this.showForm = true;
  }

  openEdit(team: Team, event: Event): void {
    event.stopPropagation();
    this.isEditMode = true;
    this.form = {
      teamId: team.teamId,
      nameEn: team.nameEn,
      nameAr: team.nameAr || '',
      ageGroup: team.ageGroup || '',
      description: team.description || '',
      color: team.color || this.colorOptions[0],
      isActive: team.isActive
    };
    this.showForm = true;
  }

  closeForm(): void { this.showForm = false; }

  saveTeam(): void {
    if (!this.form.nameEn.trim()) return;
    this.saving = true;
    const body = {
      nameEn: this.form.nameEn.trim(),
      nameAr: this.form.nameAr?.trim() || undefined,
      ageGroup: this.form.ageGroup || undefined,
      description: this.form.description?.trim() || undefined,
      color: this.form.color || undefined,
      isActive: this.form.isActive
    };

    const req = this.isEditMode
      ? this.http.put(`${this.apiBase}/teams/${this.form.teamId}`, body)
      : this.http.post(`${this.apiBase}/teams`, body);

    req.subscribe({
      next: () => {
        this.saving = false;
        this.showForm = false;
        this.loadTeams();
        if (this.isEditMode && this.selectedTeam?.teamId === this.form.teamId) {
          this.selectedTeam = { ...this.selectedTeam, ...body };
        }
      },
      error: (err) => {
        this.saving = false;
        alert(err.error?.message || 'Failed to save team');
      }
    });
  }

  deleteTeam(team: Team, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Deactivate team "${team.nameEn}"?`)) return;
    this.http.delete(`${this.apiBase}/teams/${team.teamId}`).subscribe({
      next: () => {
        this.loadTeams();
        if (this.selectedTeam?.teamId === team.teamId) this.selectedTeam = null;
      }
    });
  }

  // ── Assign Students ───────────────────────────────────────────

  openAssignPanel(): void {
    if (!this.selectedTeam) return;
    this.showAssignPanel = true;
    this.selectedStudentIds.clear();
    this.assignSearch = '';
    this.loadAvailableStudents();
  }

  closeAssignPanel(): void { this.showAssignPanel = false; }

  loadAvailableStudents(): void {
    if (!this.selectedTeam) return;
    this.loadingAvailable = true;
    this.http.get<AvailableStudent[]>(
      `${this.apiBase}/teams/available-students/${this.selectedTeam.teamId}`
    ).subscribe({
      next: (s) => { this.availableStudents = s; this.loadingAvailable = false; },
      error: () => { this.loadingAvailable = false; }
    });
  }

  get filteredAvailable(): AvailableStudent[] {
    const q = this.assignSearch.toLowerCase().trim();
    if (!q) return this.availableStudents;
    return this.availableStudents.filter(s =>
      s.fullName.toLowerCase().includes(q) ||
      s.parentName?.toLowerCase().includes(q)
    );
  }

  toggleStudent(id: number): void {
    // Reassign a new Set so Angular change detection picks up the mutation
    const updated = new Set(this.selectedStudentIds);
    updated.has(id) ? updated.delete(id) : updated.add(id);
    this.selectedStudentIds = updated;
  }

  assignStudents(): void {
    if (!this.selectedTeam || this.selectedStudentIds.size === 0) return;
    this.assigning = true;
    this.http.post(`${this.apiBase}/teams/${this.selectedTeam.teamId}/students`, {
      studentIds: Array.from(this.selectedStudentIds)
    }).subscribe({
      next: () => {
        this.assigning = false;
        this.showAssignPanel = false;
        this.loadMembers(this.selectedTeam!.teamId);
        this.loadTeams(); // refresh member count
      },
      error: () => { this.assigning = false; }
    });
  }

  removeStudent(studentId: number): void {
    if (!this.selectedTeam) return;
    if (!confirm('Remove this student from the team?')) return;
    this.http.delete(
      `${this.apiBase}/teams/${this.selectedTeam.teamId}/students/${studentId}`
    ).subscribe({
      next: () => {
        this.members = this.members.filter(m => m.studentId !== studentId);
        if (this.selectedTeam) this.selectedTeam.memberCount--;
        this.loadTeams();
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────

  emptyForm() {
    return {
      teamId: 0,
      nameEn: '',
      nameAr: '',
      ageGroup: '',
      description: '',
      color: '#3B82F6',   // default — matches colorOptions[0]
      isActive: true
    };
  }

  getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  getTeamBadgeStyle(color?: string) {
    const c = color || '#3B82F6';
    return { 'background-color': c + '22', 'color': c, 'border-color': c + '55' };
  }

  toggleSidebar(): void { this.sidebarState.toggle(); }
  closeSidebar():  void { this.sidebarState.close();  }
  goBack(): void { this.router.navigate(['/dashboard']); }
}
