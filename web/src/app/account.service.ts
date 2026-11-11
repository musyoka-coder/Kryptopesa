import { inject, Injectable, InjectionToken } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';

export interface Account { username: string; account_status: 'active'; kyc_status: string; }
export interface AuthClient {
  auth: {
    getSession(): Promise<{ data: { session: { access_token: string } | null }; error?: unknown }>;
    onAuthStateChange(callback: (event: string) => void): { data: { subscription: { unsubscribe(): void } } };
  };
}
export const AUTH_CLIENT = new InjectionToken<AuthClient>('Supabase browser client', {
  providedIn: 'root',
  factory: () => {
    const client = (window as unknown as { supabaseClient?: AuthClient }).supabaseClient;
    if (!client) throw new Error('Account service configuration is unavailable.');
    return client;
  },
});
@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly http = inject(HttpClient);
  readonly client = inject(AUTH_CLIENT);
  async load(): Promise<Account> {
    const result = await this.client.auth.getSession();
    const token = result.data?.session?.access_token;
    if (result.error || !token) throw new Error('Sign in to view your account.');
    const value = await firstValueFrom(this.http.get<unknown>('/api/account', {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
    }).pipe(timeout(12000)));
    if (!value || typeof value !== 'object') throw new Error('Invalid account response.');
    const account = value as Record<string, unknown>;
    if (account['account_status'] !== 'active' || typeof account['username'] !== 'string' || typeof account['kyc_status'] !== 'string') {
      throw new Error('Account unavailable.');
    }
    return account as unknown as Account;
  }
}
