import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface StudentSubscription {
  subscriptionId: number;
  planNameEn: string;
  badgeColor: string;
  startDate: string;
  endDate: string;
  billingCycle: string;
  status: string;
  daysRemaining: number;
  isExpiringSoon: boolean;
  totalAmount: number;
  amountPaid: number;
  autoRenew: boolean;
  nextBillingDate?: string;
  requiresSelection: boolean;
  selectedEvents?: any[];
  availableEvents?: any[];
  totalSavings: number;
}

@Component({
  selector: 'app-my-subscriptions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-subscriptions.component.html',
  styleUrl: './my-subscriptions.component.scss'
})
export class MySubscriptionsComponent implements OnInit {
  subscriptions: StudentSubscription[] = [];
  studentId: number = 1; // Get from auth service
  isLoading = false;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadSubscriptions();
  }

  loadSubscriptions() {
    this.isLoading = true;
    this.http.get<StudentSubscription[]>(
      `${environment.apiUrl}/StudentSubscription/student/${this.studentId}`
    ).subscribe({
      next: (subscriptions) => {
        this.subscriptions = subscriptions;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading subscriptions:', error);
        this.isLoading = false;
      }
    });
  }

  getStatusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }

  getBadgeIcon(color: string): string {
    return color === 'gold' ? '🥇' : color === 'silver' ? '🥈' : '🥉';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getDaysRemainingText(days: number): string {
    if (days < 0) return 'Expired';
    if (days === 0) return 'Expires today';
    if (days === 1) return '1 day remaining';
    return `${days} days remaining`;
  }

  getProgressPercentage(subscription: StudentSubscription): number {
    const start = new Date(subscription.startDate).getTime();
    const end = new Date(subscription.endDate).getTime();
    const now = new Date().getTime();
    
    const total = end - start;
    const elapsed = now - start;
    
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  }
}
