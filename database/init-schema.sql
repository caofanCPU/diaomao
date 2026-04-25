-- diaomao schema init
-- 适用场景：
-- 1. Supabase 托管 PostgreSQL
-- 2. Prisma 直连数据库
-- 3. 多工程共享同一个数据库，使用 schema 做隔离
--
-- 说明：
-- 1. 业务运行时请使用 diaomao_app 连接，不要使用 postgres
-- 2. schema=diaomao 只是默认命名空间，不是安全边界
-- 3. 权限隔离依赖 diaomao_app 只被授予 diaomao schema 的最小权限

-- 危险操作保留注释，默认不要在共享环境执行
-- DROP SCHEMA IF EXISTS diaomao CASCADE;

-- 第一步：创建 schema（重复执行安全）
CREATE SCHEMA IF NOT EXISTS diaomao;

-- 第二步：把 schema 所有权交给 postgres
ALTER SCHEMA diaomao OWNER TO postgres;

-- 第三步：回收 PUBLIC 和 Supabase 公共角色的宽权限
REVOKE ALL ON SCHEMA diaomao FROM PUBLIC;
REVOKE ALL ON SCHEMA diaomao FROM anon, authenticated, service_role;
REVOKE ALL ON ALL TABLES IN SCHEMA diaomao FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA diaomao FROM anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA diaomao FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA diaomao FROM anon, authenticated, service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA diaomao FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA diaomao FROM anon, authenticated, service_role;

-- 第四步：创建业务连接角色, 自行设置强密码
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

-- 第五步：允许业务角色连接数据库
GRANT CONNECT ON DATABASE postgres TO diaomao_app;

-- 第六步：只允许业务角色使用 diaomao schema，不授予 CREATE
GRANT USAGE ON SCHEMA diaomao TO diaomao_app;

-- 第七步：授予 diaomao_app 对现有对象的最小必需权限
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA diaomao TO diaomao_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA diaomao TO diaomao_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA diaomao TO diaomao_app;

-- 第八步：配置默认权限，确保后续由 postgres 创建的新对象自动授权给 diaomao_app
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA diaomao
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA diaomao
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO diaomao_app;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA diaomao
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO diaomao_app;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA diaomao
  GRANT EXECUTE ON FUNCTIONS TO diaomao_app;
