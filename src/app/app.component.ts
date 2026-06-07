import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguageService } from './core/services/language.service';
import { ThemeService } from './core/services/theme.service';
import { AuthService } from './core/services/auth.service';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'ClubManagement-ui';

  constructor(
    private languageService: LanguageService,
    private themeService: ThemeService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Language service will auto-initialize from localStorage

    const currentUser = this.authService.currentUserValue;

    if (currentUser) {
      if (currentUser.isMasterAdmin) {
        // Master Admin: clear any stale club theme from localStorage first,
        // then always load fresh from API (backend returns hardcoded master theme)
        this.themeService.clearTheme();
      } else {
        // Club user: show cached theme immediately while API loads
        this.themeService.loadThemeFromStorage();
      }

      // Always call the API — backend decides master vs club theme based on JWT
      this.themeService.loadAndApplyClubTheme(currentUser.clubId ?? 0).subscribe({
        next: () => console.log('✅ Theme loaded from API'),
        error: (err) => {
          console.error('❌ Failed to load theme from API:', err);
          // Fallback: apply default if API fails
          this.themeService.applyDefaultTheme();
        }
      });
    } else {
      // Not logged in — clear any stale club theme and apply master admin default
      // This ensures the login page never shows a leftover club theme
      localStorage.removeItem('club-theme');
      this.themeService.applyDefaultTheme();
    }
  }
}
