import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ClubTheme {
  themeId: number;
  // Legacy colors (backward compatibility)
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  // Enhanced theme - Background colors
  bgApp?: string;
  bgPanel?: string;
  bgCard?: string;
  bgBorder?: string;
  // Enhanced theme - Accent colors
  accentPrimary?: string;
  accentSuccess?: string;
  accentWarning?: string;
  accentDanger?: string;
  accentInfo?: string;
  // Enhanced theme - Text colors
  textPrimary?: string;
  textSecondary?: string;
  textDisabled?: string;
  // Theme mode
  themeMode?: string;
  // Logo
  hasLogo: boolean;
  logoFileName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private apiUrl = environment.apiUrl;
  private currentTheme$ = new BehaviorSubject<ClubTheme | null>(null);
  
  constructor(private http: HttpClient) {}

  /**
   * Get current theme as observable
   */
  getCurrentTheme(): Observable<ClubTheme | null> {
    return this.currentTheme$.asObservable();
  }

  /**
   * Load club theme from API and apply it
   */
  loadAndApplyClubTheme(clubId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/ClubTheme`).pipe(
      tap(response => {
        if (response.success && response.theme) {
          this.applyTheme(response.theme);
        } else {
          // Apply default theme if no theme found
          this.applyDefaultTheme();
        }
      })
    );
  }

  /**
   * Apply theme colors to the entire application using CSS variables
   */
  applyTheme(theme: ClubTheme): void {
    console.log('🎨 Applying enhanced theme:', theme);
    
    // Store current theme
    this.currentTheme$.next(theme);
    
    // Apply CSS custom properties to document root
    const root = document.documentElement;
    
    // Legacy colors (backward compatibility)
    root.style.setProperty('--primary-color', theme.primaryColor);
    root.style.setProperty('--secondary-color', theme.secondaryColor);
    root.style.setProperty('--accent-color', theme.accentColor);
    
    // Calculate lighter/darker variations for better UX
    root.style.setProperty('--primary-light', this.lightenColor(theme.primaryColor, 20));
    root.style.setProperty('--primary-dark', this.darkenColor(theme.primaryColor, 20));
    root.style.setProperty('--secondary-light', this.lightenColor(theme.secondaryColor, 20));
    root.style.setProperty('--secondary-dark', this.darkenColor(theme.secondaryColor, 20));
    
    // Enhanced theme - Background colors
    if (theme.bgApp) root.style.setProperty('--bg-app', theme.bgApp);
    if (theme.bgPanel) root.style.setProperty('--bg-panel', theme.bgPanel);
    if (theme.bgCard) root.style.setProperty('--bg-card', theme.bgCard);
    if (theme.bgBorder) root.style.setProperty('--bg-border', theme.bgBorder);
    
    // Enhanced theme - Accent colors
    if (theme.accentPrimary) {
      root.style.setProperty('--accent-primary', theme.accentPrimary);
      root.style.setProperty('--accent-primary-dim', theme.accentPrimary + '22'); // 13% opacity
      root.style.setProperty('--accent-primary-rgb', this.hexToRgb(theme.accentPrimary));
    }
    if (theme.accentSuccess) {
      root.style.setProperty('--accent-success', theme.accentSuccess);
      root.style.setProperty('--accent-success-dim', theme.accentSuccess + '22');
    }
    if (theme.accentWarning) {
      root.style.setProperty('--accent-warning', theme.accentWarning);
      root.style.setProperty('--accent-warning-dim', theme.accentWarning + '22');
    }
    if (theme.accentDanger) {
      root.style.setProperty('--accent-danger', theme.accentDanger);
      root.style.setProperty('--accent-danger-dim', theme.accentDanger + '22');
    }
    if (theme.accentInfo) {
      root.style.setProperty('--accent-info', theme.accentInfo);
      root.style.setProperty('--accent-info-dim', theme.accentInfo + '22');
    }
    
    // Enhanced theme - Text colors
    if (theme.textPrimary) root.style.setProperty('--text-primary', theme.textPrimary);
    if (theme.textSecondary) root.style.setProperty('--text-secondary', theme.textSecondary);
    if (theme.textDisabled) root.style.setProperty('--text-disabled', theme.textDisabled);
    
    // Theme mode
    if (theme.themeMode) root.setAttribute('data-theme', theme.themeMode);
    
    // Primary gradient for CTA buttons
    if (theme.accentPrimary && theme.accentInfo) {
      root.style.setProperty('--gradient-primary', 
        `linear-gradient(135deg, ${theme.accentPrimary}, ${theme.accentInfo})`);
    }
    
    // Store in localStorage for persistence
    localStorage.setItem('club-theme', JSON.stringify(theme));
    
    console.log('✅ Enhanced theme applied successfully!');
    console.log('📊 Theme mode:', theme.themeMode || 'default');
  }

  /**
   * Apply Master Admin theme — deep navy/indigo, matches GetMasterAdminTheme() in API
   * Used on /login (no ?c= param) so Super Admin gets a visually distinct page
   */
  applyMasterAdminTheme(): void {
    const masterTheme: ClubTheme = {
      themeId: -1,
      primaryColor:   '#6366f1',
      secondaryColor: '#8b5cf6',
      accentColor:    '#a78bfa',
      bgApp:          '#0f0f23',
      bgPanel:        '#16213e',
      bgCard:         '#1a1a2e',
      bgBorder:       '#252547',
      accentPrimary:  '#6366f1',
      accentSuccess:  '#22c55e',
      accentWarning:  '#f59e0b',
      accentDanger:   '#ef4444',
      accentInfo:     '#8b5cf6',
      textPrimary:    '#e2e8f0',
      textSecondary:  '#94a3b8',
      textDisabled:   '#4a5568',
      themeMode:      'dark',
      hasLogo:        false,
    };
    // Do NOT persist to localStorage — master admin theme should never bleed into club sessions
    const root = document.documentElement;
    root.style.setProperty('--primary-color',   masterTheme.primaryColor);
    root.style.setProperty('--secondary-color', masterTheme.secondaryColor);
    root.style.setProperty('--accent-color',    masterTheme.accentColor);
    root.style.setProperty('--primary-light', this.lightenColor(masterTheme.primaryColor, 20));
    root.style.setProperty('--primary-dark',  this.darkenColor(masterTheme.primaryColor, 20));
    if (masterTheme.bgApp)         root.style.setProperty('--bg-app',    masterTheme.bgApp);
    if (masterTheme.bgPanel)       root.style.setProperty('--bg-panel',  masterTheme.bgPanel);
    if (masterTheme.bgCard)        root.style.setProperty('--bg-card',   masterTheme.bgCard);
    if (masterTheme.bgBorder)      root.style.setProperty('--bg-border', masterTheme.bgBorder);
    if (masterTheme.accentPrimary) {
      root.style.setProperty('--accent-primary', masterTheme.accentPrimary);
      root.style.setProperty('--accent-primary-rgb', this.hexToRgb(masterTheme.accentPrimary));
    }
    if (masterTheme.accentInfo)    root.style.setProperty('--accent-info',    masterTheme.accentInfo);
    if (masterTheme.accentSuccess) root.style.setProperty('--accent-success', masterTheme.accentSuccess);
    if (masterTheme.accentWarning) root.style.setProperty('--accent-warning', masterTheme.accentWarning);
    if (masterTheme.accentDanger)  root.style.setProperty('--accent-danger',  masterTheme.accentDanger);
    if (masterTheme.textPrimary)   root.style.setProperty('--text-primary',   masterTheme.textPrimary);
    if (masterTheme.textSecondary) root.style.setProperty('--text-secondary', masterTheme.textSecondary);
    if (masterTheme.textDisabled)  root.style.setProperty('--text-disabled',  masterTheme.textDisabled);
    root.setAttribute('data-theme', 'dark');
    root.style.setProperty('--gradient-primary',
      `linear-gradient(135deg, ${masterTheme.accentPrimary}, ${masterTheme.accentInfo})`);
    this.currentTheme$.next(masterTheme);
  }

  /**
   * Apply default theme (fallback) - PharmaCare Dark
   */
  applyDefaultTheme(): void {
    const defaultTheme: ClubTheme = {
      themeId: 0,
      // Legacy colors
      primaryColor: '#00D4FF',
      secondaryColor: '#00FF9D',
      accentColor: '#A855F7',
      // Enhanced colors - PharmaCare Dark
      bgApp: '#0A0F1E',
      bgPanel: '#111827',
      bgCard: '#1A2235',
      bgBorder: '#1E2D45',
      accentPrimary: '#00D4FF',
      accentSuccess: '#00FF9D',
      accentWarning: '#FF8C42',
      accentDanger: '#FF4757',
      accentInfo: '#A855F7',
      textPrimary: '#E2E8F0',
      textSecondary: '#94A3B8',
      textDisabled: '#4A5568',
      themeMode: 'dark',
      hasLogo: false
    };
    
    this.applyTheme(defaultTheme);
  }

  /**
   * Load theme from localStorage (for offline/quick load)
   */
  loadThemeFromStorage(): void {
    const storedTheme = localStorage.getItem('club-theme');
    if (storedTheme) {
      try {
        const theme = JSON.parse(storedTheme);
        this.applyTheme(theme);
      } catch (e) {
        console.error('Failed to parse stored theme:', e);
        this.applyDefaultTheme();
      }
    } else {
      this.applyDefaultTheme();
    }
  }

  /**
   * Load club theme by club code — PUBLIC, no auth token needed.
   * Used by the login page when ?c=CLUB_CODE is in the URL.
   */
  loadPublicThemeByCode(clubCode: string): Observable<any> {
    return this.http
      .get<any>(`${this.apiUrl}/ClubTheme/public/${clubCode}`)
      .pipe(
        tap(response => {
          if (response.success && response.club) {
            // Map PublicClubThemeDto fields into the ClubTheme shape the applyTheme() expects
            const club = response.club;
            const theme: ClubTheme = {
              themeId:        club.clubId ?? 0,
              primaryColor:   club.primaryColor   ?? '#00D4FF',
              secondaryColor: club.secondaryColor ?? '#00FF9D',
              accentColor:    club.accentColor    ?? '#A855F7',
              bgApp:          club.bgApp,
              bgPanel:        club.bgPanel,
              bgCard:         club.bgCard,
              bgBorder:       club.bgBorder,
              accentPrimary:  club.accentPrimary,
              accentSuccess:  club.accentSuccess,
              accentWarning:  club.accentWarning,
              accentDanger:   club.accentDanger,
              accentInfo:     club.accentInfo,
              textPrimary:    club.textPrimary,
              textSecondary:  club.textSecondary,
              textDisabled:   club.textDisabled,
              themeMode:      club.themeMode,
              hasLogo:        club.hasLogo ?? false,
            };
            this.applyTheme(theme);
          }
        })
      );
  }

  /**
   * Clear theme (logout)
   */
  clearTheme(): void {
    localStorage.removeItem('club-theme');
    this.currentTheme$.next(null);
    this.applyDefaultTheme();
  }

  /**
   * Manually set theme colors (for testing or preview)
   */
  setThemeColors(primary: string, secondary: string, accent: string): void {
    const theme: ClubTheme = {
      themeId: 0,
      primaryColor: primary,
      secondaryColor: secondary,
      accentColor: accent,
      hasLogo: false
    };
    this.applyTheme(theme);
  }

  // Color manipulation utilities
  private lightenColor(color: string, percent: number): string {
    return this.adjustColor(color, percent);
  }

  private darkenColor(color: string, percent: number): string {
    return this.adjustColor(color, -percent);
  }

  private adjustColor(color: string, percent: number): string {
    // Remove # if present
    color = color.replace('#', '');
    
    // Parse RGB
    const num = parseInt(color, 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + percent));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));
    
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

  /**
   * Convert hex color to RGB string for CSS variables
   */
  private hexToRgb(hex: string): string {
    hex = hex.replace('#', '');
    const num = parseInt(hex, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `${r}, ${g}, ${b}`;
  }

  /**
   * Get logo URL for current club
   */
  getLogoUrl(clubId: number): string {
    return `${this.apiUrl}/club/${clubId}/logo`;
  }
}
