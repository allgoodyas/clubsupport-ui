import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ClubService } from '../../../core/services/club.service';
import { AuthService } from '../../../core/services/auth.service';
import { ClubDetailsResponse } from '../../../models/api.models';
import { LanguageSwitcherComponent } from '../../../shared/components/language-switcher/language-switcher.component';

@Component({
  selector: 'app-clubs-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, LanguageSwitcherComponent],
  templateUrl: './clubs-list.component.html',
  styleUrls: ['./clubs-list.component.scss']
})
export class ClubsListComponent implements OnInit {
  clubs: ClubDetailsResponse[] = [];
  filteredClubs: ClubDetailsResponse[] = [];
  isLoading: boolean = false;
  errorMessage: string = '';
  
  // Filter state
  searchTerm: string = '';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';
  
  // View mode
  viewMode: 'grid' | 'table' = 'grid';
  
  // Computed counts
  get activeCount(): number {
    return this.clubs.filter(c => c.isActive).length;
  }
  
  get inactiveCount(): number {
    return this.clubs.filter(c => !c.isActive).length;
  }

  constructor(
    private clubService: ClubService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadClubs();
  }

  loadClubs(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.clubService.getAllClubs().subscribe({
      next: (clubs) => {
        this.clubs = clubs;
        this.filteredClubs = clubs;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.message || 'Failed to load clubs';
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.clubs];
    
    // Apply status filter
    if (this.statusFilter === 'active') {
      filtered = filtered.filter(c => c.isActive);
    } else if (this.statusFilter === 'inactive') {
      filtered = filtered.filter(c => !c.isActive);
    }
    
    // Apply search filter
    if (this.searchTerm.trim()) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.clubNameEn?.toLowerCase().includes(search) ||
        c.clubNameAr?.includes(search) ||
        c.clubCode?.toLowerCase().includes(search)
      );
    }
    
    this.filteredClubs = filtered;
  }

  onSearchChange(value: string): void {
    this.searchTerm = value;
    this.applyFilters();
  }

  onStatusFilterChange(status: 'all' | 'active' | 'inactive'): void {
    this.statusFilter = status;
    this.applyFilters();
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'grid' ? 'table' : 'grid';
  }

  viewClub(clubId: number): void {
    this.router.navigate(['/master-admin/clubs', clubId]);
  }

  editClub(clubId: number): void {
    this.router.navigate(['/master-admin/clubs', clubId, 'edit']);
  }

  // Confirmation dialog state
  confirmDialog = {
    show:    false,
    clubId:  0,
    clubName: '',
    isActive: false,
    loading: false
  };

  toggleClubStatus(club: ClubDetailsResponse): void {
    this.confirmDialog = {
      show:     true,
      clubId:   club.clubId,
      clubName: club.clubNameEn,
      isActive: club.isActive,
      loading:  false
    };
  }

  confirmToggle(): void {
    this.confirmDialog.loading = true;
    this.clubService.toggleClubStatus(this.confirmDialog.clubId).subscribe({
      next: (res) => {
        // Update in-memory list immediately
        const club = this.clubs.find(c => c.clubId === this.confirmDialog.clubId);
        if (club) club.isActive = res.isActive;
        this.applyFilters();
        this.confirmDialog.show    = false;
        this.confirmDialog.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.message || 'Failed to update club status';
        this.confirmDialog.loading = false;
        this.confirmDialog.show    = false;
      }
    });
  }

  cancelToggle(): void {
    this.confirmDialog.show = false;
  }

  createNewClub(): void {
    this.router.navigate(['/master-admin/create-club']);
  }

  goToDashboard(): void {
    this.router.navigate(['/master-admin']);
  }

  getStatusBadgeClass(isActive: boolean): string {
    return isActive ? 'badge-active' : 'badge-inactive';
  }

  getStatusText(isActive: boolean): string {
    return isActive ? 'Active' : 'Inactive';
  }

  formatDate(date: string | Date): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
