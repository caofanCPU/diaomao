-- 第一步：彻底删除 diaomao schema（连里面的表、序列、权限全炸）
-- DROP SCHEMA IF EXISTS diaomao CASCADE;

-- 第二步：重新创建干净的 diaomao schema
CREATE SCHEMA diaomao;

-- 第三步：把所有权给 postgres（防止任何权限问题）
ALTER SCHEMA diaomao OWNER TO postgres;

-- 第四步：给常用角色全开权限（本地开发保险起见）
GRANT ALL ON SCHEMA diaomao TO postgres;
GRANT ALL ON SCHEMA diaomao TO anon;
GRANT ALL ON SCHEMA diaomao TO authenticated;
GRANT ALL ON SCHEMA diaomao TO service_role;

-- 第五步：以后在这个 schema 里建的表默认关闭 RLS（本地开发神器）
ALTER DEFAULT PRIVILEGES IN SCHEMA diaomao REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA diaomao GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA diaomao GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;