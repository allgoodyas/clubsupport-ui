// user.service.ts
// Angular service for user management API calls

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Role {
  roleId: number;
  roleName: string;
  description?: string;
  clubId?: number;
}

export interface CreateUserRequest {
  fullName: string;
  mobileNumber: string;
  email?: string;
  password: string;
  roleId: number;
}

export interface User {
  userId: number;
  fullName: string;
  mobileNumber: string;
  email?: string;
  roleName: string;
  isActive: boolean;
  createdOn: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/user`;

  constructor(private http: HttpClient) {}

  // Get all roles for the current club
  getRoles(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/roles`);
  }

  // Create a new user
  createUser(request: CreateUserRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create`, request);
  }

  // Get all users for the current club
  getUsers(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/list`);
  }

  // Get a specific user by ID
  getUserById(userId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${userId}`);
  }

  // Update an existing user
  updateUser(request: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/update`, request);
  }
}
