import { Component, OnInit } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { SidebarStateService } from '../../../core/services/sidebar-state.service';

@Component({
  selector: 'app-sidebar-navigation',
  standalone: true,
  imports: [CommonModule, AsyncPipe, TranslateModule],
  templateUrl: './sidebar-navigation.component.html',
  styleUrls: ['./sidebar-navigation.component.scss']
})
export class SidebarNavigationComponent implements OnInit {

  get isExpanded$() { return this.sidebarState.isExpanded$; }

  constructor(
    private router:       Router,
    private authService:  AuthService,
    private sidebarState: SidebarStateService
  ) {}

  ngOnInit(): void {}

  toggle(): void { this.sidebarState.toggle(); }

  // Keep for backward compat (pages call closeSidebar on closeRequested output)
  closeSidebar(): void { this.sidebarState.collapse(); }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  logout(): void {
    const redirectUrl = this.authService.getLogoutRedirectUrl();
    this.authService.logout();
    this.router.navigateByUrl(redirectUrl);
  }

  // Matches route and all sub-routes (e.g. /reports/financial also matches /reports)
  isActive(route: string): boolean {
    return this.router.url.startsWith(route);
  }

  // Exact match only — used for /reports so it doesn't highlight on /reports/financial
  isActiveExact(route: string): boolean {
    return this.router.url === route || this.router.url.startsWith(route + '?');
  }
}
