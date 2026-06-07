import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

interface MenuItem {
  label: string;
  translationKey: string;
  icon: string;
  route: string;
  roles?: string[];
}

@Component({
  selector: 'app-hamburger-menu',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './hamburger-menu.component.html',
  styleUrl: './hamburger-menu.component.scss'
})
export class HamburgerMenuComponent implements OnInit {
  isOpen = false;
  
  menuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      translationKey: 'DASHBOARD.TITLE',
      icon: '🏠',
      route: '/dashboard'
    },
    {
      label: 'Users',
      translationKey: 'USERS.TITLE',
      icon: '👥',
      route: '/users/list',
      roles: ['admin']
    },
    {
      label: 'Events',
      translationKey: 'EVENTS.TITLE',
      icon: '📅',
      route: '/events/list'
    },
    {
      label: 'Payments',
      translationKey: 'PAYMENTS.TITLE',
      icon: '💳',
      route: '/payments'
    },
    {
      label: 'Subscriptions',
      translationKey: 'SUBSCRIPTIONS.TITLE',
      icon: '📋',
      route: '/subscriptions/admin',
      roles: ['admin']
    },
    {
      label: 'Students',
      translationKey: 'STUDENTS.TITLE',
      icon: '🎓',
      route: '/students/list'
    }
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {}

  toggleMenu(): void {
    this.isOpen = !this.isOpen;
    
    // Prevent body scroll when menu is open
    if (this.isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  closeMenu(): void {
    this.isOpen = false;
    document.body.style.overflow = '';
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
    this.closeMenu();
  }

  // Close menu when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const clickedInside = target.closest('.hamburger-menu');
    
    if (!clickedInside && this.isOpen) {
      this.closeMenu();
    }
  }

  // Close menu on escape key
  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isOpen) {
      this.closeMenu();
    }
  }
}
