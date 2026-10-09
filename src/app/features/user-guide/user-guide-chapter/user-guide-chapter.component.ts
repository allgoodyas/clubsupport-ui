import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserGuideService, GuideChapter } from '../user-guide.service';
import { VideoPlayerComponent } from '../components/video-player/video-player.component';
import { SidebarNavigationComponent } from '../../../shared/components/sidebar-navigation/sidebar-navigation.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-user-guide-chapter',
  standalone: true,
  imports: [CommonModule, SidebarNavigationComponent, PageHeaderComponent, VideoPlayerComponent],
  templateUrl: './user-guide-chapter.component.html',
  styleUrls: ['./user-guide-chapter.component.scss'],
})
export class UserGuideChapterComponent implements OnInit {
  chapter?: GuideChapter;
  prev?: GuideChapter;
  next?: GuideChapter;
  expandedStep: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
    private guideService: UserGuideService,
  ) {}

  ngOnInit(): void {
    const user = this.auth.currentUserValue;
    this.route.paramMap.subscribe(params => {
      const id = params.get('id') ?? '';
      this.chapter = this.guideService.getChapterById(id);
      const adj = this.guideService.getAdjacentChapters(id, user);
      this.prev = adj.prev;
      this.next = adj.next;
      this.expandedStep = null;
      window.scrollTo(0, 0);
    });
  }

  toggleStep(i: number): void {
    this.expandedStep = this.expandedStep === i ? null : i;
  }

  goBack(): void { this.router.navigate(['/guide']); }
  goPrev(): void { if (this.prev) this.router.navigate(['/guide/chapter', this.prev.id]); }
  goNext(): void { if (this.next) this.router.navigate(['/guide/chapter', this.next.id]); }
  watchAll(): void { this.router.navigate(['/guide/watch-all']); }
}
