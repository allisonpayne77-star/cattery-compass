import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const runImportBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { sql: string }) => {
    if (!data || typeof data.sql !== "string") throw new Error("sql required");
    if (data.sql.length > 2_000_000) throw new Error("SQL batch too large");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { data: role, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleError) throw new Error(roleError.message);
    if (!role) throw new Error("Admin access required");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("admin_exec_sql", {
      query: data.sql,
      caller_user_id: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const getImportCounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tables = ["courses", "modules", "lessons", "quiz_questions", "survey_questions", "survey_responses"] as const;
    const counts: Record<string, number> = {};
    for (const t of tables) {
      const { count, error } = await context.supabase
        .from(t)
        .select("*", { count: "exact", head: true });
      if (error) throw new Error(`${t}: ${error.message}`);
      counts[t] = count ?? 0;
    }
    return counts;
  });

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { isAdmin: !!data };
  });
