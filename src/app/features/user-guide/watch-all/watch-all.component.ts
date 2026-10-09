import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserGuideService, GuideChapter } from '../user-guide.service';
import { VideoPlayerComponent } from '../components/video-player/video-player.component';
import { SidebarNavigationComponent } from '../../../shared/components/sidebar-navigation/sidebar-navigation.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-watch-all',
  standalone: true,
  imports: [CommonModule, SidebarNavigationComponent, PageHeaderComponent, VideoPlayerComponent],
  templateUrl: './watch-all.component.html',
  styleUrls: ['./watch-all.component.scss'],
})
export class WatchAllComponent implements OnInit {
  chapters: GuideChapter[] = [];
  currentIndex = 0;

  constructor(
    private auth: AuthService,
    private guideService: UserGuideService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const user = this.auth.currentUserValue;
    this.chapters = this.guideService.getChaptersForUser(user);
  }

  get current(): GuideChapter | undefined {
    return this.chapters[this.currentIndex];
  }

  select(i: number): void {
    this.currentIndex = i;
    window.scrollTo(0, 0);
  }

  prev(): void { if (this.currentIndex > 0) this.currentIndex--; }
  next(): void { if (this.currentIndex < this.chapters.length - 1) this.currentIndex++; }

  openChapter(): void {
    if (this.current) this.router.navigate(['/guide/chapter', this.current.id]);
  }

  goBack(): void { this.router.navigate(['/guide']); }

  get progress(): number {
    return this.chapters.length ? ((this.currentIndex + 1) / this.chapters.length) * 100 : 0;
  }
}
