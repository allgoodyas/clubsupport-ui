import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GuideChapter } from '../../user-guide.service';

@Component({
  selector: 'app-chapter-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chapter-card.component.html',
  styleUrls: ['./chapter-card.component.scss'],
})
export class ChapterCardComponent {
  @Input() chapter!: GuideChapter;
  @Input() index = 0;

  constructor(private router: Router) {}

  open(): void {
    this.router.navigate(['/guide/chapter', this.chapter.id]);
  }
}
