import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { ClubService } from '../../../core/services/club.service';
import { UserInfo } from '../../../models/api.models';

@Component({
  selector: 'app-master-admin-dashboard',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './master-admin-dashboard.component.html',
  styleUrls: ['./master-admin-dashboard.component.scss']
})
export class MasterAdminDashboardComponent implements OnInit {
  currentUser: UserInfo | null = null;
  totalClubs: number = 0;
  activeClubs: number = 0;
  totalUsers: number = 0;
  totalStudents: number = 0;

  constructor(
    private authService: AuthService,
    private clubService: ClubService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
    this.loadStats();
  }

  loadStats(): void {
    this.clubService.getAllClubs().subscribe({
      next: (clubs) => {
        this.totalClubs  = clubs.length;
        this.activeClubs = clubs.filter(c => c.isActive).length;
      },
      error: () => {}
    });
  }

  logout(): void {
    const redirectUrl = this.authService.getLogoutRedirectUrl();
    this.authService.logout();
    this.router.navigateByUrl(redirectUrl);
  }

  navigateToCreateClub(): void {
    this.router.navigate(['/master-admin/create-club']);
  }

  navigateToClubsList(): void {
    this.router.navigate(['/master-admin/clubs']);
  }
}
