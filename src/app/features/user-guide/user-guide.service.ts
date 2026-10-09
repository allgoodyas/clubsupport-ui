import { Injectable } from '@angular/core';
import { UserInfo } from '../../models/api.models';

export interface GuideStep {
  title: string;
  body: string;
  tip?: string;
  route?: string;
}

export interface GuideChapter {
  id: string;
  order: number;
  roles: Array<'admin' | 'parent' | 'master-admin'>;
  icon: string;
  color: string;
  colorHex: string;
  title: string;
  subtitle: string;
  duration: string;
  videoUrl?: string;
  tags: string[];
  steps: GuideStep[];
}

const CHAPTERS: GuideChapter[] = [

  // ────────────────────────── ADMIN ──────────────────────────

  {
    id: 'getting-started', order: 1,
    roles: ['admin'],
    icon: '🏠', color: '--accent-primary', colorHex: '#00D4FF',
    title: 'Getting Started — Dashboard Overview',
    subtitle: 'Log in, explore your stats, and learn your way around the admin dashboard.',
    duration: '3 min',
    tags: ['login', 'dashboard', 'overview', 'stats', 'welcome', 'home'],
    steps: [
      {
        title: 'Log in with your admin account',
        body: 'Open the app and enter your Saudi mobile number (+966 5X XXX XXXX) and password. The app detects your role automatically and lands you on the Admin Dashboard.',
        tip: 'Use the demo account to explore: +966 50 918 7509',
        route: '/login',
      },
      {
        title: 'Read the stat cards at a glance',
        body: 'The top row shows four live counters — Total Students, Club Users, Active Events, and Total Payments. These update in real time whenever data changes.',
        route: '/dashboard',
      },
      {
        title: 'Use the Quick-Action grid',
        body: 'Below the stats is a grid of shortcut buttons. Depending on your permissions, you can Add Student, Create Event, Add User, View Reports, or Mark Attendance directly from here.',
        tip: 'Actions only appear if you have the matching permission — a trainer sees fewer buttons than a club owner.',
      },
      {
        title: 'Check Upcoming Events',
        body: 'The bottom widget shows the next scheduled events with date, time, enrolled count, and status. Clicking an event row opens its full details.',
        route: '/events',
      },
      {
        title: 'Expand or collapse the sidebar',
        body: 'Click the ☰ button at the top of the left sidebar to expand it and show full labels, or collapse it to icon-only mode to give more space to the main content.',
      },
    ],
  },

  {
    id: 'students', order: 2,
    roles: ['admin'],
    icon: '🏃', color: '--accent-success', colorHex: '#00FF9D',
    title: 'Managing Students',
    subtitle: 'Register, search, view, and edit student profiles and their linked parent accounts.',
    duration: '5 min',
    tags: ['students', 'register', 'profile', 'parent', 'enroll', 'search', 'edit'],
    steps: [
      {
        title: 'Open the Students list',
        body: 'Click 🏃 Students in the sidebar. The list shows all registered students with name, age, gender, and enrolment status. Use the search bar to find a student by name or ID.',
        route: '/students',
      },
      {
        title: 'Register a new student',
        body: 'Click the "+ Register Student" button. Fill in the student\'s first and last name, date of birth, gender, nationality, and upload a photo if available.',
        route: '/students/register',
        tip: 'Fields marked with * are mandatory. You can save without a photo and add one later.',
      },
      {
        title: 'Link the student to a parent',
        body: 'On the registration form scroll down to the Parent section. Enter the parent\'s mobile number — if the parent already has an account the system auto-fills their details. Otherwise fill in their name and email.',
      },
      {
        title: 'View a student\'s full profile',
        body: 'Click any student row in the list to open their detail page. You\'ll see their personal info, enrolled events, subscription status, attendance summary, and the linked parent account.',
        route: '/students/:id',
      },
      {
        title: 'Edit student or parent details',
        body: 'From the student detail page, click "Edit Student" to update their profile, or "Edit Parent" to change the linked parent contact info. Changes save instantly.',
        route: '/students/:id/edit',
      },
    ],
  },

  {
    id: 'events', order: 3,
    roles: ['admin'],
    icon: '📅', color: '--accent-warning', colorHex: '#FF8C42',
    title: 'Events, Enrollment & Attendance',
    subtitle: 'Create training sessions, enroll students, assign trainers, and mark daily attendance.',
    duration: '6 min',
    tags: ['events', 'attendance', 'enrollment', 'training', 'schedule', 'trainer', 'session'],
    steps: [
      {
        title: 'Browse all events',
        body: 'Click 📅 Events in the sidebar to see a list of all past and upcoming sessions. Each card shows the event name, date range, trainer, and enrolled count.',
        route: '/events',
      },
      {
        title: 'Create a new event',
        body: 'Click "+ Create Event". Fill in the event name, description, start and end dates, capacity, and select a trainer from the dropdown. Set the recurring schedule if needed (e.g. every Monday and Wednesday).',
        route: '/events/create',
        tip: 'Setting a capacity prevents over-enrollment. Leave it blank for unlimited.',
      },
      {
        title: 'Enroll students',
        body: 'Open any event and click "Enroll Students". Search for students by name and add them one by one, or use "Enroll All" to add an entire team at once.',
        route: '/events/:id',
      },
      {
        title: 'Mark attendance',
        body: 'From the event detail page, click "Mark Attendance". A checklist appears with all enrolled students — tap ✅ Present or ❌ Absent for each. The system timestamps and saves the record.',
        tip: 'You can also use the "Mark Attendance" Quick-Action button on the dashboard to jump straight to today\'s events.',
      },
      {
        title: 'Review attendance history',
        body: 'Each student\'s attendance record is visible on their profile page. Admins can also see an attendance summary per event from the event detail view.',
      },
    ],
  },

  {
    id: 'users', order: 4,
    roles: ['admin'],
    icon: '👤', color: '--accent-info', colorHex: '#A855F7',
    title: 'Managing Club Users & Roles',
    subtitle: 'Add staff members, assign roles, and control what each person can see and do.',
    duration: '4 min',
    tags: ['users', 'staff', 'roles', 'permissions', 'admin', 'trainer', 'register'],
    steps: [
      {
        title: 'Open the Users list',
        body: 'Click 👤 Users in the sidebar. You\'ll see all staff accounts — admins, trainers, reception staff — with their role, mobile, and status.',
        route: '/users/list',
      },
      {
        title: 'Register a new user',
        body: 'Click "+ Register User". Enter the staff member\'s name, mobile number, email, and select their role from the dropdown. Available roles are defined by the club owner (e.g. Admin, Trainer, Staff).',
        route: '/users/register',
        tip: 'A welcome notification is sent to the new user\'s mobile number with login instructions.',
      },
      {
        title: 'Understand role permissions',
        body: 'Each role comes with a preset permission bundle. A Trainer can view students and mark attendance but cannot see payment history. An Admin has full access. Permissions are set by the club owner on the backend.',
      },
      {
        title: 'Edit an existing user',
        body: 'Click any user row and then "Edit". You can update their name, email, and role assignment. Changing the role takes effect on their next login.',
        route: '/users/edit/:id',
      },
    ],
  },

  {
    id: 'payments', order: 5,
    roles: ['admin'],
    icon: '💰', color: '--accent-success', colorHex: '#00FF9D',
    title: 'Payments & Financial Reports',
    subtitle: 'Track all incoming payments, issue refunds, and generate financial summaries.',
    duration: '5 min',
    tags: ['payments', 'invoices', 'reports', 'finance', 'history', 'refund', 'revenue'],
    steps: [
      {
        title: 'Open Payment History',
        body: 'Click 💰 Payments in the sidebar. The list shows every payment processed — amount, parent name, student, date, and status (Paid / Partial / Overdue).',
        route: '/payments/history',
      },
      {
        title: 'Use Quick-Pay',
        body: 'To collect a payment on behalf of a parent (e.g. cash payment), click "Quick Pay" on the payment history page. Select the parent, choose the outstanding invoice, enter the amount and payment method.',
        tip: 'Quick-Pay generates a receipt that can be printed or sent to the parent via WhatsApp.',
      },
      {
        title: 'Issue a refund',
        body: 'Open a specific payment record, click "Refund", and enter the refund amount and reason. The refund is logged against the original invoice.',
      },
      {
        title: 'View Financial Reports',
        body: 'Click 📊 Reports → Financial Report. Choose a date range and the report shows total revenue, outstanding balances, expense totals, and net income broken down by month.',
        route: '/reports/financial',
        tip: 'Use the Export button to download the report as a spreadsheet.',
      },
    ],
  },

  {
    id: 'subscriptions-admin', order: 6,
    roles: ['admin'],
    icon: '📋', color: '--accent-primary', colorHex: '#00D4FF',
    title: 'Subscription Plans',
    subtitle: 'Create monthly or term-based membership plans and manage which students are enrolled.',
    duration: '4 min',
    tags: ['subscriptions', 'plans', 'billing', 'pricing', 'membership', 'monthly', 'term'],
    steps: [
      {
        title: 'Open Subscription Plans admin',
        body: 'From the Quick-Action grid on the Dashboard, click "Subscription Plans". This lists all plans the club has created with their price, duration, and active subscriber count.',
        route: '/subscriptions/admin',
      },
      {
        title: 'Create a new plan',
        body: 'Click "+ Create Plan". Enter the plan name (e.g. "Monthly Football"), price, billing cycle (monthly / quarterly / annual), and a description. Set a start/end date if it\'s a fixed-term plan.',
        route: '/subscriptions/admin/create',
        tip: 'You can create multiple plans for different programs — Swimming, Football, Mixed. Parents see all plans in the catalog.',
      },
      {
        title: 'View plan subscribers',
        body: 'Click "View Subscribers" on any plan to see which students are enrolled, their payment status, and renewal dates.',
        route: '/subscriptions/admin/subscribers/:planId',
      },
      {
        title: 'Browse the subscription catalog',
        body: 'Click "Browse Plans" to see the catalog view — exactly what parents see when choosing a plan for their child.',
        route: '/subscriptions/catalog',
      },
    ],
  },

  {
    id: 'expenses', order: 7,
    roles: ['admin'],
    icon: '💸', color: '--accent-danger', colorHex: '#FF4757',
    title: 'Expenses & Ad-hoc Charges',
    subtitle: 'Record club expenses and create one-off charges for individual students.',
    duration: '3 min',
    tags: ['expenses', 'charges', 'adhoc', 'finance', 'costs', 'uniform', 'equipment'],
    steps: [
      {
        title: 'Record a club expense',
        body: 'Click 💸 Expenses in the sidebar. Click "+ Add Expense", enter the amount, category (Equipment, Venue, Salaries, etc.), date, and an optional note. Expenses reduce the net income shown in financial reports.',
        route: '/expenses',
      },
      {
        title: 'Create an Ad-hoc Charge',
        body: 'Click 🧾 Ad-hoc Charges in the sidebar. Use this for one-off fees such as a uniform deposit, registration fee, or a trip cost not covered by a subscription plan.',
        route: '/adhoc-charges',
        tip: 'Ad-hoc charges appear as invoices in the parent\'s account, payable through the parent portal.',
      },
      {
        title: 'Assign a charge to a specific student',
        body: 'When creating an ad-hoc charge, search for the student\'s name and select them. The invoice is linked to their parent account automatically.',
      },
    ],
  },

  {
    id: 'teams-wallets', order: 8,
    roles: ['admin'],
    icon: '👥', color: '--accent-info', colorHex: '#A855F7',
    title: 'Teams & Parent Wallets',
    subtitle: 'Organise students into teams and manage parent prepaid wallet balances.',
    duration: '3 min',
    tags: ['teams', 'wallets', 'balance', 'groups', 'squad', 'prepaid'],
    steps: [
      {
        title: 'Create and manage teams',
        body: 'Click 👥 Teams in the sidebar. Click "+ Create Team", give it a name (e.g. "Under-12 Football") and optionally assign a trainer. Teams help you filter students quickly when enrolling in bulk.',
        route: '/teams',
      },
      {
        title: 'Assign students to a team',
        body: 'Open a team and click "Add Members". Search for students by name and add them. A student can belong to multiple teams.',
      },
      {
        title: 'View parent wallet balances',
        body: 'Click 👛 Parent Wallets in the sidebar. This shows each parent\'s prepaid credit balance. Wallet credit is used automatically when a parent pays an invoice.',
        route: '/wallets',
        tip: 'Top up a parent\'s wallet by selecting them and clicking "Add Credit". Useful for cash payments collected at the club.',
      },
    ],
  },

  {
    id: 'notifications', order: 9,
    roles: ['admin'],
    icon: '🔔', color: '--accent-warning', colorHex: '#FF8C42',
    title: 'Club Notifications',
    subtitle: 'Send push and in-app notifications to parents and view the delivery log.',
    duration: '3 min',
    tags: ['notifications', 'alerts', 'push', 'message', 'broadcast', 'log', 'sms'],
    steps: [
      {
        title: 'Open Notification Settings',
        body: 'Click 🔔 Notifications in the sidebar. This is where you configure which events trigger automatic notifications to parents (payment due, attendance marked, event created, etc.).',
        route: '/club/notifications',
      },
      {
        title: 'Send a manual notification',
        body: 'Click "Send Notification" from the dashboard Quick-Actions or from the Notifications page. Type your message, choose the audience (all parents, a specific team, or individual parents), and click Send.',
        tip: 'Always preview your message before sending — notifications cannot be recalled once sent.',
      },
      {
        title: 'View the notification log',
        body: 'Click "Notification Log" to see every notification sent — who received it, when, and whether it was delivered. Use this to confirm announcements reached the intended audience.',
        route: '/club/notifications/log',
      },
    ],
  },

  {
    id: 'club-settings', order: 10,
    roles: ['admin'],
    icon: '⚙️', color: '--accent-primary', colorHex: '#00D4FF',
    title: 'Club Settings & Branding',
    subtitle: 'Update your club details, upload your logo, and customise the app colour theme.',
    duration: '2 min',
    tags: ['settings', 'branding', 'logo', 'theme', 'configuration', 'club', 'colours'],
    steps: [
      {
        title: 'Open Club Settings',
        body: 'Click ⚙️ Settings in the sidebar. Here you can update the club\'s official name (English and Arabic), city, phone number, and website.',
        route: '/club/settings',
      },
      {
        title: 'Upload your club logo',
        body: 'Click "Upload Logo" and select an image file (PNG or JPG, recommended size 256×256px). The logo appears in the top-left header across the entire app for your club.',
        tip: 'Use a square logo with a transparent or white background for best results.',
      },
      {
        title: 'Customise the colour theme',
        body: 'Scroll to the Theme section and pick a primary accent colour using the colour picker. The chosen colour applies to buttons, active nav items, and gradient headers throughout the app immediately.',
      },
    ],
  },

  // ────────────────────────── PARENT ──────────────────────────

  {
    id: 'parent-dashboard', order: 11,
    roles: ['parent'],
    icon: '🏡', color: '--accent-success', colorHex: '#00FF9D',
    title: 'Parent Dashboard Overview',
    subtitle: 'Log in as a parent, see your summary at a glance, and access your children\'s cards.',
    duration: '3 min',
    tags: ['parent', 'dashboard', 'children', 'overview', 'login', 'home', 'summary'],
    steps: [
      {
        title: 'Log in as a parent',
        body: 'Open the app and enter your registered mobile number and password. The app detects your Parent role and takes you directly to the Parent Dashboard.',
        tip: 'Demo parent account: +966 56 459 5338 (no password shown here — ask your club admin for credentials).',
        route: '/login',
      },
      {
        title: 'Read your summary stats',
        body: 'The top of the dashboard shows four stat pills: number of children enrolled, active events, active subscription plans, and pending invoice count. A red banner appears if any payment is overdue.',
        route: '/parent/dashboard',
      },
      {
        title: 'Explore your children\'s cards',
        body: 'Each child has a card showing their photo, name, and quick-action pills (Events, Attendance, Subscriptions, Invoices). Tap any pill to jump straight to that section for that child.',
      },
      {
        title: 'Navigate back to the dashboard',
        body: 'Tap the club logo or "Club Management" header at the top to return to the main parent dashboard from any sub-page.',
      },
    ],
  },

  {
    id: 'parent-children', order: 12,
    roles: ['parent'],
    icon: '🪪', color: '--accent-info', colorHex: '#A855F7',
    title: 'Viewing Your Child\'s Profile',
    subtitle: 'Access your child\'s student ID card, QR code, and full enrolment details.',
    duration: '3 min',
    tags: ['parent', 'child', 'profile', 'student', 'ID card', 'QR code', 'enrolment'],
    steps: [
      {
        title: 'Open your child\'s profile',
        body: 'From the Parent Dashboard, tap the child\'s name or photo on their card. This opens their full student profile.',
        route: '/parent/student/:id',
      },
      {
        title: 'View and share the Student ID card',
        body: 'Scroll down to the Student ID Card section. It shows your child\'s photo, name, student number, and a QR code. Tap "Share" to send it to your phone\'s gallery or share via WhatsApp.',
        tip: 'The QR code can be scanned by the club\'s admin to instantly pull up the student\'s profile.',
      },
      {
        title: 'See current enrolments',
        body: 'Below the ID card, the Enrolments section lists every active event or program your child is signed up for, with the trainer\'s name and session schedule.',
      },
    ],
  },

  {
    id: 'parent-invoices', order: 13,
    roles: ['parent'],
    icon: '💳', color: '--accent-warning', colorHex: '#FF8C42',
    title: 'Paying Invoices Online',
    subtitle: 'View outstanding invoices for all your children and complete payments in a few taps.',
    duration: '4 min',
    tags: ['parent', 'invoices', 'payment', 'checkout', 'online', 'pay', 'billing'],
    steps: [
      {
        title: 'Open Pending Invoices',
        body: 'Tap "Invoices" on any child\'s card, or tap the red "You have unpaid invoices" banner at the top of your dashboard. This opens the full invoice list for all your children.',
        route: '/parent/invoices',
      },
      {
        title: 'Filter by child',
        body: 'Use the child filter tabs at the top of the invoice page to see invoices for one specific child or all children together.',
      },
      {
        title: 'Select invoices to pay',
        body: 'Tick the checkboxes next to the invoices you want to pay. The total updates at the bottom. You can pay one or several at once.',
        tip: 'Subscription and ad-hoc invoices appear here. Partial payments are supported — enter the amount you want to pay now.',
      },
      {
        title: 'Checkout',
        body: 'Tap "Proceed to Payment". The checkout screen shows the selected invoices, your subtotal, and the available payment methods set up by your club (card, bank transfer, wallet credit).',
        route: '/parent/payments/checkout',
      },
      {
        title: 'Confirm and receive receipt',
        body: 'After payment, the success screen shows a confirmation with a transaction reference. A receipt is also sent to your registered mobile number.',
        route: '/parent/payments/success',
      },
    ],
  },

  {
    id: 'parent-progress', order: 14,
    roles: ['parent'],
    icon: '📊', color: '--accent-primary', colorHex: '#00D4FF',
    title: 'Tracking Your Child\'s Progress',
    subtitle: 'Check which events your child is in, review attendance history, and see active subscriptions.',
    duration: '3 min',
    tags: ['parent', 'progress', 'events', 'attendance', 'subscriptions', 'track', 'history'],
    steps: [
      {
        title: 'View enrolled events',
        body: 'Tap the "Events" pill on your child\'s card. You\'ll see every event or training session they\'re enrolled in, with date, time, trainer, and status.',
        route: '/parent/progress/events/:studentId',
      },
      {
        title: 'Check attendance history',
        body: 'Tap the "Attendance" pill to see a calendar-style log of your child\'s attendance — green for present, red for absent. The summary at the top shows overall attendance percentage.',
        route: '/parent/progress/attendance/:studentId',
      },
      {
        title: 'Review active subscriptions',
        body: 'Tap the "Subscriptions" pill to see which subscription plans are currently active for your child — plan name, start/end date, and renewal status.',
        route: '/parent/progress/subscriptions/:studentId',
      },
    ],
  },

  {
    id: 'parent-profile', order: 15,
    roles: ['parent'],
    icon: '👤', color: '--accent-success', colorHex: '#00FF9D',
    title: 'Managing Your Parent Profile',
    subtitle: 'Update your contact information and language preference.',
    duration: '2 min',
    tags: ['parent', 'profile', 'contact', 'language', 'settings', 'account', 'edit'],
    steps: [
      {
        title: 'Open your profile',
        body: 'Tap the avatar icon or your name in the top-right corner of the Parent Dashboard, then tap "Profile".',
        route: '/parent/profile',
      },
      {
        title: 'Update your contact details',
        body: 'Edit your full name, email address, and alternate phone number. Tap Save to apply the changes.',
        tip: 'Your primary mobile number (used to log in) cannot be changed here — contact your club admin to update it.',
      },
      {
        title: 'Switch language',
        body: 'Tap the language toggle (EN / AR) in the top-right header to switch the entire app between English and Arabic instantly. Your preference is remembered for future sessions.',
      },
    ],
  },

  // ────────────────────── MASTER ADMIN ──────────────────────────

  {
    id: 'master-dashboard', order: 16,
    roles: ['master-admin'],
    icon: '🌐', color: '--accent-primary', colorHex: '#00D4FF',
    title: 'Platform Overview — Master Admin Dashboard',
    subtitle: 'Monitor platform-wide stats, total clubs, users, and system health at a glance.',
    duration: '2 min',
    tags: ['master-admin', 'platform', 'overview', 'stats', 'clubs', 'system'],
    steps: [
      {
        title: 'Log in as Master Admin',
        body: 'Go to the plain /login URL (no club slug). Enter the master admin credentials. You are redirected to the Master Admin dashboard — a different interface from club-level pages.',
        route: '/login',
      },
      {
        title: 'Read the platform stats',
        body: 'The dashboard shows: Total Clubs, Active Clubs, Total Users across all clubs, and Total Students. These are real-time aggregates from the entire platform.',
        route: '/master-admin',
      },
    ],
  },

  {
    id: 'master-clubs', order: 17,
    roles: ['master-admin'],
    icon: '🏟️', color: '--accent-info', colorHex: '#A855F7',
    title: 'Managing Clubs',
    subtitle: 'Onboard new sports clubs, edit existing club configurations, and view the full club directory.',
    duration: '4 min',
    tags: ['master-admin', 'clubs', 'onboard', 'create', 'configure', 'directory'],
    steps: [
      {
        title: 'View all clubs',
        body: 'Click Clubs in the master admin sidebar. The directory lists every club on the platform with their name, status, city, and user count.',
        route: '/master-admin/clubs',
      },
      {
        title: 'Create a new club',
        body: 'Click "+ Create Club". Fill in club name (English and Arabic), city, country, currency, and the initial admin\'s mobile number and name. Set the club\'s primary accent colour and upload a logo.',
        route: '/master-admin/create-club',
        tip: 'The club slug (used in the login URL /login/:slug) is auto-generated from the club name. You can override it.',
      },
      {
        title: 'Edit an existing club',
        body: 'Click "Edit" on any club in the list to update its details, change the admin, or deactivate the club account.',
        route: '/master-admin/clubs/:id/edit',
      },
    ],
  },

  {
    id: 'master-billing', order: 18,
    roles: ['master-admin'],
    icon: '💳', color: '--accent-warning', colorHex: '#FF8C42',
    title: 'Platform Billing & Services',
    subtitle: 'Manage the platform\'s service catalogue, set pricing per club, and view all invoices.',
    duration: '3 min',
    tags: ['master-admin', 'billing', 'services', 'pricing', 'invoices', 'revenue', 'catalogue'],
    steps: [
      {
        title: 'Manage the Service Catalogue',
        body: 'Click Billing → Services. Add or edit the platform-level services (e.g. SMS credits, payment gateway fees) that clubs are charged for.',
        route: '/master-admin/billing/services',
      },
      {
        title: 'Configure per-club pricing',
        body: 'Click Billing → Club Pricing. Set a custom pricing tier for each club — monthly subscription, per-student fee, or a flat rate.',
        route: '/master-admin/billing/clubs',
      },
      {
        title: 'View all platform invoices',
        body: 'Click Billing → Invoices. This shows all invoices issued to clubs — outstanding and paid — with filters by date and club.',
        route: '/master-admin/billing/invoices',
      },
    ],
  },

];

@Injectable({ providedIn: 'root' })
export class UserGuideService {

  getChaptersForUser(user: UserInfo | null): GuideChapter[] {
    if (!user) return [];
    if (user.isMasterAdmin) return CHAPTERS.filter(c => c.roles.includes('master-admin'));
    const roleName = (user.roleName || '').toLowerCase();
    const isParent = roleName.includes('parent') || roleName.includes('customer');
    return isParent
      ? CHAPTERS.filter(c => c.roles.includes('parent'))
      : CHAPTERS.filter(c => c.roles.includes('admin'));
  }

  getChapterById(id: string): GuideChapter | undefined {
    return CHAPTERS.find(c => c.id === id);
  }

  getAdjacentChapters(id: string, user: UserInfo | null): { prev?: GuideChapter; next?: GuideChapter } {
    const list = this.getChaptersForUser(user);
    const idx = list.findIndex(c => c.id === id);
    return {
      prev: idx > 0 ? list[idx - 1] : undefined,
      next: idx < list.length - 1 ? list[idx + 1] : undefined,
    };
  }

  search(query: string, user: UserInfo | null): GuideChapter[] {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return this.getChaptersForUser(user).filter(c => {
      if (c.title.toLowerCase().includes(q)) return true;
      if (c.subtitle.toLowerCase().includes(q)) return true;
      if (c.tags.some(t => t.includes(q))) return true;
      return c.steps.some(s =>
        s.title.toLowerCase().includes(q) || s.body.toLowerCase().includes(q)
      );
    });
  }
}
