import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';
import {
  RegisterParentStudentRequest,
  RegisterParentStudentResponse,
  CheckParentRequest,
  CheckParentResponse,
  StudentListItem,
  StudentDetails,
  UpdateStudentRequest,
  UpdateStudentResponse
} from '../../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class StudentService {
  constructor(private apiService: ApiService) {}

  checkParent(request: CheckParentRequest): Observable<CheckParentResponse> {
    return this.apiService.post<CheckParentResponse>('students/check-parent', request);
  }

  registerParentAndStudents(request: RegisterParentStudentRequest): Observable<RegisterParentStudentResponse> {
    return this.apiService.post<RegisterParentStudentResponse>('students/register', request);
  }

  getAllStudents(): Observable<StudentListItem[]> {
    return this.apiService.get<StudentListItem[]>('students');
  }

  getStudents(): Observable<StudentListItem[]> {
    return this.getAllStudents();
  }

  getStudentById(studentId: number): Observable<StudentDetails> {
    return this.apiService.get<StudentDetails>(`students/${studentId}`);
  }

  updateStudent(studentId: number, request: UpdateStudentRequest): Observable<UpdateStudentResponse> {
    return this.apiService.put<UpdateStudentResponse>(`students/${studentId}`, request);
  }

  getStudentPhotoUrl(studentId: number): string {
    return `${environment.apiUrl}/students/${studentId}/photo`;
  }
}
