-- Synthetic non-user claims; no existing account is impersonated.
-- All operations are rolled back. Any unexpected permission aborts the test.
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}';
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.profiles) THEN RAISE EXCEPTION 'Non-user can read profiles'; END IF;
 IF EXISTS (SELECT 1 FROM public.kyc_verification_cases) THEN RAISE EXCEPTION 'Non-user can read KYC cases'; END IF;
 BEGIN
  PERFORM public.admin_users();
  RAISE EXCEPTION 'Non-admin can list users';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  PERFORM public.admin_set_account_status('00000000-0000-0000-0000-000000000002'::uuid,'active');
  RAISE EXCEPTION 'Non-admin can change accounts';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  PERFORM public.admin_set_kyc_status('00000000-0000-0000-0000-000000000002'::uuid,'verified','authorization regression test');
  RAISE EXCEPTION 'Non-admin can change KYC';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
ROLLBACK;
