import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MarkAttendanceDto {
  enrollmentId: number;
  eventId: number;
  studentId: number;
  attendanceDate: Date;
  status: string;
  notes?: string;
}

export interface BulkAttendanceDto {
  eventId: number;
  attendanceDate: Date;
  students: StudentAttendanceDto[];
}

export interface StudentAttendanceDto {
  enrollmentId: number;
  studentId: number;
  status: string;
  notes?: string;
}

export interface AttendanceDto {
  attendanceId: number;
  enrollmentId: number;
  eventId: number;
  eventName: string;
  studentId: number;
  studentName: string;
  attendanceDate: Date;
  status: string;
  markedBy?: number;
  markedByName?: string;
  markedAt?: Date;
  notes?: string;
  clubId: number;
}

export interface EventAttendanceByDateDto {
  eventId: number;
  eventName: string;
  attendanceDate: Date;
  students: StudentAttendanceRecordDto[];
}

export interface StudentAttendanceRecordDto {
  attendanceId: number;
  enrollmentId: number;
  studentId: number;
  studentName: string;
  status: string;
  notes?: string;
  isMarked: boolean;
}

export interface AttendanceSummaryDto {
  eventId: number;
  eventName: string;
  attendanceDate: Date;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  attendancePercentage: number;
}

export interface StudentAttendanceHistoryDto {
  studentId: number;
  studentName: string;
  eventId: number;
  eventName: string;
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  attendancePercentage: number;
}

export interface UpdateAttendanceDto {
  status: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private apiUrl = `${environment.apiUrl}/Attendance`;

  constructor(private http: HttpClient) { }

  // Auth is handled automatically by the HTTP interceptor — no manual headers needed

  getAttendanceByDate(eventId: number, date: string): Observable<EventAttendanceByDateDto> {
    return this.http.get<EventAttendanceByDateDto>(`${this.apiUrl}/event/${eventId}/date/${date}`);
  }

  markBulkAttendance(dto: BulkAttendanceDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/bulk`, dto);
  }

  markAttendance(dto: MarkAttendanceDto): Observable<any> {
    return this.http.post(this.apiUrl, dto);
  }

  updateAttendance(attendanceId: number, dto: UpdateAttendanceDto): Observable<any> {
    return this.http.put(`${this.apiUrl}/${attendanceId}`, dto);
  }

  getAttendanceSummary(eventId: number, date: string): Observable<AttendanceSummaryDto> {
    return this.http.get<AttendanceSummaryDto>(`${this.apiUrl}/summary/${eventId}/date/${date}`);
  }

  getStudentAttendanceHistory(studentId: number, eventId: number): Observable<StudentAttendanceHistoryDto> {
    return this.http.get<StudentAttendanceHistoryDto>(`${this.apiUrl}/student/${studentId}/event/${eventId}`);
  }
}
