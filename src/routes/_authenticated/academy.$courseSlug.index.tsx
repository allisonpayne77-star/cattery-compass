import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  CheckCircle2,
  Lock,
  PlayCircle,
  Award,
  GraduationCap,
} from "lucide-react";
import { useAcademyCourse } from "@/lib/academy-data";
import { CoursePaywall, useCoursePurchases, useIsAdmin } from "@/components/CoursePaywall";
import {
  useAcademyProgress,
  courseStats,
  isModuleUnlocked,
  modulePassed,
} from "@/lib/academy-progress";

export const Route = createFileRoute("/_authenticated/academy/$courseSlug/")({
  head: () => ({ meta: [{ title: "Course — Cat College" }] }),
  notFoundComponent: () => (
    <div className="max-w-xl mx-auto text-center py-16">
      <p className="text-muted-foreground mb-4">Course not found.</p>
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
  component: CoursePage,
});

function CoursePage() {
  const { courseSlug } = Route.useParams();
  const courseQuery = useAcademyCourse(courseSlug);
  const course = courseQuery.data;
  const progress = useAcademyProgress();
  const rows = progress.data;
  const purchases = useCoursePurchases();
  const isAdmin = useIsAdmin();

  if (courseQuery.isLoading) {
    return <div className="max-w-xl mx-auto py-16 text-center text-muted-foreground">Loading course…</div>;
  }

  if (!course) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 space-y-4">
        <p className="text-muted-foreground">This course is not in the uploaded Academy data.</p>
        <Button asChild>
          <Link to="/academy">Back to Academy</Link>
        </Button>
      </div>
    );
  }

  const stats = courseStats(rows, course);
  // Admins can read every course in the database, so they are never paywalled.
  const owned =
    isAdmin.data === true ||
    (purchases.data ?? []).some((x) => x.is_bundle || x.course_id === course.id);
  const locked =
    course.priceCents > 0 && !purchases.isLoading && !isAdmin.isLoading && !owned;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/academy">
          <ArrowLeft className="h-4 w-4 mr-1" /> All courses
        </Link>
      </Button>

      <header className="space-y-3">
        <img src="/catcollege-logo.png" alt="Cat College" className="h-24 w-24 object-contain mb-2" />
        <div className="flex items-center gap-2 text-muted-foreground text-sm uppercase tracking-widest">
          <GraduationCap className="h-4 w-4" />
          <span>Course</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold">{course.title}</h1>
        <p className="text-muted-foreground max-w-2xl">{course.description}</p>
        <div className="flex items-center gap-4 pt-2">
          <div className="flex-1 max-w-sm">
            <Progress value={stats.percent} className="h-2" />
          </div>
          <span className="text-sm text-muted-foreground">
            {stats.completed} / {stats.total} modules · {stats.percent}%
          </span>
          {stats.percent === 100 && (
            <Button asChild size="sm" variant="secondary">
              <Link
                to="/academy/$courseSlug/certificate"
                params={{ courseSlug: course.slug }}
              >
                <Award className="h-4 w-4 mr-1" /> View certificate
              </Link>
            </Button>
          )}
        </div>
      </header>

      {locked ? <CoursePaywall course={course} /> : null}

      <ol className={locked ? "space-y-3 opacity-50 pointer-events-none" : "space-y-3"}>
        {course.modules.map((mod, idx) => {
          const unlocked = isModuleUnlocked(rows, course, idx);
          const passed = modulePassed(rows, course.slug, mod.slug);
          const prev = idx > 0 ? course.modules[idx - 1] : null;
          const content = (
            <Card
              className={`p-5 flex items-start gap-4 transition-all ${
                unlocked
                  ? "hover:border-primary/50 hover:-translate-y-0.5 cursor-pointer"
                  : "opacity-60"
              }`}
            >
              <div
                className={`h-10 w-10 rounded-lg grid place-items-center shrink-0 ${
                  passed
                    ? "bg-primary/10 text-primary"
                    : unlocked
                      ? "bg-muted text-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {passed ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : unlocked ? (
                  <PlayCircle className="h-5 w-5" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs text-muted-foreground">
                    Module {idx + 1}
                  </span>
                  {passed && (
                    <Badge variant="secondary" className="text-xs">Passed</Badge>
                  )}
                  {!unlocked && (
                    <Badge variant="outline" className="text-xs">Locked</Badge>
                  )}
                </div>
                <h3 className="font-display font-semibold leading-tight">
                  {mod.title}
                </h3>
                {mod.blurb ? <p className="text-sm text-muted-foreground mt-1">{mod.blurb}</p> : null}
                {!unlocked && prev && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1.5">
                    <Lock className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>
                      Pass the{" "}
                      <span className="font-medium text-foreground">
                        Module {idx} quiz — {prev.title}
                      </span>{" "}
                      (80% or higher) to unlock this module.
                    </span>
                  </p>
                )}
              </div>
            </Card>
          );
          return (
            <li key={mod.slug}>
              {unlocked ? (
                <Link
                  to="/academy/$courseSlug/$moduleSlug"
                  params={{ courseSlug: course.slug, moduleSlug: mod.slug }}
                >
                  {content}
                </Link>
              ) : prev ? (
                <Link
                  to="/academy/$courseSlug/$moduleSlug"
                  params={{ courseSlug: course.slug, moduleSlug: prev.slug }}
                  title={`Go to ${prev.title} quiz`}
                >
                  {content}
                </Link>
              ) : (
                <div>{content}</div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
