import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { ApiService } from './api.service';
import { CheckMobileRequest, CheckMobileResponse, LoginRequest, LoginResponse, UserInfo } from '../../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<UserInfo | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private apiService: ApiService) {
    this.loadUserFromStorage();
  }

  checkMobile(request: CheckMobileRequest): Observable<CheckMobileResponse> {
    return this.apiService.post<CheckMobileResponse>('auth/check-mobile', request);
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.apiService.post<LoginResponse>('auth/login', request).pipe(
      tap(response => {
        if (response.success && response.token && response.userInfo) {
          this.setSession(response.token.accessToken, response.userInfo);
        }
      })
    );
  }

  /**
   * Save the club slug used at login so logout can redirect back to the same URL.
   * Call this from LoginComponent after reading the :clubSlug route param.
   * Pass null when logging in from plain /login (Master Admin).
   */
  saveLoginSource(clubSlug: string | null): void {
    if (clubSlug) {
      localStorage.setItem('login_club_slug', clubSlug);
    } else {
      localStorage.removeItem('login_club_slug');
    }
  }

  /**
   * Returns the URL to redirect to after logout.
   * /login/clubslug for club users, /login for master admin.
   */
  getLogoutRedirectUrl(): string {
    const slug = localStorage.getItem('login_club_slug');
    return slug ? `/login/${slug}` : '/login';
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_info');
    localStorage.removeItem('permissions');
    localStorage.removeItem('login_club_code'); // legacy key — clean up
    // login_club_slug intentionally kept so logout redirect works
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  private setSession(token: string, userInfo: UserInfo): void {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user_info', JSON.stringify(userInfo));
    localStorage.setItem('permissions', JSON.stringify(userInfo.permissions));
    this.currentUserSubject.next(userInfo);
    this.isAuthenticatedSubject.next(true);
  }

  private loadUserFromStorage(): void {
    const token = localStorage.getItem('access_token');
    const userInfoStr = localStorage.getItem('user_info');
    if (token && userInfoStr && !this.isTokenExpired(token)) {
      const userInfo: UserInfo = JSON.parse(userInfoStr);
      this.currentUserSubject.next(userInfo);
      this.isAuthenticatedSubject.next(true);
    } else {
      this.logout();
    }
  }

  private isTokenExpired(token: string): boolean {
    try {
      const decoded: any = jwtDecode(token);
      const expirationDate = new Date(decoded.exp * 1000);
      return expirationDate < new Date();
    } catch {
      return true;
    }
  }

  get currentUserValue(): UserInfo | null {
    return this.currentUserSubject.value;
  }

  get isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  get isMasterAdmin(): boolean {
    return this.currentUserValue?.isMasterAdmin ?? false;
  }

  get permissions(): string[] {
    const permsStr = localStorage.getItem('permissions');
    return permsStr ? JSON.parse(permsStr) : [];
  }

  hasPermission(permission: string): boolean {
    return this.permissions.includes(permission);
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }
}
