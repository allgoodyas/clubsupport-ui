import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageSwitcherComponent } from '../language-switcher/language-switcher.component';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule, LanguageSwitcherComponent],
  templateUrl: './page-header.component.html',
  styleUrls: ['./page-header.component.scss']
})
export class PageHeaderComponent implements OnInit {

  // ── Zone 2: Page icon — Tabler icon class e.g. 'ti-calendar'
  @Input() pageIcon: string = '';

  // ── Zone 3: Page title + optional subtitle
  @Input() pageTitle: string = '';
  @Input() pageSubtitle: string = '';

  // ── Optional back button
  @Input() backRoute: string = '';
  @Input() backLabel: string = 'Back';

  // ── Internal: club logo
  clubName:     string  = '';
  logoUrl:      SafeUrl | null = null;
  hasLogo:      boolean = false;
  logoInitials: string  = '';

  // Cache the fetched logo across navigations. Each page mounts its own
  // header instance, so without this the logo was re-fetched on every route
  // change — and while the fetch was in flight the <img> had no src, so the
  // browser rendered the alt text (club name), causing the flash in Zone 1.
  private static cachedLogoUrl:    SafeUrl | null = null;
  private static cachedLogoClubId: number | null = null;

  constructor(
    private router:    Router,
    private authSvc:   AuthService,
    private http:      HttpClient,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    const user = this.authSvc.currentUserValue;
    if (user) {
      this.clubName     = user.clubNameEn || 'Club';
      this.logoInitials = this.getInitials(this.clubName);
      this.hasLogo      = user?.theme?.hasLogo || false;

      const clubId = (user as any).clubId ?? null;
      if (this.hasLogo) {
        // Reuse the already-fetched logo for the same club so it appears
        // instantly on every navigation — no re-fetch, no flash.
        if (PageHeaderComponent.cachedLogoUrl && PageHeaderComponent.cachedLogoClubId === clubId) {
          this.logoUrl = PageHeaderComponent.cachedLogoUrl;
        } else {
          this.loadLogo(clubId);
        }
      }
    }
  }

  goBack(): void {
    if (this.backRoute) this.router.navigate([this.backRoute]);
  }

  private loadLogo(clubId: number | null): void {
    this.http.get(`${environment.apiUrl}/club/logo`, { responseType: 'blob' }).subscribe({
      next: (b) => {
        const url = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(b));
        this.logoUrl = url;
        PageHeaderComponent.cachedLogoUrl    = url;
        PageHeaderComponent.cachedLogoClubId = clubId;
      },
      error: () => { this.hasLogo = false; }
    });
  }

  private getInitials(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }
}
