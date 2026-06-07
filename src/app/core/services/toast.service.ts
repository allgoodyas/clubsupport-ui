import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new Subject<Toast>();
  public toasts$ = this.toastSubject.asObservable();
  private nextId = 1;

  // ── Primary API (used by most feature components) ──────────────────────
  showSuccess(message: string, duration = 3000): void {
    this.show(message, 'success', duration);
  }

  showError(message: string, duration = 5000): void {
    this.show(message, 'error', duration);
  }

  showWarning(message: string, duration = 4000): void {
    this.show(message, 'warning', duration);
  }

  showInfo(message: string, duration = 3000): void {
    this.show(message, 'info', duration);
  }

  // ── Alias API (used by payment-panel, parent components) ───────────────
  success(message: string, duration = 3000): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration = 5000): void {
    this.show(message, 'error', duration);
  }

  warning(message: string, duration = 4000): void {
    this.show(message, 'warning', duration);
  }

  info(message: string, duration = 3000): void {
    this.show(message, 'info', duration);
  }

  // ── Internal ───────────────────────────────────────────────────────────
  private show(message: string, type: Toast['type'], duration: number): void {
    this.toastSubject.next({ id: this.nextId++, message, type, duration });
  }
}
