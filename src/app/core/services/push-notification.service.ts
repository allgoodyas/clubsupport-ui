import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface NotificationPreference {
  typeCode:    string;
  typeName:    string;
  channelCode: string;
  channelName: string;
  isEnabled:   boolean;
}

@Injectable({ providedIn: 'root' })
export class PushNotificationService {

  private readonly api = environment.apiUrl;
  private swRegistration: ServiceWorkerRegistration | null = null;

  constructor(private http: HttpClient) {}

  // ── 1. Register Service Worker ──────────────────────────────

  async init(): Promise<void> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications not supported in this browser');
      return;
    }

    try {
      this.swRegistration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      console.log('✅ Service Worker registered');
    } catch (err) {
      console.error('❌ Service Worker registration failed:', err);
    }
  }

  // ── 2. Request Permission + Subscribe ──────────────────────

  async requestPermissionAndSubscribe(): Promise<boolean> {
    if (!this.swRegistration) await this.init();
    if (!this.swRegistration) return false;

    // Ask browser for permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Push permission denied');
      return false;
    }

    try {
      // Get VAPID public key from API
      const { publicKey } = await this.http
        .get<{ publicKey: string }>(`${this.api}/PushSubscription/vapid-public-key`)
        .toPromise() as { publicKey: string };

      // Subscribe browser to push
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: this.urlBase64ToUint8Array(publicKey)
      });

      // Send subscription to our API to store it
      const sub = subscription.toJSON();
      const keys = sub.keys as { p256dh: string; auth: string };

      await this.http.post(`${this.api}/PushSubscription/subscribe`, {
        endpoint:    sub.endpoint,
        p256dh:      keys.p256dh,
        auth:        keys.auth,
        deviceLabel: this.getDeviceLabel()
      }).toPromise();

      console.log('✅ Push subscription saved');
      return true;
    } catch (err) {
      console.error('❌ Push subscription failed:', err);
      return false;
    }
  }

  // ── 3. Unsubscribe ──────────────────────────────────────────

  async unsubscribe(): Promise<void> {
    if (!this.swRegistration) return;

    const subscription = await this.swRegistration.pushManager.getSubscription();
    if (!subscription) return;

    await this.http.delete(`${this.api}/PushSubscription/unsubscribe`, {
      body: { endpoint: subscription.endpoint }
    }).toPromise();

    await subscription.unsubscribe();
    console.log('✅ Unsubscribed from push notifications');
  }

  // ── 4. Check current subscription status ───────────────────

  async isSubscribed(): Promise<boolean> {
    if (!this.swRegistration) await this.init();
    if (!this.swRegistration) return false;
    const sub = await this.swRegistration.pushManager.getSubscription();
    return !!sub;
  }

  isPushSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  }

  isPermissionGranted(): boolean {
    return Notification.permission === 'granted';
  }

  isPermissionDenied(): boolean {
    return Notification.permission === 'denied';
  }

  // ── 5. User preferences ─────────────────────────────────────

  getUserPreferences() {
    return this.http.get<{ success: boolean; preferences: NotificationPreference[] }>(
      `${this.api}/PushSubscription/user-preferences`
    );
  }

  updatePreference(typeCode: string, channelCode: string, isEnabled: boolean) {
    return this.http.put(`${this.api}/PushSubscription/user-preferences`, {
      typeCode, channelCode, isEnabled
    });
  }

  // ── Helpers ─────────────────────────────────────────────────

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
  }

  private getDeviceLabel(): string {
    const ua = navigator.userAgent;
    if (/Android/i.test(ua))  return `Android · ${/Chrome/i.test(ua) ? 'Chrome' : 'Browser'}`;
    if (/iPhone|iPad/i.test(ua)) return `iOS · Safari`;
    if (/Windows/i.test(ua))  return `Windows · ${/Chrome/i.test(ua) ? 'Chrome' : /Firefox/i.test(ua) ? 'Firefox' : 'Browser'}`;
    if (/Mac/i.test(ua))      return `Mac · ${/Chrome/i.test(ua) ? 'Chrome' : 'Safari'}`;
    return 'Unknown Device';
  }
}
