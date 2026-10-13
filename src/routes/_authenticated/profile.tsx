import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Your Profile — Cattery Manager" }] }),
  component: ProfilePage,
});

type Badge = {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  color: string;
  awarded_at: string;
};

function ProfilePage() {
  const { user, loading } = useAuth();

  const { data: badges } = useQuery({
    queryKey: ["badges", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("user_badges")
        .select("awarded_at, badges(id, title, description, icon, color)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        ...r.badges,
        awarded_at: r.awarded_at,
      })) as Badge[];
    },
  });

  const { data: moduleTitles } = useQuery({
    queryKey: ["module-titles"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("modules").select("*");
      const m = new Map<string, string>();
      (data ?? []).forEach((r: any) => { if (r.id) m.set(r.id, r.title); if (r.slug) m.set(r.slug, r.title); });
      return m;
    },
  });

  const { data: progressRows } = useQuery({
    queryKey: ["academy-progress-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academy_progress")
        .select("course_slug, module_slug, passed, score, completed_at")
        .eq("user_id", user!.id)
        .eq("passed", true);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (loading) return <div className="text-muted-foreground">Loading…</div>;
  if (!user) return null;

  const name =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0];

  const passedCount = progressRows?.length ?? 0;

  return (
    <div className="max-w-4xl space-y-8">
      {/* Profile header */}
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
          {name?.[0]?.toUpperCase() ?? "U"}
        </div>
        <div>
          <h1 className="font-display text-3xl font-semibold">{name}</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Modules passed
            </div>
            <div className="mt-2 font-display text-3xl font-semibold">{passedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Badges earned
            </div>
            <div className="mt-2 font-display text-3xl font-semibold">
              {badges?.length ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-primary" />
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                Academy
              </div>
              <Link
                to="/academy"
                className="mt-1 text-sm font-medium text-primary underline-offset-2 hover:underline"
              >
                Go to courses →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Badges */}
      <div>
        <h2 className="font-display text-xl font-semibold">Your badges</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Earned by completing every quiz in a course.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {!badges || badges.length === 0 ? (
            <div className="col-span-full rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No badges yet — pass every quiz in the{" "}
              <Link to="/academy" className="text-primary underline">
                Cat College
              </Link>{" "}
              to earn your first one.
            </div>
          ) : (
            badges.map((b) => (
              <Card key={b.id}>
                <CardContent className="pt-6 text-center">
                  <div
                    className="mx-auto flex h-20 w-20 items-center justify-center rounded-full text-4xl"
                    style={{
                      backgroundColor: b.color + "22",
                      color: b.color,
                    }}
                  >
                    {b.icon}
                  </div>
                  <div className="mt-3 font-display text-lg font-semibold">
                    {b.title}
                  </div>
                  {b.description && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {b.description}
                    </p>
                  )}
                  <div className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                    {new Date(b.awarded_at).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Module progress */}
      {passedCount > 0 && (
        <div>
          <h2 className="font-display text-xl font-semibold">Module progress</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            All modules you have passed.
          </p>
          <div className="mt-4 space-y-2">
            {progressRows?.map((row) => (
              <div
                key={`${row.course_slug}-${row.module_slug}`}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm"
              >
                <div>
                  <span className="font-medium capitalize">
                    {moduleTitles?.get(row.module_slug) ?? row.module_slug.replace(/-/g, " ")}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({row.course_slug})
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    Score: {row.score}%
                  </span>
                  {row.completed_at && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(row.completed_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
