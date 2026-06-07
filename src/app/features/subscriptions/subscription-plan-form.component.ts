import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/services/toast.service';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher.component';

interface Event {
  eventId: number;
  eventNameEn: string;
  eventNameAr: string;
  basePrice: number;
  selected?: boolean;
}

@Component({
  selector: 'app-subscription-plan-form',
  standalone: true,
  imports: [CommonModule, FormsModule, LanguageSwitcherComponent],
  templateUrl: './subscription-plan-form.component.html',
  styleUrl: './subscription-plan-form.component.scss'
})
export class SubscriptionPlanFormComponent implements OnInit {
  isEditMode = false;
  planId?: number;
  isLoading = false;
  isSaving = false;

  // Form Data
  planNameEn = '';
  planNameAr = '';
  descriptionEn = '';
  descriptionAr = '';
  priceMonthly: number | null = null;
  priceYearly: number | null = null;
  maxEventSelections: number | null = null;
  badgeColor = 'silver';
  displayOrder = 0;

  // Events
  availableEvents: Event[] = [];
  selectedEventIds: number[] = [];

  // Validation
  errorMessage = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private toastr: ToastService
  ) {}

  ngOnInit() {
    this.loadEvents();
    
    // Check if edit mode
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.planId = +params['id'];
        this.loadPlan(this.planId);
      }
    });
  }

  loadEvents() {
    this.http.get<any[]>(`${environment.apiUrl}/Event`).subscribe({
      next: (events) => {
        this.availableEvents = events.map(e => ({
          eventId: e.eventId,
          eventNameEn: e.eventNameEn,
          eventNameAr: e.eventNameAr,
          basePrice: e.basePrice,
          selected: false
        }));
      },
      error: (error) => {
        console.error('Error loading events:', error);
      }
    });
  }

  loadPlan(planId: number) {
    this.isLoading = true;
    this.http.get<any>(`${environment.apiUrl}/SubscriptionPlan/${planId}`).subscribe({
      next: (plan) => {
        this.planNameEn = plan.planNameEn;
        this.planNameAr = plan.planNameAr || '';
        this.descriptionEn = plan.descriptionEn || '';
        this.descriptionAr = plan.descriptionAr || '';
        this.priceMonthly = plan.priceMonthly;
        this.priceYearly = plan.priceYearly;
        this.maxEventSelections = plan.maxEventSelections;
        this.badgeColor = plan.badgeColor || 'silver';
        this.displayOrder = plan.displayOrder || 0;
        
        // Mark selected events
        this.selectedEventIds = plan.eligibleEvents.map((e: any) => e.eventId);
        this.updateEventSelections();
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading plan:', error);
        this.errorMessage = 'Failed to load plan';
        this.isLoading = false;
      }
    });
  }

  updateEventSelections() {
    this.availableEvents.forEach(event => {
      event.selected = this.selectedEventIds.includes(event.eventId);
    });
  }

  toggleEventSelection(event: Event) {
    event.selected = !event.selected;
    
    if (event.selected) {
      this.selectedEventIds.push(event.eventId);
    } else {
      this.selectedEventIds = this.selectedEventIds.filter(id => id !== event.eventId);
    }
  }

  getSelectedEventsCount(): number {
    return this.selectedEventIds.length;
  }

  getTotalEventValue(): number {
    return this.availableEvents
      .filter(e => e.selected)
      .reduce((sum, e) => sum + e.basePrice, 0);
  }

  getSavingsPercentage(): number {
    const totalValue = this.getTotalEventValue();
    const price = this.priceMonthly || 0;
    
    if (totalValue === 0 || price === 0) return 0;
    
    return ((totalValue - price) / totalValue) * 100;
  }

  getSelectionTypePreview(): string {
    const selectedCount = this.getSelectedEventsCount();
    
    if (!this.maxEventSelections || this.maxEventSelections >= selectedCount) {
      return 'All Events Included (No Selection Required)';
    }
    
    return `Choose ${this.maxEventSelections} from ${selectedCount}`;
  }

  validateForm(): boolean {
    this.errorMessage = '';

    if (!this.planNameEn.trim()) {
      this.errorMessage = 'Plan name (English) is required';
      return false;
    }

    if (!this.priceMonthly || this.priceMonthly <= 0) {
      this.errorMessage = 'Monthly price must be greater than zero';
      return false;
    }

    // Events are OPTIONAL - admin can create plan without events and add them later
    // Only validate maxEventSelections if events are selected
    if (this.selectedEventIds.length > 0 && this.maxEventSelections && this.maxEventSelections > this.selectedEventIds.length) {
      this.errorMessage = `Max selections (${this.maxEventSelections}) cannot exceed total events (${this.selectedEventIds.length})`;
      return false;
    }

    return true;
  }

  savePlan() {
    if (!this.validateForm()) {
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    const planData = {
      planNameEn: this.planNameEn,
      planNameAr: this.planNameAr || null,
      descriptionEn: this.descriptionEn || null,
      descriptionAr: this.descriptionAr || null,
      priceMonthly: this.priceMonthly,
      priceYearly: this.priceYearly || null,
      maxEventSelections: this.maxEventSelections || null,
      badgeColor: this.badgeColor,
      displayOrder: this.displayOrder,
      eventIds: this.selectedEventIds
    };

    const request = this.isEditMode
      ? this.http.put(`${environment.apiUrl}/SubscriptionPlan/${this.planId}`, planData)
      : this.http.post(`${environment.apiUrl}/SubscriptionPlan`, planData);

    request.subscribe({
      next: (response) => {
        this.isSaving = false;
        this.toastr.showSuccess(this.isEditMode ? '✅ Plan updated successfully!' : '✅ Plan created successfully!');
        this.router.navigate(['/subscriptions/admin']);
      },
      error: (error) => {
        console.error('Error saving plan:', error);
        this.errorMessage = error.error?.message || 'Failed to save plan';
        this.toastr.showError(this.errorMessage);
        this.isSaving = false;
      }
    });
  }

  cancel() {
    this.router.navigate(['/subscriptions/admin']);
  }
}
