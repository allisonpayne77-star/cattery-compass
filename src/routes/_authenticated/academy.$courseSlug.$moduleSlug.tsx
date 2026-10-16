import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  RotateCw,
  BookOpen,
  ClipboardCheck,
  Lock,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CoursePaywall, useCoursePurchases, useIsAdmin } from "@/components/CoursePaywall";
import { CourseBridge } from "@/components/CourseBridge";
import { useAcademyCourse, type AcademyLesson, type QuizQuestion, PASS_THRESHOLD } from "@/lib/academy-data";
import {
  useAcademyProgress,
  saveProgress,
  modulePassed,
  isModuleUnlocked,
} from "@/lib/academy-progress";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/academy/$courseSlug/$moduleSlug")({
  head: () => ({ meta: [{ title: "Module — Cat College" }] }),
  notFoundComponent: () => (
    <div className="max-w-xl mx-auto text-center py-16">
      <p className="text-muted-foreground mb-4">Module not found.</p>
      <Button asChild>
        <Link to="/academy">Back to Academy</Link>
      </Button>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="max-w-xl mx-auto text-center py-16">
      <p className="text-destructive mb-4">{error.message}</p>
    </div>
  ),
  component: ModulePage,
});

function ModulePage() {
  const { courseSlug, moduleSlug } = Route.useParams();
  const courseQuery = useAcademyCourse(courseSlug);
  const purchases = useCoursePurchases();
  const isAdmin = useIsAdmin();
  const progress = useAcademyProgress();
  const rows = progress.data;
  const { user } = useAuth();
  const qcm = useQueryClient();

  if (courseQuery.isLoading) {
    return <div className="max-w-xl mx-auto py-16 text-center text-muted-foreground">Loading module…</div>;
  }

  const course = courseQuery.data;
  const index = course?.modules.findIndex((mod) => mod.slug === moduleSlug) ?? -1;
  const module = index >= 0 ? course?.modules[index] : undefined;

  // Admins can read every course in the database, so they are never paywalled.
  const ownedC =
    isAdmin.data === true ||
    (purchases.data ?? []).some((x) => x.is_bundle || x.course_id === course?.id);
  if (course && course.priceCents > 0 && !ownedC && !isAdmin.isLoading) {
    return <div className="max-w-3xl mx-auto py-10"><CoursePaywall course={course} /></div>;
  }

  if (!course || !module) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 space-y-4">
        <p className="text-muted-foreground">This module is not in the uploaded Academy data.</p>
        <Button asChild>
          <Link to="/academy">Back to Academy</Link>
        </Button>
      </div>
    );
  }

  const unlocked = isModuleUnlocked(rows, course, index);
  const passed = modulePassed(rows, course.slug, module.slug);

  if (!unlocked) {
    const prev = course.modules[index - 1];
    return (
      <div className="max-w-xl mx-auto text-center py-16 space-y-4">
        <Lock className="h-10 w-10 text-muted-foreground mx-auto" />
        <h2 className="font-display text-2xl font-semibold">Module locked</h2>
        <p className="text-muted-foreground">
          You need to pass the{" "}
          <span className="font-medium text-foreground">
            Module {index} quiz — {prev.title}
          </span>{" "}
          with a score of 80% or higher to unlock{" "}
          <span className="font-medium text-foreground">{module.title}</span>.
        </p>
        <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
          <Button asChild>
            <Link
              to="/academy/$courseSlug/$moduleSlug"
              params={{ courseSlug: course.slug, moduleSlug: prev.slug }}
            >
              Go to {prev.title} <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/academy/$courseSlug" params={{ courseSlug: course.slug }}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to course
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const nextMod = course.modules[index + 1];

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/academy/$courseSlug" params={{ courseSlug: course.slug }}>
          <ArrowLeft className="h-4 w-4 mr-1" /> {course.title}
        </Link>
      </Button>

      <header className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline">Module {index + 1} of {course.modules.length}</Badge>
          {passed && (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3 w-3" /> Passed
            </Badge>
          )}
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="space-y-2">
            <h1 className="font-display text-2xl sm:text-3xl font-semibold">{module.title}</h1>
            {module.blurb ? <p className="text-muted-foreground">{module.blurb}</p> : null}
          </div>
        </div>
      </header>

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <BookOpen className="h-4 w-4" />
          <span>Lessons</span>
        </div>
        <div className="space-y-4">
          {module.lessons.map((lesson) => (
            <LessonCard key={lesson.id} lesson={lesson} />
          ))}
        </div>
      </section>


      {module.quiz.length > 0 && (
        <section id="module-quiz" className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ClipboardCheck className="h-4 w-4" />
            <span>Module quiz</span>
          </div>
          <Quiz
            key={module.id}
            questions={module.quiz}
            alreadyPassed={passed}
            onPass={async (score) => {
              if (nextMod) {
                toast.success(`Passed with ${score}%. Next module unlocked.`);
              } else {
                toast.success(`Passed with ${score}%. Course complete!`);
              }
            }}
            course={course}
            module={module}
          />
        </section>
      )}

      {module.quiz.length === 0 && !passed && (<Card className="p-4 flex items-center justify-between"><div><p className="font-medium">Finished this module?</p><p className="text-xs text-muted-foreground">Mark it complete to carry on.</p></div><Button size="sm" onClick={async () => { if (!user) return; await saveProgress({ userId: user.id, courseSlug: course.slug, moduleSlug: module.slug, score: 100, passed: true }); await qcm.invalidateQueries({ queryKey: ["academy_progress"] }); toast.success("Module complete."); }}>Mark complete</Button></Card>)}
      <CourseBridge courseSlug={course.slug} moduleSlug={module.slug} />
      {passed && nextMod && (
        <Card className="p-4 flex items-center justify-between bg-primary/5 border-primary/20">
          <div>
            <p className="text-xs text-muted-foreground">Up next</p>
            <p className="font-medium">{nextMod.title}</p>
          </div>
          <Button asChild size="sm">
            <Link
              to="/academy/$courseSlug/$moduleSlug"
              params={{ courseSlug: course.slug, moduleSlug: nextMod.slug }}
            >
              Continue <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </Card>
      )}

      {passed && !nextMod && (
        <Card className="p-4 flex items-center justify-between bg-primary/5 border-primary/20">
          <div>
            <p className="text-xs text-muted-foreground">Course complete!</p>
            <p className="font-medium">Get your certificate</p>
          </div>
          <Button asChild size="sm">
            <Link
              to="/academy/$courseSlug/certificate"
              params={{ courseSlug: course.slug }}
            >
              View certificate <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </Card>
      )}
    </div>
  );
}

function LessonCard({ lesson }: { lesson: AcademyLesson }) {
  const videoUrl = useCourseMediaUrl(lesson.videoUrl);

  return (
    <Card className="overflow-hidden">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold border-b-2 border-[#C8102E] pb-2 mb-2 mt-6">{lesson.title}</h2>
          {lesson.durationMinutes ? (
            <Badge variant="outline">{lesson.durationMinutes} min</Badge>
          ) : null}
        </div>
        {videoUrl ? (
          <video
            src={videoUrl}
            controls
            playsInline
            className="w-full rounded-lg border bg-black aspect-video"
          />
        ) : null}
        {lesson.body ? (
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {lesson.body}
          </div>
        ) : null}
        <ContentBlocks blocks={lesson.contentBlocks} />
        {lesson.kind !== "quiz" && lesson.kind !== "survey" && !videoUrl && !lesson.body && !getBlockItems(lesson.contentBlocks).length ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            This lesson has no content yet. The video, slides, and notes for
            <span className="font-medium text-foreground"> {lesson.title}</span> haven't
            been uploaded. An admin can add it from Admin → Import Course Data.
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function renderInline(t: string) { return t.replace(/^#{1,6}\s*(.+)$/gm, "**$1**").replace(/#{1,6}[ \t]+([^\n]+)/g, "\n**$1**\n").replace(/\s+-\s+/g, "\n• ").replace(/\s+(\d+)\.\s+/g, "\n$1. ").split(/\*\*(.+?)\*\*/g).map((s, i) => (i % 2 ? <strong key={i}>{s}</strong> : <span key={i}>{s}</span>)); }
function ContentBlocks({ blocks }: { blocks: unknown }) {
  const items = getBlockItems(blocks);
  if (!items.length) return null;

  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <ContentBlock key={idx} item={item} idx={idx} />
      ))}
    </div>
  );
}

function ContentBlock({ item, idx = 0 }: { item: unknown; idx?: number }) {
  const { courseSlug: cSlug } = Route.useParams();
  if (typeof item === "string") {
    return <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{item}</p>;
  }

  if (!item || typeof item !== "object") return null;
  const block = item as Record<string, unknown>;
  const type = typeof block.type === "string" ? block.type : "";
  const title = typeof block.title === "string" ? block.title : typeof block.heading === "string" ? block.heading : "";
  const text = typeof block.text === "string" ? block.text : typeof block.body === "string" ? block.body : typeof block.content === "string" ? block.content : typeof block.value === "string" ? block.value : "";
  const media = typeof block.media === "object" && block.media ? (block.media as Record<string, unknown>) : {};
  const image = typeof block.image === "object" && block.image ? (block.image as Record<string, unknown>) : {};
  const video = typeof block.video === "object" && block.video ? (block.video as Record<string, unknown>) : {};
  const src = firstString(
    block.src,
    block.url,
    block.path,
    block.file,
    media.src,
    media.url,
    media.path,
    image.src,
    image.url,
    image.path,
    video.src,
    video.url,
    video.path,
  );
  const alt = typeof block.alt === "string" ? block.alt : title || "Course media";

  if (type.includes("image") || (src && /\.(png|jpe?g|webp|gif)$/i.test(src))) {
    return <SignedImage source={src} alt={alt} />;
  }

  if (type.includes("video") || type.includes("audio") || (src && /\.(mp4|webm|mov|m4a|mp3|wav|aac|ogg)$/i.test(src))) {
    return <SignedVideo source={src} />;
  }

  return (
    <div className={title && (cSlug === "cat-breeding" ? /note from|real.?world|action/i.test(title) : /note from|problem|^why|what to do|real.?world|action|talking about/i.test(title)) ? `space-y-1.5 rounded-lg border-l-4 px-4 py-3 ${/note from/i.test(title) ? "border-l-[#C8102E] bg-[#FBF3F4]" : /problem/i.test(title) ? "border-l-[#C8102E] bg-[#FBF3F4]" : /^why/i.test(title) ? "border-l-[#5A5A5A] bg-[#F5F4F2]" : /what to do/i.test(title) ? "border-l-[#2E7D4F] bg-[#F1F7F3]" : /real.?world/i.test(title) ? "border-l-[#C9791A] bg-[#FBF6EE]" : /action/i.test(title) ? "border-l-[#1A1A1A] bg-[#F4F2EF]" : /talking about/i.test(title) ? "border-l-[#5A5A5A] bg-[#F5F4F2]" : "border-l-[#E8E4DD] bg-[#FAF7F2]"}` : "space-y-2"}>
      {title ? <h3 className="font-display text-base font-semibold">{title}</h3> : null}
      {text ? <p className={`whitespace-pre-wrap leading-relaxed ${/note from/i.test(title) ? "text-lg text-foreground [font-family:var(--font-hand)]" : "text-sm text-muted-foreground"}`}>{renderInline(text)}</p> : null}
    </div>
  );
}

function getBlockItems(blocks: unknown): unknown[] {
  if (Array.isArray(blocks)) return blocks;
  if (!blocks || typeof blocks !== "object") return [];
  const record = blocks as Record<string, unknown>;
  for (const key of ["blocks", "content", "sections", "items"] as const) {
    if (Array.isArray(record[key])) return record[key];
  }
  return [];
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

function SignedImage({ source, alt }: { source: string; alt: string }) {
  const mediaUrl = useCourseMediaUrl(source);
  return mediaUrl ? <img src={mediaUrl} alt={alt} className="w-full rounded-lg border" loading="lazy" /> : null;
}

function SignedVideo({ source }: { source: string }) {
  const mediaUrl = useCourseMediaUrl(source);
  return mediaUrl ? (/\.(m4a|mp3|wav|aac|ogg)$/i.test(source) ? <div className="rounded-lg border-2 border-[#C8102E] bg-[#FAF7F2] p-6 text-center"><img src="/catcollege-logo.png" alt="Cat College" className="mx-auto h-20 w-auto" /><p className="mt-3 text-base font-medium text-[#1A1A1A]">Press play to listen to this lesson</p><audio src={mediaUrl} controls preload="none" className="mt-4 w-full" /></div> : <video src={mediaUrl} controls playsInline className="w-full rounded-lg border bg-black aspect-video" />) : null;
}

function useCourseMediaUrl(source: string | null | undefined) {
  const path = source?.trim() ?? "";
  const isDirectUrl = /^(https?:|data:|blob:)/i.test(path);
  const query = useQuery({
    queryKey: ["course-media-url", path],
    enabled: !!path && !isDirectUrl,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const storagePath = path.replace(/^\/+/, "").replace(/^course-media\//, "");
      const { data, error } = await supabase.storage
        .from("course-media")
        .createSignedUrl(storagePath, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });

  if (!path) return null;
  return isDirectUrl ? path : query.data ?? null;
}

type Answer =
  | { kind: "single"; choice: number | null }
  | { kind: "multi"; choices: Set<number> }
  | { kind: "fill"; text: string };

function initialAnswer(q: QuizQuestion): Answer {
  const type = q.type ?? "single";
  if (type === "multi") return { kind: "multi", choices: new Set() };
  if (type === "fill") return { kind: "fill", text: "" };
  return { kind: "single", choice: null };
}

function isAnswered(a: Answer): boolean {
  if (a.kind === "single") return a.choice !== null;
  if (a.kind === "multi") return a.choices.size > 0;
  return a.text.trim().length > 0;
}

function isCorrect(q: QuizQuestion, a: Answer): boolean {
  if (!q || !a) return false;
  const type = q.type ?? "single";
  if (type === "single" && a.kind === "single") {
    return a.choice === (q as { answer: number }).answer;
  }
  if (type === "multi" && a.kind === "multi") {
    const expected = (q as { answers: number[] }).answers;
    if (a.choices.size !== expected.length) return false;
    return expected.every((i) => a.choices.has(i));
  }
  if (type === "fill" && a.kind === "fill") {
    const fq = q as { accept: string[]; caseSensitive?: boolean };
    const norm = (s: string) =>
      fq.caseSensitive ? s.trim() : s.trim().toLowerCase();
    const given = norm(a.text);
    return fq.accept.some((v) => norm(v) === given);
  }
  return false;
}

function Quiz({
  questions,
  alreadyPassed,
  onPass,
  course,
  module,
}: {
  questions: QuizQuestion[];
  alreadyPassed: boolean;
  onPass: (score: number) => void;
  course: { slug: string };
  module: { slug: string };
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [order, setOrder] = useState(() => shuffle(questions.length));
  const [answers, setAnswers] = useState<Record<number, Answer>>(() =>
    Object.fromEntries(order.map((qi, idx) => [idx, initialAnswer(questions[qi])])),
  );
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const shuffled = useMemo(() => order.map((i) => questions[i]), [order, questions]);

  const result = useMemo(() => {
    let correct = 0;
    shuffled.forEach((q, idx) => {
      if (isCorrect(q, answers[idx])) correct++;
    });
    const score = Math.round((correct / shuffled.length) * 100);
    return { correct, score, passed: score >= PASS_THRESHOLD * 100 };
  }, [shuffled, answers]);

  async function submit() {
    const allAnswered = shuffled.every((_, idx) => isAnswered(answers[idx]));
    if (!allAnswered) {
      toast.error("Answer every question first.");
      return;
    }
    setSubmitted(true);
    if (!user) return;
    setSaving(true);
    try {
      await saveProgress({
        userId: user.id,
        courseSlug: course.slug,
        moduleSlug: module.slug,
        score: result.score,
        passed: result.passed,
      });
      await qc.invalidateQueries({ queryKey: ["academy_progress"] });
      if (result.passed) onPass(result.score);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save progress";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  function retake() {
    const next = shuffle(questions.length);
    setOrder(next);
    setAnswers(
      Object.fromEntries(next.map((qi, idx) => [idx, initialAnswer(questions[qi])])),
    );
    setSubmitted(false);
  }

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">Module quiz</h3>
          <p className="text-sm text-muted-foreground">
            {questions.length} questions · 80% to pass
            {alreadyPassed && " · already passed (retake any time)"}
          </p>
        </div>
        {submitted && (
          <Badge
            variant={result.passed ? "default" : "destructive"}
            className="text-base px-3 py-1"
          >
            {result.score}%
          </Badge>
        )}
      </div>

      {submitted && !result.passed && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-destructive font-medium">
            <XCircle className="h-4 w-4" />
            <span>
              Review — {shuffled.length - result.correct} of {shuffled.length} answered
              incorrectly
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Correct answers are highlighted in green below. Jump to a question:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {shuffled.map((q, idx) =>
              isCorrect(q, answers[idx]) ? null : (
                <a
                  key={idx}
                  href={`#q-${idx}`}
                  className="inline-flex items-center justify-center h-7 min-w-7 px-2 rounded-md border border-destructive/40 bg-background text-xs font-medium text-destructive hover:bg-destructive/10"
                >
                  {idx + 1}
                </a>
              ),
            )}
          </div>
        </div>
      )}

      <ol className="space-y-6">
        {shuffled.map((q, idx) => {
          const type = q.type ?? "single";
          const answer = answers[idx];
          const correct = submitted && isCorrect(q, answer);
          return (
            <li key={idx} id={`q-${idx}`} className="space-y-2 scroll-mt-20">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">
                  {idx + 1}. {q.q}
                </p>
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground shrink-0 mt-1">
                  {type === "single" && "Pick one"}
                  {type === "multi" && "Pick all that apply"}
                  {type === "fill" && "Type answer"}
                </span>
              </div>

              {type === "single" && answer.kind === "single" && (
                <SingleChoice
                  q={q as { choices: string[]; answer: number }}
                  chosen={answer.choice}
                  submitted={submitted}
                  idx={idx}
                  onChange={(ci) =>
                    setAnswers((a) => ({
                      ...a,
                      [idx]: { kind: "single", choice: ci },
                    }))
                  }
                />
              )}

              {type === "multi" && answer.kind === "multi" && (
                <MultiChoice
                  q={q as { choices: string[]; answers: number[] }}
                  chosen={answer.choices}
                  submitted={submitted}
                  idx={idx}
                  onToggle={(ci) =>
                    setAnswers((a) => {
                      const cur = a[idx];
                      if (cur.kind !== "multi") return a;
                      const next = new Set(cur.choices);
                      if (next.has(ci)) next.delete(ci);
                      else next.add(ci);
                      return { ...a, [idx]: { kind: "multi", choices: next } };
                    })
                  }
                />
              )}

              {type === "fill" && answer.kind === "fill" && (
                <FillIn
                  q={q as { accept: string[]; caseSensitive?: boolean }}
                  value={answer.text}
                  submitted={submitted}
                  correct={correct}
                  onChange={(text) =>
                    setAnswers((a) => ({ ...a, [idx]: { kind: "fill", text } }))
                  }
                />
              )}

              {submitted && !correct && (
                <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground">Your answer: </span>
                    <span className="text-destructive font-medium">
                      {describeAnswer(q, answer) || "—"}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Correct answer: </span>
                    <span className="text-primary font-medium">
                      {describeCorrect(q)}
                    </span>
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="flex items-center justify-between pt-2 border-t">
        {!submitted ? (
          <Button onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Submit quiz"}
          </Button>
        ) : result.passed ? (
          <div className="flex items-center gap-3 w-full justify-between flex-wrap">
            <div className="flex items-center gap-2 text-primary">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">
                Passed — {result.correct} of {shuffled.length} correct
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={retake}>
              <RotateCw className="h-4 w-4 mr-1" /> Retake
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3 w-full justify-between flex-wrap">
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              <span className="font-medium">
                {result.score}% — need 80% to pass. Review and try again.
              </span>
            </div>
            <Button onClick={retake}>
              <RotateCw className="h-4 w-4 mr-1" /> Retake quiz
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

function SingleChoice({
  q,
  chosen,
  submitted,
  idx,
  onChange,
}: {
  q: { choices: string[]; answer: number };
  chosen: number | null;
  submitted: boolean;
  idx: number;
  onChange: (ci: number) => void;
}) {
  return (
    <RadioGroup
      value={chosen?.toString() ?? ""}
      onValueChange={(v) => !submitted && onChange(parseInt(v, 10))}
    >
      {q.choices.map((choice, ci) => {
        const correct = ci === q.answer;
        const isChosen = chosen === ci;
        return (
          <div
            key={ci}
            className={`flex items-start gap-3 rounded-md border p-3 text-sm ${
              submitted && correct
                ? "border-primary/50 bg-primary/5"
                : submitted && isChosen && !correct
                  ? "border-destructive/50 bg-destructive/5"
                  : "border-border"
            }`}
          >
            <RadioGroupItem
              value={ci.toString()}
              id={`q${idx}c${ci}`}
              disabled={submitted}
              className="mt-0.5"
            />
            <Label
              htmlFor={`q${idx}c${ci}`}
              className="flex-1 cursor-pointer leading-relaxed"
            >
              {choice}
            </Label>
            {submitted && correct && (
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            )}
            {submitted && isChosen && !correct && (
              <XCircle className="h-4 w-4 text-destructive shrink-0" />
            )}
          </div>
        );
      })}
    </RadioGroup>
  );
}

function MultiChoice({
  q,
  chosen,
  submitted,
  idx,
  onToggle,
}: {
  q: { choices: string[]; answers: number[] };
  chosen: Set<number>;
  submitted: boolean;
  idx: number;
  onToggle: (ci: number) => void;
}) {
  const correctSet = new Set(q.answers);
  return (
    <div className="space-y-2">
      {q.choices.map((choice, ci) => {
        const correct = correctSet.has(ci);
        const isChosen = chosen.has(ci);
        const wrongPick = submitted && isChosen && !correct;
        const missed = submitted && !isChosen && correct;
        return (
          <label
            key={ci}
            htmlFor={`q${idx}c${ci}`}
            className={`flex items-start gap-3 rounded-md border p-3 text-sm cursor-pointer ${
              submitted && correct
                ? "border-primary/50 bg-primary/5"
                : wrongPick
                  ? "border-destructive/50 bg-destructive/5"
                  : "border-border"
            } ${submitted ? "cursor-default" : ""}`}
          >
            <Checkbox
              id={`q${idx}c${ci}`}
              checked={isChosen}
              disabled={submitted}
              onCheckedChange={() => !submitted && onToggle(ci)}
              className="mt-0.5"
            />
            <span className="flex-1 leading-relaxed">{choice}</span>
            {submitted && correct && (
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            )}
            {wrongPick && (
              <XCircle className="h-4 w-4 text-destructive shrink-0" />
            )}
            {missed && (
              <span className="text-[11px] text-muted-foreground shrink-0">
                missed
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}

function FillIn({
  q,
  value,
  submitted,
  correct,
  onChange,
}: {
  q: { accept: string[]; caseSensitive?: boolean };
  value: string;
  submitted: boolean;
  correct: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={submitted}
        placeholder="Type your answer…"
        className={
          submitted
            ? correct
              ? "border-primary/50 bg-primary/5"
              : "border-destructive/50 bg-destructive/5"
            : ""
        }
      />
      {submitted && !correct && (
        <p className="text-xs text-muted-foreground">
          Accepted: {q.accept.join(" · ")}
        </p>
      )}
    </div>
  );
}

function describeAnswer(q: QuizQuestion, a: Answer): string {
  const type = q.type ?? "single";
  if (type === "single" && a.kind === "single") {
    const sq = q as { choices: string[]; answer: number };
    return a.choice === null ? "" : sq.choices[a.choice];
  }
  if (type === "multi" && a.kind === "multi") {
    const mq = q as { choices: string[]; answers: number[] };
    if (a.choices.size === 0) return "";
    return [...a.choices].sort((x, y) => x - y).map((i) => mq.choices[i]).join(", ");
  }
  if (type === "fill" && a.kind === "fill") {
    return a.text.trim();
  }
  return "";
}

function describeCorrect(q: QuizQuestion): string {
  const type = q.type ?? "single";
  if (type === "single") {
    const sq = q as { choices: string[]; answer: number };
    return sq.choices[sq.answer];
  }
  if (type === "multi") {
    const mq = q as { choices: string[]; answers: number[] };
    return mq.answers.map((i) => mq.choices[i]).join(", ");
  }
  const fq = q as { accept: string[] };
  return fq.accept.join(" · ");
}

function shuffle(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
