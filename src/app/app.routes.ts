import { Routes } from '@angular/router';
import { LoginComponent } from './features/login/login.component';
import { AuthGuard } from './core/guards/auth.guard';
import { SubscriptionPlansAdminComponent } from './features/subscriptions/subscription-plans-admin.component';
import { SubscriptionPlanFormComponent } from './features/subscriptions/subscription-plan-form.component';
import { SubscriptionCatalogComponent } from './features/subscriptions/subscription-catalog.component';
import { MySubscriptionsComponent } from './features/subscriptions/my-subscriptions.component';
import { PurchaseSubscriptionComponent } from './features/subscriptions/purchase-subscription.component';
import { PlanSubscribersComponent } from './features/subscriptions/plan-subscribers.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'login/:clubSlug', component: LoginComponent },

  // Master Admin
  { path: 'master-admin', canActivate: [AuthGuard], data: { requireMasterAdmin: true },
    loadComponent: () => import('./features/master-admin/master-admin-dashboard/master-admin-dashboard.component').then(m => m.MasterAdminDashboardComponent) },
  { path: 'master-admin/create-club', canActivate: [AuthGuard], data: { requireMasterAdmin: true },
    loadComponent: () => import('./features/master-admin/create-club/create-club.component').then(m => m.CreateClubComponent) },
  { path: 'master-admin/billing/services', canActivate: [AuthGuard], data: { requireMasterAdmin: true },
    loadComponent: () => import('./features/master-admin/master-billing/service-catalogue.component').then(m => m.ServiceCatalogueComponent) },
  { path: 'master-admin/billing/clubs', canActivate: [AuthGuard], data: { requireMasterAdmin: true },
    loadComponent: () => import('./features/master-admin/master-billing/club-pricing.component').then(m => m.ClubPricingComponent) },
  { path: 'master-admin/billing/invoices', canActivate: [AuthGuard], data: { requireMasterAdmin: true },
    loadComponent: () => import('./features/master-admin/master-billing/master-invoices.component').then(m => m.MasterInvoicesComponent) },
  { path: 'master-admin/analytics', canActivate: [AuthGuard],
    loadComponent: () => import('./features/master-admin/master-analytics/master-analytics.component').then(m => m.MasterAnalyticsComponent) },
  { path: 'master-admin/clubs', canActivate: [AuthGuard], data: { requireMasterAdmin: true },
    loadComponent: () => import('./features/master-admin/clubs-list/clubs-list.component').then(m => m.ClubsListComponent) },
  { path: 'master-admin/clubs/:id/edit', canActivate: [AuthGuard], data: { requireMasterAdmin: true },
    loadComponent: () => import('./features/master-admin/create-club/create-club.component').then(m => m.CreateClubComponent) },

  // Club
  { path: 'dashboard', canActivate: [AuthGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'club/settings', canActivate: [AuthGuard],
    loadComponent: () => import('./features/master-admin/create-club/create-club.component').then(m => m.CreateClubComponent) },

  // Students
  { path: 'students', canActivate: [AuthGuard],
    loadComponent: () => import('./features/students/students-list.component').then(m => m.StudentsListComponent) },
  { path: 'students/register', canActivate: [AuthGuard],
    loadComponent: () => import('./features/students/register-student.component').then(m => m.RegisterStudentComponent) },
  { path: 'students/:id', canActivate: [AuthGuard],
    loadComponent: () => import('./features/students/student-details.component').then(m => m.StudentDetailsComponent) },
  { path: 'students/:id/edit', canActivate: [AuthGuard],
    loadComponent: () => import('./features/students/edit-student.component').then(m => m.EditStudentComponent) },
  { path: 'students/:id/edit-parent', canActivate: [AuthGuard],
    loadComponent: () => import('./features/students/edit-parent.component').then(m => m.EditParentComponent) },

  // Events
  { path: 'events', canActivate: [AuthGuard],
    loadChildren: () => import('./features/events/events.module').then(m => m.EventsModule) },

  // Subscriptions
  { path: 'subscriptions/admin', canActivate: [AuthGuard], component: SubscriptionPlansAdminComponent },
  { path: 'subscriptions/admin/create', canActivate: [AuthGuard], component: SubscriptionPlanFormComponent },
  { path: 'subscriptions/admin/edit/:id', canActivate: [AuthGuard], component: SubscriptionPlanFormComponent },
  { path: 'subscriptions/admin/subscribers/:planId', canActivate: [AuthGuard], component: PlanSubscribersComponent },
  { path: 'subscriptions/catalog', canActivate: [AuthGuard], component: SubscriptionCatalogComponent },
  { path: 'subscriptions/my-subscriptions', canActivate: [AuthGuard], component: MySubscriptionsComponent },
  { path: 'subscriptions/purchase/:planId', canActivate: [AuthGuard], component: PurchaseSubscriptionComponent },

  // Users
  { path: 'users/list', canActivate: [AuthGuard],
    loadComponent: () => import('./features/users/user-list.component').then(m => m.UserListComponent) },
  { path: 'users/register', canActivate: [AuthGuard],
    loadComponent: () => import('./features/users/user-registration.component').then(m => m.UserRegistrationComponent) },
  { path: 'users/edit/:id', canActivate: [AuthGuard],
    loadComponent: () => import('./features/users/user-registration.component').then(m => m.UserRegistrationComponent) },

  // Parent portal
  { path: 'parent/dashboard', canActivate: [AuthGuard],
    loadComponent: () => import('./features/parent-portal/parent-dashboard.component').then(m => m.ParentDashboardComponent) },
  { path: 'parent/profile', canActivate: [AuthGuard],
    loadComponent: () => import('./features/parent-portal/parent-profile.component').then(m => m.ParentProfileComponent) },
  { path: 'parent/student/:id', canActivate: [AuthGuard],
    loadComponent: () => import('./features/parent-portal/student-view.component').then(m => m.StudentViewComponent) },
  { path: 'parent/test', canActivate: [AuthGuard],
    loadComponent: () => import('./features/parent-portal/parent-dashboard-test.component').then(m => m.ParentDashboardTestComponent) },
  { path: 'parent/invoices', canActivate: [AuthGuard],
    loadComponent: () => import('./features/parent-portal/pending-invoices.component').then(m => m.PendingInvoicesComponent) },
  { path: 'parent/payments/checkout', canActivate: [AuthGuard],
    loadComponent: () => import('./features/parent-portal/payment-checkout.component').then(m => m.PaymentCheckoutComponent) },
  { path: 'parent/payments/success', canActivate: [AuthGuard],
    loadComponent: () => import('./features/parent-portal/payment-success.component').then(m => m.PaymentSuccessComponent) },
  { path: 'parent/progress/events/:studentId', canActivate: [AuthGuard],
    loadComponent: () => import('./features/parent-portal/parent-events.component').then(m => m.ParentEventsComponent) },
  { path: 'parent/progress/attendance/:studentId', canActivate: [AuthGuard],
    loadComponent: () => import('./features/parent-portal/parent-attendance.component').then(m => m.ParentAttendanceComponent) },
  { path: 'parent/progress/subscriptions/:studentId', canActivate: [AuthGuard],
    loadComponent: () => import('./features/parent-portal/parent-subscriptions.component').then(m => m.ParentSubscriptionsComponent) },

  // Financials
  { path: 'payments/history', canActivate: [AuthGuard],
    loadComponent: () => import('./features/payments/payment-history.component').then(m => m.PaymentHistoryComponent) },
  { path: 'reports', canActivate: [AuthGuard],
    loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent) },
  { path: 'reports/financial', canActivate: [AuthGuard],
    loadComponent: () => import('./features/reports/financial-report.component').then(m => m.FinancialReportComponent) },
  { path: 'expenses', canActivate: [AuthGuard],
    loadComponent: () => import('./features/expenses/expenses.component').then(m => m.ExpensesComponent) },
  { path: 'adhoc-charges', canActivate: [AuthGuard],
    loadComponent: () => import('./features/adhoc-charges/adhoc-charges.component').then(m => m.AdhocChargesComponent) },

  // Notifications
  { path: 'club/notifications', canActivate: [AuthGuard],
    loadComponent: () => import('./features/notifications/club-notification-settings.component').then(m => m.ClubNotificationSettingsComponent) },
  { path: 'club/notifications/user-preferences', canActivate: [AuthGuard],
    loadComponent: () => import('./features/notifications/user-notification-preferences.component').then(m => m.UserNotificationPreferencesComponent) },

  // ── NEW: Notification Analytics / Log ──────────────────────────────────
  { path: 'club/notifications/log', canActivate: [AuthGuard],
    loadComponent: () => import('./features/notifications/notification-log.component').then(m => m.NotificationLogComponent) },

  // Teams
  { path: 'teams', canActivate: [AuthGuard],
    loadComponent: () => import('./features/teams/teams.component').then(m => m.TeamsComponent) },

  // Wallet
  { path: 'wallets', canActivate: [AuthGuard],
    loadComponent: () => import('./features/wallet/wallet-management.component').then(m => m.WalletManagementComponent) },

  // Wildcard — MUST BE LAST
  { path: '**', redirectTo: '/login' }
];
