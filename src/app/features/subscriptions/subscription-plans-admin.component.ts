import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/services/toast.service';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher.component';

interface SubscriptionPlan {
  planId: number;
  planNameEn: string;
  planNameAr: string;
  descriptionEn: string;
  priceMonthly: number;
  priceYearly?: number;
  maxEventSelections?: number;
  requiresSelection: boolean;
  isActive: boolean;
  currentSubscribers: number;
  badgeColor: string;
  eligibleEvents: any[];
  savingsPercentage?: number;
}

@Component({
  selector: 'app-subscription-plans-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, LanguageSwitcherComponent],
  templateUrl: './subscription-plans-admin.component.html',
  styleUrl: './subscription-plans-admin.component.scss'
})
export class SubscriptionPlansAdminComponent implements OnInit {
  plans: SubscriptionPlan[] = [];
  isLoading = false;
  showInactive = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private toastr: ToastService
  ) {}

  ngOnInit() {
    this.loadPlans();
  }

  loadPlans() {
    this.isLoading = true;
    const url = `${environment.apiUrl}/SubscriptionPlan?includeInactive=${this.showInactive}`;
    
    this.http.get<SubscriptionPlan[]>(url).subscribe({
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

  toggleShowInactive() {
    this.showInactive = !this.showInactive;
    this.loadPlans();
  }

  createNewPlan() {
    this.router.navigate(['/subscriptions/admin/create']);
  }

  editPlan(planId: number) {
    this.router.navigate(['/subscriptions/admin/edit', planId]);
  }

  viewSubscribers(planId: number) {
    this.router.navigate(['/subscriptions/admin/subscribers', planId]);
  }

  deactivatePlan(plan: SubscriptionPlan) {
    if (plan.currentSubscribers > 0) {
      this.toastr.showError(`⚠️ Cannot deactivate plan. ${plan.currentSubscribers} active subscriptions exist.`);
      return;
    }

    if (confirm(`Are you sure you want to deactivate "${plan.planNameEn}"?`)) {
      this.http.delete(`${environment.apiUrl}/SubscriptionPlan/${plan.planId}`).subscribe({
        next: () => {
          this.toastr.showSuccess('✅ Plan deactivated successfully');
          this.loadPlans();
        },
        error: (error) => {
          console.error('Error deactivating plan:', error);
          this.toastr.showError('❌ Failed to deactivate plan');
        }
      });
    }
  }

  getBadgeClass(color: string): string {
    return `badge-${color?.toLowerCase() || 'default'}`;
  }

  getSelectionTypeLabel(plan: SubscriptionPlan): string {
    if (!plan.requiresSelection) {
      return 'All Events Included';
    }
    return `Choose ${plan.maxEventSelections} from ${plan.eligibleEvents?.length}`;
  }

  purchaseForStudent(planId: number) {
    // Navigate to purchase flow with admin=true
    // Billing cycle will be selected on the purchase page
    this.router.navigate(['/subscriptions/purchase', planId], {
      queryParams: { 
        admin: true
        // billingCycle removed - user selects on purchase page
      }
    });
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }
}
