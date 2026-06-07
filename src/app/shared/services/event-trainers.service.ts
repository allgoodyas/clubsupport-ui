import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AssignTrainerDto {
  eventId: number;
  trainerId: number;
  trainerRole: string; // 'Primary', 'Assistant', 'Trainer'
  notes?: string;
}

export interface EventTrainerDto {
  eventTrainerId: number;
  eventId: number;
  eventName: string;
  eventType: string;
  trainerId: number;
  trainerName: string;
  trainerEmail: string;
  trainerRole: string;
  assignedDate: Date;
  assignedByName: string;
  clubId: number;
  clubName: string;
  isActive: boolean;
  notes?: string;
}

export interface AvailableTrainerDto {
  userId: number;
  fullName: string;
  email: string;
  mobileNumber?: string;
  isAlreadyAssigned: boolean;
  currentRole?: string;
}

export interface UpdateTrainerRoleDto {
  trainerRole: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EventTrainersService {
  private apiUrl = `${environment.apiUrl}/EventTrainers`;

  constructor(private http: HttpClient) { }

  // Auth handled by HTTP interceptor — no manual headers needed

  getEventTrainers(eventId: number): Observable<EventTrainerDto[]> {
    return this.http.get<EventTrainerDto[]>(`${this.apiUrl}/event/${eventId}`);
  }

  getAvailableTrainers(eventId: number): Observable<AvailableTrainerDto[]> {
    return this.http.get<AvailableTrainerDto[]>(`${this.apiUrl}/available/${eventId}`);
  }

  assignTrainer(dto: AssignTrainerDto): Observable<EventTrainerDto> {
    return this.http.post<EventTrainerDto>(this.apiUrl, dto);
  }

  updateTrainerRole(eventId: number, trainerId: number, dto: UpdateTrainerRoleDto): Observable<any> {
    return this.http.put(`${this.apiUrl}/${eventId}/${trainerId}`, dto);
  }

  removeTrainer(eventId: number, trainerId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${eventId}/${trainerId}`);
  }
}
