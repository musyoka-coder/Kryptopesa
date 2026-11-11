-- Existing project migration. This is not a fresh-database schema baseline.
-- Bound lock waits so a busy production table aborts the transaction safely.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- Remove raw PII access and future automatic grants from the reporting login.
REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM powerbi_reader;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE SELECT ON TABLES FROM powerbi_reader;
DROP POLICY IF EXISTS "powerbi_reader: read all" ON public.profiles;
DROP POLICY IF EXISTS "powerbi_reader: read all" ON public.wallets;
DROP POLICY IF EXISTS "powerbi_reader: read all" ON public.activity_log;
DROP POLICY IF EXISTS "powerbi_reader: read all" ON public.transactions;

CREATE SCHEMA IF NOT EXISTS reporting;
REVOKE ALL ON SCHEMA reporting FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA reporting TO powerbi_reader;
-- Deliberate owner-executed, aggregate-only boundary; never add identifiers here.
CREATE OR REPLACE VIEW reporting.account_status_counts
WITH (security_barrier = true, security_invoker = false) AS
SELECT account_status, count(*)::bigint AS account_count
FROM public.profiles GROUP BY account_status;
CREATE OR REPLACE VIEW reporting.kyc_status_counts
WITH (security_barrier = true, security_invoker = false) AS
SELECT kyc_status, count(*)::bigint AS account_count
FROM public.profiles GROUP BY kyc_status;
ALTER VIEW reporting.account_status_counts OWNER TO postgres;
ALTER VIEW reporting.kyc_status_counts OWNER TO postgres;
REVOKE ALL ON reporting.account_status_counts, reporting.kyc_status_counts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON reporting.account_status_counts, reporting.kyc_status_counts TO powerbi_reader;

CREATE INDEX IF NOT EXISTS activity_log_user_id_idx ON public.activity_log(user_id);
CREATE INDEX IF NOT EXISTS admin_actions_admin_id_idx ON public.admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS admin_approval_requests_approver_id_idx ON public.admin_approval_requests(approver_id);
CREATE INDEX IF NOT EXISTS admin_approval_requests_requester_id_idx ON public.admin_approval_requests(requester_id);
CREATE INDEX IF NOT EXISTS admin_audit_logs_actor_id_idx ON public.admin_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS kyc_notification_outbox_user_id_idx ON public.kyc_notification_outbox(user_id);
CREATE INDEX IF NOT EXISTS kyc_provider_events_case_id_idx ON public.kyc_provider_events(case_id);
CREATE INDEX IF NOT EXISTS payment_audit_log_payment_request_id_idx ON public.payment_audit_log(payment_request_id);

DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relkind IN ('r','p') AND has_table_privilege('powerbi_reader',c.oid,'SELECT')) THEN
   RAISE EXCEPTION 'Reporting still has raw table access';
 END IF;
 IF NOT has_table_privilege('powerbi_reader','reporting.account_status_counts','SELECT') THEN
   RAISE EXCEPTION 'Reporting aggregate unavailable';
 END IF;
END $$;
