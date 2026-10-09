import { Component, Input, OnChanges, ViewChild, ElementRef, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GuideChapter } from '../../user-guide.service';

@Component({
  selector: 'app-guide-video-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './video-player.component.html',
  styleUrls: ['./video-player.component.scss'],
})
export class VideoPlayerComponent implements OnChanges {
  @Input() chapter!: GuideChapter;
  @Input() playlistMode = false;

  @ViewChild('videoEl') videoEl?: ElementRef<HTMLVideoElement>;

  isPlaying = false;
  progress = 0;
  currentTime = '0:00';
  totalTime = '0:00';
  volume = 1;
  showVolume = false;
  isFullscreen = false;

  get hasVideo(): boolean {
    return !!this.chapter?.videoUrl;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['chapter'] && this.videoEl?.nativeElement) {
      const v = this.videoEl.nativeElement;
      v.pause();
      v.load();
      this.isPlaying = false;
      this.progress = 0;
      this.currentTime = '0:00';
    }
  }

  togglePlay(): void {
    if (!this.videoEl) return;
    const v = this.videoEl.nativeElement;
    if (v.paused) { v.play(); this.isPlaying = true; }
    else { v.pause(); this.isPlaying = false; }
  }

  onTimeUpdate(): void {
    if (!this.videoEl) return;
    const v = this.videoEl.nativeElement;
    this.progress = v.duration ? (v.currentTime / v.duration) * 100 : 0;
    this.currentTime = this.fmt(v.currentTime);
    this.totalTime = this.fmt(v.duration);
  }

  onLoaded(): void {
    if (!this.videoEl) return;
    this.totalTime = this.fmt(this.videoEl.nativeElement.duration);
  }

  seek(ev: MouseEvent): void {
    if (!this.videoEl) return;
    const bar = ev.currentTarget as HTMLElement;
    const ratio = ev.offsetX / bar.clientWidth;
    const v = this.videoEl.nativeElement;
    v.currentTime = ratio * v.duration;
  }

  setVolume(ev: Event): void {
    if (!this.videoEl) return;
    this.volume = +(ev.target as HTMLInputElement).value;
    this.videoEl.nativeElement.volume = this.volume;
  }

  toggleFullscreen(): void {
    const el = document.querySelector('.vp-wrapper') as HTMLElement;
    if (!document.fullscreenElement) {
      el?.requestFullscreen();
      this.isFullscreen = true;
    } else {
      document.exitFullscreen();
      this.isFullscreen = false;
    }
  }

  private fmt(sec: number): string {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
