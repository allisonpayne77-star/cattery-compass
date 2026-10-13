import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AcademyCourse } from "@/lib/academy-data";

export type ProgressRow = {
  id: string;
  user_id: string;
  course_slug: string;
  module_slug: string;
  score: number;
  passed: boolean;
  completed_at: string | null;
};

export function useAcademyProgress() {
  return useQuery({
    queryKey: ["academy_progress"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("academy_progress")
        .select("*");
      if (error) throw error;
      return (data ?? []) as ProgressRow[];
    },
  });
}

export function modulePassed(rows: ProgressRow[] | undefined, courseSlug: string, moduleSlug: string) {
  return !!rows?.some(
    (r) => r.course_slug === courseSlug && r.module_slug === moduleSlug && r.passed,
  );
}

export function courseStats(rows: ProgressRow[] | undefined, course: AcademyCourse) {
  const total = course.modules.length;
  const completed = course.modules.filter((m) => modulePassed(rows, course.slug, m.slug)).length;
  return { total, completed, percent: total ? Math.round((completed / total) * 100) : 0 };
}

export function isModuleUnlocked(
  _rows: ProgressRow[] | undefined,
  _course: AcademyCourse,
  _moduleIdx: number,
) {
  // Modules are not gated — learners can browse any module in any order.
  // Completion is still tracked via `modulePassed` / `courseStats`.
  return true;
}


export async function saveProgress(opts: {
  userId: string;
  courseSlug: string;
  moduleSlug: string;
  score: number; // 0-100
  passed: boolean;
}) {
  const payload = {
    user_id: opts.userId,
    course_slug: opts.courseSlug,
    module_slug: opts.moduleSlug,
    score: opts.score,
    passed: opts.passed,
    completed_at: opts.passed ? new Date().toISOString() : null,
  };
  const { error } = await (supabase as any)
    .from("academy_progress")
    .upsert(payload, { onConflict: "user_id,course_slug,module_slug" });
  if (error) throw error;
}
