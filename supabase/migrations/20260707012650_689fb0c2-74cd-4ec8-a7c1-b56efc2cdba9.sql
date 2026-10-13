DROP FUNCTION IF EXISTS public.admin_exec_sql(text);

CREATE OR REPLACE FUNCTION public.admin_exec_sql(query text, caller_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF caller_user_id IS NULL OR NOT public.has_role(caller_user_id, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  EXECUTE query;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_exec_sql(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_exec_sql(text, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.admin_exec_sql(text, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_exec_sql(text, uuid) TO service_role;