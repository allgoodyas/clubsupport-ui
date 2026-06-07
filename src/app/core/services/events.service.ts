import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  EventListItem, 
  EventDetails, 
  CreateEventRequest,
  EventApiResponse 
} from '../../shared/models/event.model';

@Injectable({
  providedIn: 'root'
})
export class EventsService {
  private apiUrl = `${environment.apiUrl}/events`;

  constructor(private http: HttpClient) {}

  getEvents(): Observable<EventApiResponse<EventListItem[]>> {
    return this.http.get<EventApiResponse<EventListItem[]>>(this.apiUrl);
  }

  getEventById(eventId: number): Observable<EventApiResponse<EventDetails>> {
    return this.http.get<EventApiResponse<EventDetails>>(`${this.apiUrl}/${eventId}`);
  }

  createEvent(request: CreateEventRequest): Observable<EventApiResponse<number>> {
    return this.http.post<EventApiResponse<number>>(this.apiUrl, request);
  }

  updateEvent(eventId: number, request: CreateEventRequest): Observable<EventApiResponse<boolean>> {
    return this.http.put<EventApiResponse<boolean>>(`${this.apiUrl}/${eventId}`, request);
  }

  getEventBannerUrl(eventId: number): string {
    return `${this.apiUrl}/${eventId}/banner`;
  }

  deleteEvent(eventId: number): Observable<EventApiResponse<boolean>> {
    return this.http.delete<EventApiResponse<boolean>>(`${this.apiUrl}/${eventId}`);
  }

  // Dashboard Statistics
  getEventStats(): Observable<EventApiResponse<{
    totalEvents: number;
    upcomingEvents: number;
    activeEvents: number;
    thisMonthEvents: number;
    totalEnrollments: number;
    publishedEvents: number;
    draftEvents: number;
  }>> {
    return this.http.get<EventApiResponse<any>>(`${this.apiUrl}/stats`);
  }

  getUpcomingEvents(limit: number = 5): Observable<EventApiResponse<EventListItem[]>> {
    return this.http.get<EventApiResponse<EventListItem[]>>(`${this.apiUrl}/upcoming?limit=${limit}`);
  }
}
