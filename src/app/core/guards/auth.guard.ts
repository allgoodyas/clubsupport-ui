import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (this.authService.isAuthenticated) {
      if (route.data['requireMasterAdmin'] && !this.authService.isMasterAdmin) {
        this.router.navigate(['/dashboard']);
        return false;
      }
      const requiredPermissions = route.data['permissions'] as string[];
      if (requiredPermissions && requiredPermissions.length > 0) {
        const hasAll = requiredPermissions.every(p => this.authService.hasPermission(p));
        if (!hasAll) {
          this.router.navigate(['/dashboard']);
          return false;
        }
      }
      return true;
    }
    const loginUrl = this.authService.getLogoutRedirectUrl();
    this.router.navigate([loginUrl], { queryParams: { returnUrl: state.url } });
    return false;
  }
}
