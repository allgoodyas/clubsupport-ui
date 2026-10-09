import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserGuideService, GuideChapter } from '../user-guide.service';
import { ChapterCardComponent } from '../components/chapter-card/chapter-card.component';
import { SidebarNavigationComponent } from '../../../shared/components/sidebar-navigation/sidebar-navigation.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { UserInfo } from '../../../models/api.models';

@Component({
  selector: 'app-user-guide-landing',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarNavigationComponent, PageHeaderComponent, ChapterCardComponent],
  templateUrl: './user-guide-landing.component.html',
  styleUrls: ['./user-guide-landing.component.scss'],
})
export class UserGuideLandingComponent implements OnInit {
  chapters: GuideChapter[] = [];
  searchQuery = '';
  searchResults: GuideChapter[] = [];
  isSearching = false;
  user: UserInfo | null = null;

  readonly demoAccounts = [
    { role: 'Club Admin', phone: '+966 50 918 7509', note: 'Full access to all admin features' },
    { role: 'Parent', phone: '+966 56 459 5338', note: 'Parent portal — children, invoices, progress' },
  ];

  constructor(
    private auth: AuthService,
    private guideService: UserGuideService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.user = this.auth.currentUserValue;
    this.chapters = this.guideService.getChaptersForUser(this.user);
  }

  onSearch(): void {
    this.isSearching = !!this.searchQuery.trim();
    this.searchResults = this.isSearching
      ? this.guideService.search(this.searchQuery, this.user)
      : [];
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.isSearching = false;
    this.searchResults = [];
  }

  watchAll(): void {
    this.router.navigate(['/guide/watch-all']);
  }

  get totalDuration(): string {
    const mins = this.chapters.reduce((sum, c) => {
      const m = parseInt(c.duration, 10) || 0;
      return sum + m;
    }, 0);
    return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`;
  }

  get videoCount(): number {
    return this.chapters.filter(c => !!c.videoUrl).length;
  }
}
