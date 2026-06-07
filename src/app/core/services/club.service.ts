import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { CreateClubRequest, CreateClubResponse, ClubDetailsResponse } from '../../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class ClubService {
  constructor(private apiService: ApiService) {}

  createClub(request: CreateClubRequest): Observable<CreateClubResponse> {
    return this.apiService.post<CreateClubResponse>('master/clubs', request);
  }

  getAllClubs(): Observable<ClubDetailsResponse[]> {
    return this.apiService.get<ClubDetailsResponse[]>('master/clubs');
  }

  getClubById(clubId: number, isMasterAdmin: boolean = true): Observable<ClubDetailsResponse> {
    if (isMasterAdmin) {
      return this.apiService.get<ClubDetailsResponse>(`master/clubs/${clubId}`);
    } else {
      return this.apiService.get<ClubDetailsResponse>('club/details');
    }
  }

  updateClub(clubId: number, request: any, isMasterAdmin: boolean = true): Observable<any> {
    if (isMasterAdmin) {
      return this.apiService.put(`master/clubs/${clubId}`, request);
    } else {
      return this.apiService.put('club/settings', request);
    }
  }

  deleteClub(clubId: number): Observable<any> {
    return this.apiService.delete(`master/clubs/${clubId}`);
  }

  toggleClubStatus(clubId: number): Observable<{ success: boolean; isActive: boolean; message: string }> {
    return this.apiService.patch(`master/clubs/${clubId}/toggle-status`, {});
  }
}
