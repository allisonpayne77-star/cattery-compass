CREATE OR REPLACE FUNCTION public.admin_exec_sql(query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  EXECUTE query;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_exec_sql(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_exec_sql(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_exec_sql(text) TO authenticated;