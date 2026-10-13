import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/courses/")({
  ssr: false,
  component: CoursesIndexPage,
});

type CourseRow = {
  id: string;
  slug: string;
  title: string;
  price_cents: number | null;
  position: number | null;
};

type ModuleRow = { id: string; course_id: string; title: string; position: number };
type LessonRow = { id: string; module_id: string; position: number; kind: string | null };

function useCatalogue() {
  return useQuery({
    queryKey: ["public-catalogue"],
    queryFn: async () => {
      const courses = await (supabase as any)
        .from("courses")
        .select("id, slug, title, price_cents, position")
        .eq("is_published", true)
        .order("position", { ascending: true });
      if (courses.error) throw courses.error;

      const modules = await (supabase as any)
        .from("modules")
        .select("id, course_id, title, position")
        .order("position", { ascending: true });
      if (modules.error) throw modules.error;

      const lessons = await (supabase as any)
        .from("lesson_outline")
        .select("id, module_id, position, kind");
      if (lessons.error) throw lessons.error;

      return {
        courses: (courses.data ?? []) as CourseRow[],
        modules: (modules.data ?? []) as ModuleRow[],
        lessons: (lessons.data ?? []) as LessonRow[],
      };
    },
  });
}

function priceLabel(cents: number | null) {
  if (!cents || cents === 0) return "Free";
  return "$" + (cents / 100).toFixed(2) + " CAD";
}

function CoursesIndexPage() {
  const q = useCatalogue();

  if (q.isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <p className="text-[#5A5A5A]">Loading the course list…</p>
      </div>
    );
  }

  if (q.error || !q.data) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center px-6">
        <p className="text-[#5A5A5A] text-center">
          The course list could not be loaded right now. Please try again shortly.
        </p>
      </div>
    );
  }

  const { courses, modules, lessons } = q.data;

  const modulesByCourse = new Map<string, ModuleRow[]>();
  modules.forEach((m) => {
    const arr = modulesByCourse.get(m.course_id) ?? [];
    arr.push(m);
    modulesByCourse.set(m.course_id, arr);
  });
  modulesByCourse.forEach((arr) => arr.sort((a, b) => a.position - b.position));

  const lessonsByModule = new Map<string, LessonRow[]>();
  lessons.forEach((l) => {
    const arr = lessonsByModule.get(l.module_id) ?? [];
    arr.push(l);
    lessonsByModule.set(l.module_id, arr);
  });

  function counts(courseId: string) {
    const mods = modulesByCourse.get(courseId) ?? [];
    let lessonCount = 0;
    mods.forEach((m) => {
      (lessonsByModule.get(m.id) ?? []).forEach((l) => {
        if (l.position >= 99) return;
        if (l.kind !== "quiz") lessonCount += 1;
      });
    });
    return { modules: mods.length, lessons: lessonCount };
  }

  function CourseCard({ course, accent }: { course: CourseRow; accent: boolean }) {
    const n = counts(course.id);
    const mods = modulesByCourse.get(course.id) ?? [];
    return (
      <Link
        to="/courses/$slug"
        params={{ slug: course.slug }}
        className={
          accent
            ? "block rounded-lg border-2 border-[#C8102E] bg-white p-5 hover:bg-[#FBF3F4] transition-colors"
            : "block rounded-lg border border-[#E8E4DD] bg-white p-5 hover:border-[#C8102E] transition-colors"
        }
      >
        <div className="font-semibold leading-snug">{course.title}</div>
        <div className="mt-1.5 text-sm text-[#5A5A5A]">
          {n.modules} modules, {n.lessons} lessons
        </div>

        <ul className="mt-4 space-y-1.5 border-t border-[#E8E4DD] pt-4">
          {mods.map((m) => (
            <li key={m.id} className="text-sm text-[#5A5A5A] leading-relaxed">
              {m.title}
            </li>
          ))}
        </ul>

        <div
          className={
            accent
              ? "mt-4 text-sm font-semibold text-[#C8102E]"
              : "mt-4 text-sm font-semibold"
          }
        >
          {priceLabel(course.price_cents)}
        </div>
        <div className="mt-1 text-sm text-[#C8102E]">See every lesson</div>
      </Link>
    );
  }

  const free = courses.filter((c) => !c.price_cents);
  const paid = courses.filter((c) => !!c.price_cents);

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1A1A1A]">
      <header className="border-b border-[#E8E4DD]">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <span className="font-semibold">Cattery Manager</span>
          <Link to="/auth" className="text-sm text-[#C8102E] hover:text-[#8C0C21]">
            Sign in
          </Link>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 pt-16 pb-12">
        <img src="/catcollege-logo.png" alt="Cat College" className="mb-5 h-24 w-auto sm:h-32" />
<h1 className="text-4xl sm:text-5xl font-semibold leading-tight max-w-2xl">
          Cat College
        </h1>
        <p className="mt-5 text-lg text-[#5A5A5A] max-w-2xl leading-relaxed">
          Breeding courses written by a working breeder, for people who want to know what
          normal looks like at two in the morning. Every module and every lesson is listed
          here, so you can see exactly what you are getting before you pay for anything.
        </p>
        <p className="mt-6 text-sm text-[#5A5A5A]">
          Start with the two free courses. Nothing is held back in them.
        </p>
      </section>

      {free.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 pb-12">
          <h2 className="text-sm font-semibold mb-4">Free courses</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {free.map((c) => (
              <CourseCard key={c.id} course={c} accent />
            ))}
          </div>
        </section>
      )}

      <section className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="text-sm font-semibold mb-4">Paid courses</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {paid.map((c) => (
            <CourseCard key={c.id} course={c} accent={false} />
          ))}
        </div>

        <div className="mt-10 rounded-lg border border-[#E8E4DD] bg-white p-6">
          <div className="font-semibold">All paid courses together</div>
          <p className="mt-2 text-sm text-[#5A5A5A] leading-relaxed">
            Buy the whole catalogue for $149.99 CAD instead of course by course. The Cattery
            Manager app subscription is separate at $9.99 a month and includes the Foundations
            course.
          </p>
          <Link
            to="/auth"
            className="mt-4 inline-block rounded-md bg-[#C8102E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#8C0C21]"
          >
            Create an account to buy
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#E8E4DD]">
        <div className="max-w-5xl mx-auto px-6 py-8 text-sm text-[#5A5A5A]">
          Cattery Manager, Kingston, Ontario. Prices in Canadian dollars.
        </div>
      </footer>
    </div>
  );
}
