import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/courses/$slug")({
  ssr: false,
  component: CourseSalesPage,
});

type CourseRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  price_cents: number | null;
};

type ModuleRow = { id: string; course_id: string; title: string; position: number };
type LessonRow = { id: string; module_id: string; title: string; position: number; kind: string | null };

function useCourseOutline(slug: string) {
  return useQuery({
    queryKey: ["public-course", slug],
    queryFn: async () => {
      const courseRes = await (supabase as any)
        .from("courses")
        .select("id, slug, title, subtitle, description, price_cents")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      if (courseRes.error) throw courseRes.error;
      const course = courseRes.data as CourseRow | null;
      if (!course) return null;

      const modRes = await (supabase as any)
        .from("modules")
        .select("id, course_id, title, position")
        .eq("course_id", course.id)
        .order("position", { ascending: true });
      if (modRes.error) throw modRes.error;
      const mods = (modRes.data ?? []) as ModuleRow[];

      const ids = mods.map((m) => m.id);
      let lessons: LessonRow[] = [];
      if (ids.length > 0) {
        const lesRes = await (supabase as any)
          .from("lesson_outline")
          .select("id, module_id, title, position, kind")
          .in("module_id", ids)
          .order("position", { ascending: true });
        if (lesRes.error) throw lesRes.error;
        lessons = (lesRes.data ?? []) as LessonRow[];
      }

      return { course, mods, lessons };
    },
  });
}

function priceLabel(cents: number | null) {
  if (!cents || cents === 0) return "Free";
  return "$" + (cents / 100).toFixed(2) + " CAD";
}

function CourseSalesPage() {
  const { slug } = Route.useParams();
  const q = useCourseOutline(slug);

  if (q.isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <p className="text-[#5A5A5A]">Loading the course outline…</p>
      </div>
    );
  }

  if (q.error || !q.data) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-[#5A5A5A]">That course is not available.</p>
        <Link to="/courses" className="text-[#C8102E] hover:text-[#8C0C21]">
          See all courses
        </Link>
      </div>
    );
  }

  const { course, mods, lessons } = q.data;

  const byModule = new Map<string, LessonRow[]>();
  lessons.forEach((l) => {
    const arr = byModule.get(l.module_id) ?? [];
    arr.push(l);
    byModule.set(l.module_id, arr);
  });

  let lessonTotal = 0;
  let quizTotal = 0;
  lessons.forEach((l) => {
    if (l.position >= 99) return;
    if (l.kind === "quiz") quizTotal += 1;
    else lessonTotal += 1;
  });

  const isFree = !course.price_cents;

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1A1A1A]">
      <header className="border-b border-[#E8E4DD]">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/courses" className="font-semibold">
            Cat College
          </Link>
          <Link to="/auth" className="text-sm text-[#C8102E] hover:text-[#8C0C21]">
            Sign in
          </Link>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-6 pt-14 pb-10">
        <h1 className="text-3xl sm:text-4xl font-semibold leading-tight">{course.title}</h1>
        {course.subtitle && (
          <p className="mt-3 text-lg font-semibold leading-relaxed">{course.subtitle}</p>
        )}

        {course.description && (
          <p className="mt-6 leading-relaxed">{course.description}</p>
        )}

        <p className="mt-6 text-sm text-[#5A5A5A]">
          {mods.length} modules, {lessonTotal} lessons, {quizTotal} quizzes.
        </p>

        <div className="mt-8 rounded-lg border-2 border-[#C8102E] bg-white p-6">
          <div className="text-2xl font-semibold">{priceLabel(course.price_cents)}</div>
          <p className="mt-2 text-sm text-[#5A5A5A] leading-relaxed">
            {isFree
              ? "Free to anyone with an account. Create one and start reading."
              : "One payment, permanent access. Or take every paid course for $149.99 CAD."}
          </p>
          <Link
            to="/auth"
            className="mt-4 inline-block rounded-md bg-[#C8102E] px-6 py-3 text-sm font-semibold text-white hover:bg-[#8C0C21]"
          >
            {isFree ? "Create an account to start" : "Create an account to buy"}
          </Link>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-20">
        <h2 className="text-sm font-semibold mb-5">What is covered</h2>

        <div className="space-y-6">
          {mods.map((m, i) => {
            const items = (byModule.get(m.id) ?? []).filter(
              (l) => l.position < 99 && l.kind !== "quiz",
            );
            const hasQuiz = (byModule.get(m.id) ?? []).some((l) => l.kind === "quiz");
            return (
              <div key={m.id} className="rounded-lg border border-[#E8E4DD] bg-white p-5">
                <div className="font-semibold leading-snug">
                  {i + 1}. {m.title}
                </div>
                <ul className="mt-3 space-y-1.5">
                  {items.map((l) => (
                    <li key={l.id} className="text-sm text-[#5A5A5A] leading-relaxed">
                      {l.title}
                    </li>
                  ))}
                </ul>
                {hasQuiz && (
                  <div className="mt-3 text-sm text-[#5A5A5A]">Ends with a quiz.</div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-10">
          <Link to="/courses" className="text-sm text-[#C8102E] hover:text-[#8C0C21]">
            See all courses
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#E8E4DD]">
        <div className="max-w-3xl mx-auto px-6 py-8 text-sm text-[#5A5A5A]">
          Cattery Manager, Kingston, Ontario. Prices in Canadian dollars.
        </div>
      </footer>
    </div>
  );
}
