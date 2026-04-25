-- 第一步：彻底删除 diaomao schema（连里面的表、序列、权限全炸）
-- DROP SCHEMA IF EXISTS diaomao CASCADE;

-- 第二步：重新创建干净的 diaomao schema
CREATE SCHEMA diaomao;

-- 第三步：把所有权给 postgres（防止任何权限问题）
ALTER SCHEMA diaomao OWNER TO postgres;

REVOKE ALL ON SCHEMA diaomao FROM anon, authenticated, service_role;
REVOKE ALL ON ALL TABLES IN SCHEMA diaomao FROM anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA diaomao FROM anon, authenticated, service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA diaomao FROM anon, authenticated, service_role;

REVOKE ALL ON SCHEMA diaomao FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA diaomao FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA diaomao FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA diaomao FROM PUBLIC;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'diaomao_app'
  ) THEN
    CREATE ROLE diaomao_app
      LOGIN
      PASSWORD 'XXXdiaomao_app';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE postgres TO diaomao_app;
GRANT USAGE ON SCHEMA diaomao TO diaomao_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA diaomao TO diaomao_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA diaomao TO diaomao_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA diaomao TO diaomao_app;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA diaomao
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA diaomao
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO diaomao_app;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA diaomao
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO diaomao_app;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA diaomao
  GRANT EXECUTE ON FUNCTIONS TO diaomao_app;