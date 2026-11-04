// Run only against a disposable LOCAL Supabase database with Phase 1 migrations applied.
// Requires: npm install --no-save pg@8.16.3
// Usage: TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres TEST_USER_ID=<UUID> node phase1_concurrency.mjs
// TEST_USER_ID must refer to an existing LOCAL test user with a profiles row. Never run on a shared or production database.
import { Client } from 'pg';
import { randomUUID } from 'node:crypto';

const url = process.env.TEST_DATABASE_URL;
const user = process.env.TEST_USER_ID;
if (!url || !user) throw new Error('TEST_DATABASE_URL and TEST_USER_ID required');
const parsed = new URL(url);
if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(parsed.hostname)) {
  throw new Error('CONCURRENCY TEST REFUSES NON-LOCAL DATABASE');
}
if (!/^[0-9a-f-]{36}$/i.test(user)) throw new Error('Invalid test user ID');

const admin = new Client({ connectionString: url });
await admin.connect();
async function privileged(id) {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query("select set_config('request.jwt.claim.role','service_role',true)");
    const result = await client.query('select public.request_withdrawal($1) as ok', [id]);
    await client.query('COMMIT');
    return { accepted: result.rows[0].ok };
  } catch (error) {
    await client.query('ROLLBACK');
    return { accepted: false, error: error.message };
  } finally {
    await client.end();
  }
}
try {
  const prior = await admin.query('select count(*)::int n from public.kes_accounts where user_id=$1', [user]);
  if (prior.rows[0].n !== 0) throw new Error('TEST_USER_ID must have no prior KES account');
  const tag = randomUUID();
  await admin.query("update public.profiles set kyc_status='verified' where id=$1", [user]);
  await admin.query('update public.payment_controls set payouts_enabled=true where singleton=true');
  const deposit = await admin.query(
    "insert into public.payment_requests(user_id,idempotency_key,kind,amount_kes,phone,status,checkout_request_id,mpesa_receipt_number) values($1,$2,'stk_deposit',100,'254712345678','confirmed',$3,$4) returning id",
    [user, tag + '-credit', tag + '-checkout', tag + '-receipt']
  );
  await admin.query('BEGIN');
  await admin.query("select set_config('request.jwt.claim.role','service_role',true)");
  await admin.query('select public.credit_wallet_from_payment($1)', [deposit.rows[0].id]);
  await admin.query('COMMIT');
  const ids = [];
  for (let i = 0; i < 2; i++) {
    const res = await admin.query(
      "insert into public.payment_requests(user_id,idempotency_key,kind,amount_kes,phone) values($1,$2,'b2c_withdrawal',70,'254712345678') returning id",
      [user, tag + '-withdraw-' + i]
    );
    ids.push(res.rows[0].id);
  }
  const results = await Promise.all(ids.map(privileged));
  const accepted = results.filter(x => x.accepted).length;
  const balance = await admin.query('select available_kes,reserved_kes from public.kes_accounts where user_id=$1', [user]);
  const ledger = await admin.query('select sum(available_delta) av,sum(reserved_delta) rv from public.kes_ledger_entries where user_id=$1', [user]);
  const actual = balance.rows[0], expected = ledger.rows[0];
  if (accepted !== 1 || Number(actual.available_kes) !== 30 || Number(actual.reserved_kes) !== 70 ||
      Number(expected.av) !== 30 || Number(expected.rv) !== 70) {
    throw new Error('FAIL: concurrency/balance invariants: ' + JSON.stringify({ results, actual, expected }));
  }
  console.log('PASS: two simultaneous 70-KES withdrawals from 100 KES; exactly one reserved');
  console.log('PASS: available=30 reserved=70; ledger sums equal balances');
} finally {
  await admin.query('update public.payment_controls set payouts_enabled=false where singleton=true').catch(()=>{});
  await admin.end();
}
