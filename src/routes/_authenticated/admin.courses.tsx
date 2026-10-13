import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SignedImage } from "@/components/SignedMedia";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/courses")({
  head: () => ({ meta: [{ title: "Course Admin — Cattery Manager" }] }),
  component: AdminCoursesPage,
});

type ContentBlock =
  | { type: "text"; value: string }
  | { type: "image"; path: string; caption?: string };

type Lesson = {
  id: string;
  module_id: string;
  position: number;
  title: string;
  kind: "video" | "text" | "quiz" | "survey";
  video_url: string | null;
  body: string | null;
  content_blocks: ContentBlock[];
  question_count: number;
};

type ModuleRow = { id: string; position: number; title: string; course_id: string };
type Question = {
  id: string;
  position: number;
  prompt: string;
  choices: string[];
  correct_index: number;
  explanation: string | null;
};

function AdminCoursesPage() {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => {
        setIsAdmin(!!data);
        setChecking(false);
      });
  }, [user]);

  if (loading || checking) {
    return <div className="text-muted-foreground">Checking access…</div>;
  }

  if (!isAdmin) {
    return (
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5" /> Admin only
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            This page is restricted to administrators.
          </p>
          {user && (
            <div className="rounded bg-secondary p-3 text-xs font-mono break-all">
              Your user id: {user.id}
            </div>
          )}
          <Button variant="outline" asChild>
            <Link to="/">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <AdminCoursesInner />;
}

function AdminCoursesInner() {
  const { data: modules } = useQuery({
    queryKey: ["admin-modules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select("id, position, title, course_id")
        .order("position");
      if (error) throw error;
      return data as ModuleRow[];
    },
  });

  const { data: lessons } = useQuery({
    queryKey: ["admin-lessons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, module_id, position, title, kind, video_url, body, content_blocks, question_count")
        .order("position");
      if (error) throw error;
      return (data as any[]).map((l) => ({
        ...l,
        content_blocks: Array.isArray(l.content_blocks) ? l.content_blocks : [],
      })) as Lesson[];
    },
  });

  const [selected, setSelected] = useState<string | null>(null);
  const lesson = lessons?.find((l) => l.id === selected) ?? null;

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Admin · Course Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload videos &amp; images, edit lesson content, and manage quiz questions.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/admin/analytics">📊 Analytics</Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-xl border border-border bg-card">
          <div className="border-b border-border p-4 text-xs uppercase tracking-widest text-muted-foreground">
            Lessons
          </div>
          <ul className="max-h-[70vh] overflow-y-auto">
            {modules?.map((m) => (
              <li key={m.id} className="border-b border-border last:border-0">
                <div className="bg-secondary/40 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-primary">
                  M{m.position} · {m.title}
                </div>
                {lessons
                  ?.filter((l) => l.module_id === m.id)
                  .map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setSelected(l.id)}
                      className={`block w-full px-4 py-2 text-left text-sm ${
                        selected === l.id
                          ? "border-l-2 border-primary bg-primary/10"
                          : "hover:bg-secondary"
                      }`}
                    >
                      <div className="font-medium">{l.title}</div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        {l.kind}
                      </div>
                    </button>
                  ))}
              </li>
            ))}
          </ul>
        </aside>

        <section className="rounded-xl border border-border bg-card p-6">
          {!lesson ? (
            <p className="text-muted-foreground">Select a lesson to edit.</p>
          ) : (
            <LessonEditor lesson={lesson} />
          )}
        </section>
      </div>
    </div>
  );
}

async function uploadFile(file: File, prefix: string): Promise<string | null> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from("course-media")
    .upload(path, file, { upsert: false });
  if (error) {
    alert(error.message);
    return null;
  }
  return path;
}

function LessonEditor({ lesson }: { lesson: Lesson }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(lesson.title);
  const [videoUrl, setVideoUrl] = useState(lesson.video_url ?? "");
  const [blocks, setBlocks] = useState<ContentBlock[]>(lesson.content_blocks);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setTitle(lesson.title);
    setVideoUrl(lesson.video_url ?? "");
    setBlocks(lesson.content_blocks);
    setSaved(false);
  }, [lesson.id]);

  async function save() {
    const { error } = await supabase
      .from("lessons")
      .update({ title, video_url: videoUrl || null, content_blocks: blocks as any })
      .eq("id", lesson.id);
    if (error) {
      alert(error.message);
      return;
    }
    setSaved(true);
    void qc.invalidateQueries({ queryKey: ["admin-lessons"] });
  }

  async function onVideoFile(f: File) {
    setUploading(true);
    const p = await uploadFile(f, `videos/${lesson.id}`);
    if (p) setVideoUrl(p);
    setUploading(false);
  }

  async function onImageFile(f: File) {
    setUploading(true);
    const p = await uploadFile(f, `images/${lesson.id}`);
    if (p) setBlocks([...blocks, { type: "image", path: p, caption: "" }]);
    setUploading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="text-xs uppercase tracking-widest text-muted-foreground">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="text-xs uppercase tracking-widest text-muted-foreground">Top video</label>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept="video/*"
            disabled={uploading}
            onChange={(e) => e.target.files?.[0] && onVideoFile(e.target.files[0])}
            className="text-sm"
          />
          {videoUrl && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="max-w-[300px] truncate rounded bg-secondary px-2 py-1 font-mono">
                {videoUrl}
              </span>
              <button onClick={() => setVideoUrl("")} className="text-destructive hover:underline">
                remove
              </button>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs uppercase tracking-widest text-muted-foreground">
            Content blocks (below the video)
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setBlocks([...blocks, { type: "text", value: "" }])}
              className="rounded border border-border px-2 py-1 text-xs hover:bg-secondary"
            >
              + Text
            </button>
            <label className="cursor-pointer rounded border border-border px-2 py-1 text-xs hover:bg-secondary">
              + Image
              <input
                type="file"
                accept="image/*"
                hidden
                disabled={uploading}
                onChange={(e) => e.target.files?.[0] && onImageFile(e.target.files[0])}
              />
            </label>
          </div>
        </div>
        <div className="mt-3 space-y-3">
          {blocks.map((b, i) => (
            <div key={i} className="rounded-md border border-border bg-secondary/30 p-3">
              <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-widest text-muted-foreground">
                <span>
                  {b.type} · block {i + 1}
                </span>
                <div className="flex gap-2">
                  {i > 0 && (
                    <button
                      onClick={() => {
                        const n = [...blocks];
                        [n[i - 1], n[i]] = [n[i], n[i - 1]];
                        setBlocks(n);
                      }}
                    >
                      ↑
                    </button>
                  )}
                  {i < blocks.length - 1 && (
                    <button
                      onClick={() => {
                        const n = [...blocks];
                        [n[i], n[i + 1]] = [n[i + 1], n[i]];
                        setBlocks(n);
                      }}
                    >
                      ↓
                    </button>
                  )}
                  <button
                    onClick={() => setBlocks(blocks.filter((_, j) => j !== i))}
                    className="text-destructive"
                  >
                    remove
                  </button>
                </div>
              </div>
              {b.type === "text" ? (
                <textarea
                  value={b.value}
                  rows={3}
                  onChange={(e) => {
                    const n = [...blocks];
                    n[i] = { ...b, value: e.target.value };
                    setBlocks(n);
                  }}
                  className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                />
              ) : (
                <div className="space-y-2">
                  <SignedImage path={b.path} className="max-h-48 rounded" />
                  <input
                    placeholder="Caption (optional)"
                    value={b.caption ?? ""}
                    onChange={(e) => {
                      const n = [...blocks];
                      n[i] = { ...b, caption: e.target.value };
                      setBlocks(n);
                    }}
                    className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-border pt-4">
        <button
          onClick={save}
          disabled={uploading}
          className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          Save lesson
        </button>
        {saved && <span className="text-xs text-primary">✓ Saved</span>}
        {uploading && <span className="text-xs text-muted-foreground">Uploading…</span>}
      </div>

      {lesson.kind === "quiz" && <QuizEditor lessonId={lesson.id} />}
    </div>
  );
}

function QuizEditor({ lessonId }: { lessonId: string }) {
  const qc = useQueryClient();
  const { data: questions } = useQuery({
    queryKey: ["admin-quiz", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_questions")
        .select("id, position, prompt, choices, correct_index, explanation")
        .eq("lesson_id", lessonId)
        .order("position");
      if (error) throw error;
      return (data ?? []).map((q: any) => ({
        ...q,
        choices: Array.isArray(q.choices) ? q.choices : [],
      })) as Question[];
    },
  });

  async function add() {
    const pos = (questions?.length ?? 0) + 1;
    const { error } = await supabase.from("quiz_questions").insert({
      lesson_id: lessonId,
      position: pos,
      prompt: "New question",
      choices: ["Option A", "Option B", "Option C", "Option D"],
      correct_index: 0,
    });
    if (error) alert(error.message);
    void qc.invalidateQueries({ queryKey: ["admin-quiz", lessonId] });
  }

  async function update(q: Question, patch: Partial<Question>) {
    const { error } = await supabase
      .from("quiz_questions")
      .update(patch as any)
      .eq("id", q.id);
    if (error) alert(error.message);
    void qc.invalidateQueries({ queryKey: ["admin-quiz", lessonId] });
  }

  async function remove(id: string) {
    if (!confirm("Delete this question?")) return;
    await supabase.from("quiz_questions").delete().eq("id", id);
    void qc.invalidateQueries({ queryKey: ["admin-quiz", lessonId] });
  }

  return (
    <div className="mt-8 border-t border-border pt-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl font-semibold">Quiz questions</h3>
        <button
          onClick={add}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
        >
          + Add question
        </button>
      </div>
      <div className="mt-4 space-y-4">
        {(questions ?? []).map((q, idx) => (
          <div key={q.id} className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
              <span>Q{idx + 1}</span>
              <button onClick={() => remove(q.id)} className="text-destructive hover:underline">
                delete
              </button>
            </div>
            <input
              defaultValue={q.prompt}
              onBlur={(e) => e.target.value !== q.prompt && update(q, { prompt: e.target.value })}
              className="mt-2 w-full rounded border border-border bg-background px-3 py-2 text-sm font-medium"
            />
            <div className="mt-3 space-y-2">
              {q.choices.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${q.id}`}
                    checked={q.correct_index === i}
                    onChange={() => update(q, { correct_index: i })}
                  />
                  <input
                    defaultValue={c}
                    onBlur={(e) => {
                      const next = [...q.choices];
                      next[i] = e.target.value;
                      if (next[i] !== c) update(q, { choices: next as any });
                    }}
                    className="flex-1 rounded border border-border bg-background px-2 py-1 text-sm"
                  />
                  {q.choices.length > 2 && (
                    <button
                      onClick={() =>
                        update(q, {
                          choices: q.choices.filter((_, j) => j !== i) as any,
                        })
                      }
                      className="text-xs text-destructive"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() =>
                  update(q, { choices: [...q.choices, "New option"] as any })
                }
                className="text-xs text-primary hover:underline"
              >
                + Add option
              </button>
            </div>
            <textarea
              placeholder="Explanation (shown after answering)"
              defaultValue={q.explanation ?? ""}
              onBlur={(e) =>
                e.target.value !== (q.explanation ?? "") &&
                update(q, { explanation: e.target.value })
              }
              rows={2}
              className="mt-3 w-full rounded border border-border bg-background px-3 py-2 text-xs"
            />
          </div>
        ))}
        {questions?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No questions yet — click "Add question".
          </p>
        )}
      </div>
    </div>
  );
}
