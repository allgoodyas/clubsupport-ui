import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-parent-dashboard-test',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div style="padding: 2rem; background: #667eea; min-height: 100vh; color: white;">
      <h1>🧪 Parent Dashboard Test</h1>
      
      <div *ngIf="isLoading">
        <h2>Loading...</h2>
      </div>
      
      <div *ngIf="error">
        <h2 style="color: red;">Error: {{ error }}</h2>
      </div>
      
      <div *ngIf="data">
        <h2>✅ Success! Data received:</h2>
        <pre style="background: white; color: black; padding: 1rem; border-radius: 8px;">{{ data | json }}</pre>
      </div>
      
      <div *ngIf="logs.length > 0" style="margin-top: 2rem;">
        <h3>📋 Console Logs:</h3>
        <div *ngFor="let log of logs" style="background: rgba(255,255,255,0.1); padding: 0.5rem; margin: 0.5rem 0; border-radius: 4px;">
          {{ log }}
        </div>
      </div>
    </div>
  `
})
export class ParentDashboardTestComponent implements OnInit {
  isLoading = false;
  error: string | null = null;
  data: any = null;
  logs: string[] = [];

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.log('✅ Constructor called');
  }

  ngOnInit() {
    this.log('✅ ngOnInit called');
    this.testAPI();
  }

  log(message: string) {
    console.log(message);
    this.logs.push(`${new Date().toLocaleTimeString()}: ${message}`);
  }

  testAPI() {
    this.log('🔄 Starting API test...');
    this.isLoading = true;
    
    const token = localStorage.getItem('access_token');
    this.log(`🔑 Token exists: ${!!token}`);
    
    if (!token) {
      this.error = 'No access token found!';
      this.isLoading = false;
      return;
    }

    this.log('📡 Making API call to /api/ParentDashboard/summary');
    
    this.http.get('https://localhost:5001/api/ParentDashboard/summary', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).subscribe({
      next: (response) => {
        this.log('✅ API call successful!');
        this.data = response;
        this.isLoading = false;
      },
      error: (err) => {
        this.log(`❌ API error: ${err.status} - ${err.statusText}`);
        this.error = `${err.status}: ${err.message}`;
        this.isLoading = false;
        console.error('Full error:', err);
      }
    });
  }
}
