  goToSettings(): void { this.router.navigate(['/club/settings']); }
  goToProfile():  void { this.router.navigate(['/profile']); }

  // ── Navigation ───────────────────────────────────────────────
  viewStudents():        void { this.router.navigate(['/students']); }
  registerStudent():     void { this.router.navigate(['/students/register']); }
  viewEvents():          void { this.router.navigate(['/events']); }
  createEvent():         void { this.router.navigate(['/events/create']); }
  viewUsers():           void { this.router.navigate(['/users/list']); }
  registerUser():        void { this.router.navigate(['/users/register']); }
  manageSubscriptions(): void { this.router.navigate(['/subscriptions/admin']); }
  browseSubscriptions(): void { this.router.navigate(['/subscriptions/catalog']); }
  viewReports():         void { this.router.navigate(['/reports']); }
  goToUserNotifPreferences(): void { this.router.navigate(['/club/notifications/user-preferences']); }
  goToNotifLog():             void { this.router.navigate(['/club/notifications/log']); }
  goToWallets():              void { this.router.navigate(['/wallets']); }
