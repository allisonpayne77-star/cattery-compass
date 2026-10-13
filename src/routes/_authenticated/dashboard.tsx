import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Award, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
const academyIcon = { url: "/catcollege-logo.png" };
const companionIcon = { url: "/catterymanager-logo.png" };
import { useAcademyCourses } from "@/lib/academy-data";
import { useAcademyProgress, courseStats } from "@/lib/academy-progress";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Cattery Manager" }] }),
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4">
      <div className="flex flex-col items-center justify-center text-center space-y-5 pt-2">
        <div className="space-y-3">
          <img
            src={companionIcon.url}
            alt="Cattery Manager logo"
            className="h-20 w-20 sm:h-32 sm:w-32 object-contain rounded-2xl mx-auto brand-logo-image"
          />
          <span className="brand-divider mx-auto" />
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Welcome</p>
          <h1 className="font-display text-2xl sm:text-4xl font-semibold">Cattery Manager</h1>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm sm:text-base">
            Everything you need, beautifully organized.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full max-w-md">
          <PortalCard
            to="/academy"
            icon={<img src={academyIcon.url} alt="Cat College" className="h-16 sm:h-24 w-auto max-w-full object-contain rounded-xl brand-logo-image" />}
            className="brand-logo-frame"
          />
          <PortalCard
            to="/cattery"
            icon={<img src={companionIcon.url} alt="Cattery Manager" className="h-16 sm:h-24 w-auto max-w-full object-contain rounded-xl brand-logo-image" />}
            className="brand-logo-frame"
          />
        </div>
      </div>

      <LearningProgress />
    </div>
  );
}

function LearningProgress() {
  const courses = useAcademyCourses();
  const progress = useAcademyProgress();
  const rows = progress.data;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-semibold">Your learning</h2>
        </div>
        <Link to="/academy" className="text-sm text-primary hover:underline">
          Go to Academy →
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {courses.isLoading ? (
          <Card className="p-4 text-sm text-muted-foreground">Loading Academy…</Card>
        ) : courses.data?.length ? courses.data.map((c) => {
          const s = courseStats(rows, c);
          const complete = s.percent === 100;
          return (
            <Link
              key={c.slug}
              to="/academy/$courseSlug"
              params={{ courseSlug: c.slug }}
              className="group"
            >
              <Card className="p-4 hover:border-primary/50 transition-all">
                <div className="flex items-center justify-between mb-2 gap-2">
                  <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                    {c.title}
                  </h3>
                  {complete && (
                    <Badge variant="secondary" className="gap-1 shrink-0">
                      <Award className="h-3 w-3" /> Complete
                    </Badge>
                  )}
                </div>
                <Progress value={s.percent} className="h-1.5 mb-1.5" />
                <p className="text-xs text-muted-foreground">
                  {s.completed} / {s.total} modules · {s.percent}%
                </p>
              </Card>
            </Link>
          );
        }) : (
          <Card className="p-4 text-sm text-muted-foreground">No uploaded Academy courses yet.</Card>
        )}
      </div>
    </section>
  );
}

function PortalCard({
  to,
  icon,
  title,
  description,
  className,
}: {
  to: string;
  icon: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <Link to={to} className="group block">
      <Card className={cn("p-4 sm:p-6 h-full transition-all hover:border-primary/50 hover:bg-accent/30 hover:-translate-y-0.5", className)}>
        <div className="flex flex-col items-center justify-center text-center gap-3">
          <div className="flex items-center justify-center">{icon}</div>
          {(title || description) && (
            <div>
              {title && <h2 className="font-display text-xl font-semibold group-hover:text-primary transition-colors">{title}</h2>}
              {description && <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{description}</p>}
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
