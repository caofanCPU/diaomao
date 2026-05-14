-- diaomao schema init
-- Usage Scenarios:
-- 1. Supabase hosted PostgreSQL
-- 2. Prisma direct database connection
-- 3. Multiple projects sharing the same database, isolated by schema
--
-- Notes:
-- 1. Use diaomao_app for runtime connections; do NOT use postgres
-- 2. schema=diaomao is the default namespace only, NOT a security boundary
-- 3. Permission isolation relies on granting diaomao_app minimal privileges to the diaomao schema

-- Dangerous operation, keep commented; do NOT execute in shared environments by default
-- DROP SCHEMA IF EXISTS diaomao CASCADE;

-- Step 1: Create schema (safe to run repeatedly)
CREATE SCHEMA IF NOT EXISTS diaomao;

-- Step 2: Assign schema ownership to postgres
ALTER SCHEMA diaomao OWNER TO postgres;

-- Step 3: Revoke broad privileges from PUBLIC and Supabase shared roles
REVOKE ALL ON SCHEMA diaomao FROM PUBLIC;
REVOKE ALL ON SCHEMA diaomao FROM anon, authenticated, service_role;
REVOKE ALL ON ALL TABLES IN SCHEMA diaomao FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA diaomao FROM anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA diaomao FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA diaomao FROM anon, authenticated, service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA diaomao FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA diaomao FROM anon, authenticated, service_role;

-- Step 4: Create application role; set a strong password manually
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'diaomao_app'
  ) THEN
    CREATE ROLE diaomao_app
      LOGIN
      PASSWORD 'YOURS_PASSWORD';
  END IF;
END
$$;

-- Step 5: Grant database connection permission to the application role
GRANT CONNECT ON DATABASE postgres TO diaomao_app;

-- Step 6: Allow the application role to use the diaomao schema only (no CREATE privilege)
GRANT USAGE ON SCHEMA diaomao TO diaomao_app;

-- Step 7: Grant minimal required permissions for existing objects to diaomao_app
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA diaomao TO diaomao_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA diaomao TO diaomao_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA diaomao TO diaomao_app;

-- Step 8: Configure default privileges to auto-grant access for new objects created by postgres
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA diaomao
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA diaomao
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO diaomao_app;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA diaomao
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO diaomao_app;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA diaomao
  GRANT EXECUTE ON FUNCTIONS TO diaomao_app;