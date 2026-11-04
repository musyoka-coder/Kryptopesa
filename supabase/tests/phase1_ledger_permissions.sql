-- KryptoPesa phase 1: production-safe read-only checks.
-- No real payment data is created by this script.
select
  (select deposits_enabled from public.payment_controls where singleton) as deposits_enabled,
  (select payouts_enabled from public.payment_controls where singleton) as payouts_enabled,
  has_table_privilege('authenticated','public.kes_accounts','UPDATE') as client_can_update_balance,
  has_table_privilege('authenticated','public.kes_ledger_entries','INSERT') as client_can_write_ledger,
  has_table_privilege('authenticated','public.payment_requests','INSERT') as client_can_write_payment,
  has_function_privilege('authenticated','public.credit_wallet_from_payment(uuid)','EXECUTE') as client_can_credit,
  has_function_privilege('authenticated','public.settle_withdrawal(uuid,text)','EXECUTE') as client_can_settle,
  has_function_privilege('authenticated','public.refund_failed_withdrawal(uuid)','EXECUTE') as client_can_refund,
  (select count(*) from pg_trigger where tgrelid='public.kes_ledger_entries'::regclass and tgname='kes_ledger_no_mutation' and not tgisinternal) as immutable_triggers;
