// enrollment.service.ts
// Angular service for enrollment API calls

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  EnrollStudentRequest,
  EligibilityCheckResult,
  EnrolledStudentDto,
  EnrollmentDto,
  UpdateEnrollmentRequest,
  EnrollmentApiResponse
} from '../../shared/models/enrollment.model';

@Injectable({
  providedIn: 'root'
})
export class EnrollmentService {
  private apiUrl = `${environment.apiUrl}/enrollments`;

  constructor(private http: HttpClient) {}

  // Check if student is eligible for an event
  checkEligibility(eventId: number, studentId: number): Observable<EnrollmentApiResponse<EligibilityCheckResult>> {
    return this.http.get<EnrollmentApiResponse<EligibilityCheckResult>>(
      `${this.apiUrl}/check-eligibility?eventId=${eventId}&studentId=${studentId}`
    );
  }

  // Enroll student in event
  enrollStudent(request: EnrollStudentRequest): Observable<EnrollmentApiResponse<number>> {
    return this.http.post<EnrollmentApiResponse<number>>(this.apiUrl, request);
  }

  // Get all enrollments for an event
  getEventEnrollments(eventId: number): Observable<EnrollmentApiResponse<EnrolledStudentDto[]>> {
    return this.http.get<EnrollmentApiResponse<EnrolledStudentDto[]>>(`${this.apiUrl}/event/${eventId}`);
  }

  // Get all enrollments for a student
  getStudentEnrollments(studentId: number): Observable<EnrollmentApiResponse<EnrollmentDto[]>> {
    return this.http.get<EnrollmentApiResponse<EnrollmentDto[]>>(`${this.apiUrl}/student/${studentId}`);
  }

  // Get enrollment details
  getEnrollmentDetails(enrollmentId: number): Observable<EnrollmentApiResponse<EnrollmentDto>> {
    return this.http.get<EnrollmentApiResponse<EnrollmentDto>>(`${this.apiUrl}/${enrollmentId}`);
  }

  // Update enrollment
  updateEnrollment(request: UpdateEnrollmentRequest): Observable<EnrollmentApiResponse<boolean>> {
    return this.http.put<EnrollmentApiResponse<boolean>>(this.apiUrl, request);
  }

  // Cancel enrollment
  cancelEnrollment(enrollmentId: number, reason?: string): Observable<EnrollmentApiResponse<boolean>> {
    const url = reason 
      ? `${this.apiUrl}/${enrollmentId}?reason=${encodeURIComponent(reason)}`
      : `${this.apiUrl}/${enrollmentId}`;
    return this.http.delete<EnrollmentApiResponse<boolean>>(url);
  }

  // Enroll student with payment (new endpoint)
  enrollWithPayment(request: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/with-payment`, request);
  }

  // Get offer types for this club
  getOfferTypes(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/offer-types`);
  }
}
