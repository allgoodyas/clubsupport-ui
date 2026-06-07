import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface SubscriptionPlan {
  planId: number;
  planNameEn: string;
  descriptionEn: string;
  priceMonthly: number;
  priceYearly?: number;
  maxEventSelections?: number;
  requiresSelection: boolean;
  badgeColor: string;
  eligibleEvents: any[];
  savingsPercentage?: number;
  currentSubscribers: number;
}

@Component({
  selector: 'app-subscription-catalog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './subscription-catalog.component.html',
  styleUrls: ['./subscription-catalog.component.scss']
})
export class SubscriptionCatalogComponent implements OnInit {
  plans: SubscriptionPlan[] = [];
  isLoading = false;
  billingCycle: 'monthly' | 'yearly' = 'monthly';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadPlans();
  }

  loadPlans() {
    this.isLoading = true;
    this.http.get<SubscriptionPlan[]>(`${environment.apiUrl}/StudentSubscription/available`).subscribe({
      next: (plans) => {
        this.plans = plans;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading plans:', error);
        this.isLoading = false;
      }
    });
  }

  toggleBillingCycle() {
    this.billingCycle = this.billingCycle === 'monthly' ? 'yearly' : 'monthly';
  }

  getPrice(plan: SubscriptionPlan): number {
    return this.billingCycle === 'monthly' 
      ? plan.priceMonthly 
      : (plan.priceYearly || plan.priceMonthly * 12);
  }

  getPriceLabel(): string {
    return this.billingCycle === 'monthly' ? '/month' : '/year';
  }

  getSelectionLabel(plan: SubscriptionPlan): string {
    if (!plan.requiresSelection) {
      return `All ${plan.eligibleEvents.length} Events Included`;
    }
    return `Choose ${plan.maxEventSelections} from ${plan.eligibleEvents.length}`;
  }

  subscribeToPlan(plan: SubscriptionPlan) {
    // Navigate to purchase flow with billing cycle
    this.router.navigate(['/subscriptions/purchase', plan.planId], {
      queryParams: { 
        billingCycle: this.billingCycle,
        admin: false // Student flow
      }
    });
  }

  getBadgeIcon(color: string): string {
    return color === 'gold' ? '🥇' : color === 'silver' ? '🥈' : '🥉';
  }
}
