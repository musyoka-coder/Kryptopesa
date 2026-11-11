-- Read-only regression checks; run after the reporting migration.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relkind IN ('r','p') AND has_table_privilege('powerbi_reader',c.oid,'SELECT')) THEN
   RAISE EXCEPTION 'Reporting can read a raw public table';
 END IF;
 IF has_schema_privilege('authenticated','reporting','USAGE') OR has_schema_privilege('anon','reporting','USAGE') THEN
   RAISE EXCEPTION 'Reporting is exposed to browser roles';
 END IF;
 IF NOT has_table_privilege('powerbi_reader','reporting.account_status_counts','SELECT') OR
    NOT has_table_privilege('powerbi_reader','reporting.kyc_status_counts','SELECT') THEN
   RAISE EXCEPTION 'Expected aggregate grants missing';
 END IF;
END $$;
