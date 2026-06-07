import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-parent-subscriptions',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="progress-page">
      <div class="header">
        <button class="btn-back" (click)="goBack()">← Back to Dashboard</button>
        <h1>🎯 Student Subscriptions</h1>
      </div>
      <div class="content">
        <div class="placeholder">
          <h2>🚧 Under Construction</h2>
          <p>Student ID: {{ studentId }}</p>
          <p>This page will show all subscription history.</p>
          <p class="note">Coming soon with active and past subscriptions!</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .progress-page {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      margin-bottom: 2rem;
    }

    .btn-back {
      background: #8b5cf6;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1rem;
      margin-bottom: 1rem;

      &:hover {
        background: #7c3aed;
      }
    }

    h1 {
      font-size: 2rem;
      color: #333;
      margin: 0;
    }

    .placeholder {
      background: white;
      border: 2px dashed #8b5cf6;
      border-radius: 16px;
      padding: 3rem;
      text-align: center;

      h2 {
        color: #8b5cf6;
        margin: 0 0 1rem 0;
      }

      p {
        color: #666;
        margin: 0.5rem 0;
      }

      .note {
        margin-top: 1.5rem;
        font-style: italic;
        color: #999;
      }
    }
  `]
})
export class ParentSubscriptionsComponent implements OnInit {
  studentId: number = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.studentId = Number(this.route.snapshot.paramMap.get('studentId'));
    console.log('🎯 Subscriptions page loaded for student:', this.studentId);
  }

  goBack() {
    this.router.navigate(['/parent/dashboard']);
  }
}
