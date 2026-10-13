import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const PASS_THRESHOLD = 0.8;

export type QuizQuestion =
  | { type?: "single"; q: string; choices: string[]; answer: number; explanation?: string | null }
  | { type: "multi"; q: string; choices: string[]; answers: number[]; explanation?: string | null }
  | { type: "fill"; q: string; accept: string[]; caseSensitive?: boolean; explanation?: string | null };

export type AcademyLesson = {
  id: string;
  title: string;
  kind: string;
  position: number;
  body: string | null;
  videoUrl: string | null;
  contentBlocks: unknown;
  durationMinutes: number | null;
  passThresholdPct: number;
  quiz: QuizQuestion[];
};

export type AcademyModule = {
  id: string;
  slug: string;
  title: string;
  blurb: string;
  position: number;
  lessons: AcademyLesson[];
  quiz: QuizQuestion[];
};

export type AcademyCourse = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string;
  position: number;
  priceCents: number;
  modules: AcademyModule[];
};

const COURSE_SELECT = `
  id,
  slug,
  title,
  subtitle,
  description,
  position,
  price_cents,
  is_published,
  modules (
    id,
    title,
    description,
    position,
    lessons (
      id,
      title,
      kind,
      video_url,
      body,
      content_blocks,
      duration_minutes,
      pass_threshold_pct,
      position,
      quiz_questions (
        id,
        prompt,
        choices,
        correct_index,
        explanation,
        position
      )
    )
  )
`;

export function useAcademyCourses() {
  return useQuery({
    queryKey: ["academy-courses"],
    queryFn: fetchAcademyCourses,
  });
}

export function useAcademyCourse(courseSlug: string) {
  return useQuery({
    queryKey: ["academy-course", courseSlug],
    queryFn: async () => {
      const courses = await fetchAcademyCourses();
      return courses.find((course) => course.slug === courseSlug) ?? null;
    },
  });
}

async function fetchAcademyCourses(): Promise<AcademyCourse[]> {
  const { data, error } = await (supabase as any)
    .from("courses")
    .select(COURSE_SELECT)
    .eq("is_published", true)
    .order("position", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as unknown[]).map(normalizeCourse).sort(byPosition);
}

function normalizeCourse(rawValue: unknown): AcademyCourse {
  const raw = asRecord(rawValue);
  const modules = asArray(raw.modules).map(normalizeModule).sort(byPosition);
  return {
    id: asString(raw.id),
    slug: asString(raw.slug),
    title: asString(raw.title),
    subtitle: nullableString(raw.subtitle),
    description: nullableString(raw.description) ?? "",
    position: asNumber(raw.position),
    priceCents: asNumber(raw.price_cents, 0),
    modules,
  };
}

function normalizeModule(rawValue: unknown): AcademyModule {
  const raw = asRecord(rawValue);
  const lessons = asArray(raw.lessons).map(normalizeLesson).sort(byPosition);
  const quiz = lessons.flatMap((lesson) => lesson.quiz);
  const id = asString(raw.id);
  return {
    id,
    slug: id,
    title: asString(raw.title),
    blurb: nullableString(raw.description) ?? "",
    position: asNumber(raw.position),
    lessons,
    quiz,
  };
}

function normalizeLesson(rawValue: unknown): AcademyLesson {
  const raw = asRecord(rawValue);
  const quiz = asArray(raw.quiz_questions).map(normalizeQuizQuestion).sort(byPosition);
  return {
    id: asString(raw.id),
    title: asString(raw.title),
    kind: asString(raw.kind),
    position: asNumber(raw.position),
    body: nullableString(raw.body),
    videoUrl: nullableString(raw.video_url),
    contentBlocks: raw.content_blocks,
    durationMinutes: nullableNumber(raw.duration_minutes),
    passThresholdPct: asNumber(raw.pass_threshold_pct, 80),
    quiz,
  };
}

function normalizeQuizQuestion(rawValue: unknown): QuizQuestion & { position: number } {
  const raw = asRecord(rawValue);
  const choices = asStringArray(raw.choices);
  const correctIndex = asNumber(raw.correct_index, -1);
  const base = {
    q: asString(raw.prompt),
    explanation: nullableString(raw.explanation),
    position: asNumber(raw.position),
  };

  if (correctIndex >= 0 && choices.length > 0) {
    return { ...base, choices, answer: correctIndex };
  }

  return { ...base, type: "fill", accept: choices.length ? choices : [asString(raw.prompt)] };
}

function byPosition(a: { position: number }, b: { position: number }) {
  return a.position - b.position;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function nullableString(value: unknown): string | null {
  if (value == null) return null;
  const text = asString(value);
  return text.length ? text : null;
}

function asNumber(value: unknown, fallback = 0): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function nullableNumber(value: unknown): number | null {
  if (value == null) return null;
  const number = asNumber(value, Number.NaN);
  return Number.isFinite(number) ? number : null;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(asString).filter(Boolean);
  const record = asRecord(value);
  if (Array.isArray(record.choices)) return record.choices.map(asString).filter(Boolean);
  if (Array.isArray(record.accept)) return record.accept.map(asString).filter(Boolean);
  return [];
}