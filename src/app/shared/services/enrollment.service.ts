import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface EnrollStudentWithPaymentDto {
  studentId: number;
  eventId: number;
  enrollmentNotes?: string;
  payNow: boolean;
  paymentMethod?: string;
  paymentAmount?: number;
  paymentReference?: string;
  paymentNotes?: string;
}

export interface EnrollmentResponseDto {
  success: boolean;
  message: string;
  enrollmentId?: number;
  invoiceId?: number;
  invoiceNumber?: string;
  paymentId?: number;
  receiptNumber?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EnrollmentService {
  private apiUrl = `${environment.apiUrl}/Enrollment`;

  constructor(private http: HttpClient) { }

  /**
   * Enroll student with optional payment
   */
    enrollWithPayment(data: EnrollStudentWithPaymentDto): Observable<EnrollmentResponseDto> {
      console.log('📤 Enrolling student with payment:', data);
      return this.http.post<EnrollmentResponseDto>(`${this.apiUrl}/with-payment`, data);
    }
//   enrollWithPayment(data: any): Observable<any> {
//   console.log('📤 Enrolling student with payment:', data);
//   return this.http.post<any>(`${this.apiUrl}/with-payment`, data);
// }

  /**
   * Get enrollments for an event
   */
  getEventEnrollments(eventId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/event/${eventId}`);
  }

  /**
   * Get enrollments for a student
   */
  getStudentEnrollments(studentId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/student/${studentId}`);
  }
  
}
