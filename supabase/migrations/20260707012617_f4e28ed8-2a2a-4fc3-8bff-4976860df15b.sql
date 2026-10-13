REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

REVOKE ALL ON FUNCTION public.admin_exec_sql(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_exec_sql(text) FROM anon;
REVOKE ALL ON FUNCTION public.admin_exec_sql(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_exec_sql(text) TO service_role;