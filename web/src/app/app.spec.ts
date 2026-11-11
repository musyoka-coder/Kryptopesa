import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AccountService, AUTH_CLIENT } from './account.service';
import { App } from './app';
import { vi } from 'vitest';

describe('Account API integration', () => {
  const auth = { auth: { getSession: vi.fn(), onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })) } };
  beforeEach(() => {
    auth.auth.getSession.mockResolvedValue({data:{session:{access_token:'test-token'}}});
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), {provide:AUTH_CLIENT,useValue:auth}] });
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('sends a token only to the same-origin account endpoint', async () => {
    const result = TestBed.inject(AccountService).load();
    await Promise.resolve();
    const request = TestBed.inject(HttpTestingController).expectOne('/api/account');
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
    request.flush({username:'Owner',account_status:'active',kyc_status:'pending'});
    expect((await result).username).toBe('Owner');
  });
  it('makes no API call without a session', async () => {
    auth.auth.getSession.mockResolvedValue({data:{session:null}});
    await expect(TestBed.inject(AccountService).load()).rejects.toThrow('Sign in');
    TestBed.inject(HttpTestingController).expectNone('/api/account');
  });
  it('rejects malformed successful responses', async () => {
    const pending = TestBed.inject(AccountService).load();
    const assertion = expect(pending).rejects.toThrow('Account unavailable');
    await Promise.resolve();
    TestBed.inject(HttpTestingController).expectOne('/api/account').flush({account_status:'suspended'});
    await assertion;
  });
  it('shows an expired-session message without stale account data', async () => {
    const fixture = TestBed.createComponent(App);
    await Promise.resolve();
    TestBed.inject(HttpTestingController).expectOne('/api/account').flush({error:'unauthorized'},{status:401,statusText:'Unauthorized'});
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('invalid or expired');
    expect(fixture.componentInstance.account()).toBeNull();
  });
});
