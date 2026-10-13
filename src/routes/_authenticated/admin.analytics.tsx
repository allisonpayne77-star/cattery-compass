import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Cattery Manager" }] }),
  component: AnalyticsPage,
});

type Question = {
  id: string;
  lesson_id: string;
  position: number;
  prompt: string;
  question_type: "text" | "choice";
  choices: string[];
};

type Response = {
  id: string;
  question_id: string;
  user_id: string;
  answer_text: string | null;
  answer_choice_index: number | null;
  created_at: string;
};

function AnalyticsPage() {
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
          <Button variant="outline" asChild>
            <Link to="/">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <AnalyticsInner />;
}

function AnalyticsInner() {
  const { data: questions } = useQuery({
    queryKey: ["analytics-questions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("survey_questions")
        .select("id, lesson_id, position, prompt, question_type, choices")
        .order("position");
      if (error) throw error;
      return (data ?? []).map((q: any) => ({
        ...q,
        choices: Array.isArray(q.choices) ? q.choices : [],
      })) as Question[];
    },
  });

  const { data: responses } = useQuery({
    queryKey: ["analytics-responses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("survey_responses")
        .select("id, question_id, user_id, answer_text, answer_choice_index, created_at");
      if (error) throw error;
      return (data ?? []) as Response[];
    },
  });

  const { data: userCount } = useQuery({
    queryKey: ["analytics-user-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true });
      if (error) return null;
      return count;
    },
  });

  const stats = useMemo(() => {
    if (!responses) return null;
    const uniqueRespondents = new Set(responses.map((r) => r.user_id)).size;
    // Build 30-day trend
    const now = new Date();
    const trend: [string, number][] = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (29 - i));
      const key = d.toISOString().slice(0, 10);
      return [key, 0];
    });
    for (const r of responses) {
      const day = r.created_at.slice(0, 10);
      const entry = trend.find(([k]) => k === day);
      if (entry) entry[1]++;
    }
    return { uniqueRespondents, trend };
  }, [responses]);

  const byQuestion = useMemo(() => {
    if (!questions || !responses) return [];
    return questions.map((q) => {
      const rs = responses.filter((r) => r.question_id === q.id);
      if (q.question_type === "choice") {
        const counts = q.choices.map(
          (_, i) => rs.filter((r) => r.answer_choice_index === i).length,
        );
        return { q, rs, counts };
      }
      const texts = rs.map((r) => r.answer_text).filter(Boolean) as string[];
      return { q, rs, texts };
    });
  }, [questions, responses]);

  const maxTrend = stats ? Math.max(1, ...stats.trend.map(([, n]) => n)) : 1;

  return (
    <div className="max-w-6xl space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Admin · Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Survey results and app-wide activity.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/admin/courses">← Course Admin</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total users" value={userCount ?? "—"} />
        <StatCard label="Survey respondents" value={stats?.uniqueRespondents ?? "—"} />
        <StatCard label="Total answers" value={responses?.length ?? "—"} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Responses over time</CardTitle>
          <p className="text-xs text-muted-foreground">Last 30 days</p>
        </CardHeader>
        <CardContent>
          <div className="flex h-40 items-end gap-1">
            {stats?.trend.map(([day, n]) => (
              <div key={day} className="group flex flex-1 flex-col items-center">
                <div
                  className="w-full rounded-t bg-primary/70 transition-colors hover:bg-primary"
                  style={{
                    height: `${(n / maxTrend) * 100}%`,
                    minHeight: n > 0 ? 2 : 0,
                  }}
                  title={`${day}: ${n}`}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
            <span>{stats?.trend[0]?.[0]}</span>
            <span>{stats?.trend[stats.trend.length - 1]?.[0]}</span>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-6">
        <h2 className="font-display text-xl font-semibold">Results by question</h2>
        {byQuestion.length === 0 && (
          <p className="text-sm text-muted-foreground">No questions yet.</p>
        )}
        {byQuestion.map(({ q, rs, counts, texts }: any) => (
          <Card key={q.id}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">
                  Q{q.position}. {q.prompt}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {rs.length} response{rs.length === 1 ? "" : "s"}
                </span>
              </div>
              {q.question_type === "choice" ? (
                <div className="mt-4 space-y-2">
                  {q.choices.map((choice: string, i: number) => {
                    const n = counts[i];
                    const pct = rs.length
                      ? Math.round((n / rs.length) * 100)
                      : 0;
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between text-sm">
                          <span>{choice}</span>
                          <span className="text-muted-foreground">
                            {n} · {pct}%
                          </span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded bg-secondary">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {texts?.length === 0 && (
                    <p className="text-sm text-muted-foreground">No responses yet.</p>
                  )}
                  {texts?.map((t: string, i: number) => (
                    <div
                      key={i}
                      className="whitespace-pre-wrap rounded border border-border bg-secondary/40 p-3 text-sm"
                    >
                      {t}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className="mt-2 font-display text-3xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
