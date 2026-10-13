import { createFileRoute, Link } from "@tanstack/react-router";
const academyLogo = { url: "/catcollege-logo.png" };
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Lock, PlayCircle } from "lucide-react";
import { useAcademyCourses } from "@/lib/academy-data";
import { courseStats, isModuleUnlocked, modulePassed, useAcademyProgress } from "@/lib/academy-progress";

export const Route = createFileRoute("/_authenticated/academy/")({
  head: () => ({ meta: [{ title: "Cat College — Courses" }] }),
  component: Academy,
});

function Academy() {
  const courses = useAcademyCourses();
  const progress = useAcademyProgress();
  const firstCourse = courses.data?.[0];

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-10">
        <section className="grid gap-10 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <img
              src={academyLogo.url}
              alt="Cat College"
              className="mb-6 h-40 w-auto max-w-full rounded-2xl object-contain brand-logo-image"
            />
            <span className="brand-divider mb-6" />
            <h1 className="font-display text-5xl leading-[1.05] text-foreground md:text-6xl">
              Cat <span className="text-primary">College</span>
            </h1>
            <p className="mt-5 text-base font-bold tracking-[0.05em] text-foreground">
              Log it. Learn it. Love it.
            </p>
            <p className="mt-1 text-sm font-light tracking-[0.05em] text-muted-foreground">
              All in one place.
            </p>
            <p className="mt-6 max-w-xl text-base text-muted-foreground">
              Learn, plan and run your cattery in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {firstCourse ? (
                <Link
                  to="/academy/$courseSlug"
                  params={{ courseSlug: firstCourse.slug }}
                  className="rounded-lg bg-primary px-6 py-3 text-sm font-medium uppercase tracking-wide text-primary-foreground transition hover:brightness-110"
                >
                  Get Started
                </Link>
              ) : null}
              <a
                href="#course"
                className="rounded-lg border-2 border-primary bg-background px-6 py-3 text-sm font-medium uppercase tracking-wide text-primary transition hover:bg-primary/5"
              >
                Learn More
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="brand-ambient-glow absolute -inset-6 rounded-3xl" />
            <div className="brand-logo-frame relative rounded-2xl p-6">
              <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
                <span>Featured course</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">Free</span>
              </div>
              <h3 className="font-serif text-2xl text-foreground">
                {firstCourse?.title ?? "The Cat College"}
              </h3>
              {firstCourse?.subtitle ? (
                <p className="mt-1 text-sm text-muted-foreground">{firstCourse.subtitle}</p>
              ) : null}
              {firstCourse ? (
                <div className="mt-5 space-y-2 text-sm">
                  {firstCourse.modules.map((mod, i) => (
                    <div key={mod.id} className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-primary">
                        {i + 1}
                      </span>
                      <span className="text-foreground/90">{mod.title}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-5 text-sm text-muted-foreground">
                  No Academy courses have been uploaded yet.
                </p>
              )}
            </div>
          </div>
        </section>

        <section id="course" className="mt-24 rounded-2xl border-t-4 border-primary border-x border-b border-x-border border-b-border bg-card px-8 py-12 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-primary">Ready when you are</p>
              <h2 className="mt-3 font-serif text-3xl md:text-4xl text-foreground">Continue your training</h2>
              <p className="mt-2 max-w-xl text-muted-foreground">
                Jump into any unlocked module — progress and quiz results save automatically.
              </p>
            </div>
          </div>

          {courses.isLoading ? (
            <Card className="mt-8 p-5 text-sm text-muted-foreground">Loading courses…</Card>
          ) : courses.data?.length ? (
            <div className="mt-8 space-y-10">
              {courses.data.map((course) => {
                const stats = courseStats(progress.data, course);
                return (
                  <div key={course.id} className="space-y-4">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <h3 className="font-display text-xl font-semibold text-foreground">{course.title}</h3>
                        {course.subtitle ? (
                          <p className="text-sm text-muted-foreground">{course.subtitle}</p>
                        ) : null}
                      </div>
                      <div className="min-w-[220px]">
                        <Progress value={stats.percent} className="h-2" />
                        <p className="mt-1 text-xs text-muted-foreground">
                          {stats.completed} / {stats.total} modules · {stats.percent}%
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {course.modules.map((mod, idx) => {
                        const unlocked = isModuleUnlocked(progress.data, course, idx);
                        const passed = modulePassed(progress.data, course.slug, mod.slug);
                        const card = (
                          <Card
                            className={`h-full p-5 flex flex-col gap-3 transition-all ${
                              unlocked
                                ? "hover:-translate-y-0.5 hover:border-primary/50 cursor-pointer"
                                : "opacity-60"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`h-9 w-9 rounded-lg grid place-items-center shrink-0 ${
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
                              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                                Module {idx + 1}
                              </span>
                              {passed ? (
                                <Badge variant="secondary" className="ml-auto text-xs">Passed</Badge>
                              ) : !unlocked ? (
                                <Badge variant="outline" className="ml-auto text-xs">Locked</Badge>
                              ) : null}
                            </div>
                            <h4 className="font-display text-base font-semibold leading-snug text-foreground">
                              {mod.title}
                            </h4>
                            {mod.blurb ? (
                              <p className="text-sm text-muted-foreground line-clamp-3">{mod.blurb}</p>
                            ) : null}
                            <p className="mt-auto text-xs text-muted-foreground">
                              {mod.lessons.length} {mod.lessons.length === 1 ? "lesson" : "lessons"}
                            </p>
                          </Card>
                        );
                        return unlocked ? (
                          <Link
                            key={mod.id}
                            to="/academy/$courseSlug/$moduleSlug"
                            params={{ courseSlug: course.slug, moduleSlug: mod.slug }}
                          >
                            {card}
                          </Link>
                        ) : (
                          <div key={mod.id}>{card}</div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Card className="mt-8 p-5 text-sm text-muted-foreground">
              No uploaded courses are available. Use the Admin import page to load your Course Creator SQL batch.
            </Card>
          )}

          {firstCourse ? (
            <div className="mt-8">
              <Button asChild variant="outline">
                <Link to="/academy/$courseSlug" params={{ courseSlug: firstCourse.slug }}>
                  Open the full course outline →
                </Link>
              </Button>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
