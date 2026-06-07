import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CheckCoverageRequest {
  studentId: number;
  eventId: number;
}

export interface CheckCoverageResponse {
  isCovered: boolean;
  freeEnrollment: boolean;
  subscriptionId?: number;
  subscriptionPlanName?: string;
  message: string;
  isChoosePlan?: boolean;
  canChangeSelections?: boolean;
}

export interface SubscriptionPlan {
  planId: number;
  planNameEn: string;
  planNameAr: string;
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

export interface StudentSubscription {
  subscriptionId: number;
  planNameEn: string;
  badgeColor: string;
  startDate: string;
  endDate: string;
  status: string;
  daysRemaining: number;
  selectedEvents?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private apiUrl = `${environment.apiUrl}/StudentSubscription`;

  constructor(private http: HttpClient) {}

  /**
   * Check if event is covered by student's subscription
   */
  checkCoverage(request: CheckCoverageRequest): Observable<CheckCoverageResponse> {
    return this.http.post<CheckCoverageResponse>(
      `${this.apiUrl}/check-coverage`,
      request
    );
  }

  /**
   * Get available subscription plans
   */
  getAvailablePlans(): Observable<SubscriptionPlan[]> {
    return this.http.get<SubscriptionPlan[]>(`${this.apiUrl}/available`);
  }

  /**
   * Get student's subscriptions
   */
  getStudentSubscriptions(studentId: number): Observable<StudentSubscription[]> {
    return this.http.get<StudentSubscription[]>(`${this.apiUrl}/student/${studentId}`);
  }
}
