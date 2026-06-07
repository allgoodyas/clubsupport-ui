import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { UserService } from '../../core/services/user.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher.component';
import { SidebarNavigationComponent } from '../../shared/components/sidebar-navigation/sidebar-navigation.component';
import { SidebarStateService } from '../../core/services/sidebar-state.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

interface User {
  userId: number;
  fullName: string;
  mobileNumber: string;
  email?: string;
  roleName: string;
  roleDisplayName?: string;
  isActive: boolean;
  createdOn: string;
}

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, LanguageSwitcherComponent, SidebarNavigationComponent, PageHeaderComponent],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss'
})
export class UserListComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  isLoading = false;
  searchTerm = '';
  
  // Sidebar navigation
  isSidebarOpen: boolean = false;

  constructor(
    private userService: UserService,
    private router: Router,
    private toastr: ToastService,
    private authService: AuthService,
    private sidebarState: SidebarStateService
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading = true;
    this.userService.getUsers().subscribe({
      next: (response: any) => {
        if (response.success) {
          this.users = response.users;
          this.filteredUsers = response.users;
          this.toastr.showSuccess(`📋 Loaded ${this.users.length} users`);
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.toastr.showError('❌ Failed to load users');
        this.isLoading = false;
      }
    });
  }

  onSearch(event: any) {
    const term = event.target.value.toLowerCase();
    this.searchTerm = term;

    if (!term) {
      this.filteredUsers = this.users;
      return;
    }

    this.filteredUsers = this.users.filter(user =>
      user.fullName.toLowerCase().includes(term) ||
      user.mobileNumber.includes(term) ||
      user.email?.toLowerCase().includes(term) ||
      user.roleName.toLowerCase().includes(term)
    );
  }

  toggleSidebar(): void { this.sidebarState.toggle(); }
  closeSidebar():  void { this.sidebarState.close();  }

  createNewUser() {
    this.router.navigate(['/users/register']);
  }

  editUser(userId: number) {
    this.router.navigate(['/users/edit', userId]);
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  goToSettings(): void {
    this.router.navigate(['/club/settings']);
  }

  getStatusBadgeClass(isActive: boolean): string {
    return isActive ? 'status-active' : 'status-inactive';
  }

  getStatusText(isActive: boolean): string {
    return isActive ? 'Active' : 'Inactive';
  }
}
