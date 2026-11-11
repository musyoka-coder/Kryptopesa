import { Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Account, AccountService } from './account.service';

@Component({ selector: 'app-root', templateUrl: './app.html' })
export class App {
  private readonly service = inject(AccountService);
  readonly account = signal<Account | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  private revision = 0;
  constructor() {
    const subscription = this.service.client.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') {
        this.revision++;
        this.account.set(null);
        this.busy.set(false);
        this.error.set('Your session ended. Sign in again.');
      }
    }).data.subscription;
    inject(DestroyRef).onDestroy(() => { this.revision++; subscription.unsubscribe(); });
    void this.refresh();
  }
  async refresh(): Promise<void> {
    if (this.busy()) return;
    const revision = ++this.revision;
    this.busy.set(true);
    this.error.set('');
    this.account.set(null);
    try {
      const account = await this.service.load();
      if (revision === this.revision) this.account.set(account);
    } catch (error) {
      if (revision !== this.revision) return;
      let message = 'Unable to load your account. Retry shortly.';
      if (error instanceof HttpErrorResponse) {
        if (error.status === 401) message = 'Your session is invalid or expired. Sign in again.';
        if (error.status === 403) message = 'Your account is unavailable. Contact support.';
      } else if (error instanceof Error && error.message === 'Sign in to view your account.') {
        message = error.message;
      }
      this.error.set(message);
    } finally {
      if (revision === this.revision) this.busy.set(false);
    }
  }
}
